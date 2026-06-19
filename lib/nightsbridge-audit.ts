import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

/** Field inventory for BookingCalendarRQ — used in audit UI. */
export const NB_FIELD_INVENTORY = {
  api: {
    endpoint: "POST https://bridgeit.nightsbridge.com/bridgeitapi",
    messages: {
      BootstrapRQ: {
        implemented: true,
        stored: ["loginkey (session only, not persisted)"],
        ignored: ["statusCodes", "vatRate", "runReports", "feature flags"],
      },
      BookingCalendarRQ: {
        implemented: true,
        requestFields: ["startdate", "enddate", "countryLocationId", "credentials.loginkey"],
        responseKeys: ["bb", "rooms", "roomtypes", "roomtypemode", "bookings", "closeouts", "events"],
      },
      bookingnotificationsrq: { implemented: false, purpose: "Lightweight change-feed polling" },
      DoubleBookingsRQ: { implemented: false, purpose: "Overlapping booking detection" },
      availRQ: { implemented: false, purpose: "Public availability search (separate webservice)" },
      FromPriceRQ: { implemented: false, purpose: "Lowest nightly rates import" },
    },
    images: {
      availableInBridgeitapi: false,
      note: "Room/property photos are managed in NightsBridge Webview (Web Info), not returned by BookingCalendarRQ.",
      fallback: "NightsBridge webview Web Info scrape → media_asset.source_url",
    },
  },
  tables: {
    property: {
      columns: ["bbid", "bbname", "raw", "roomtypemode", "booking_url", "created_at", "updated_at"],
      source: "data.bb",
    },
    room_type: {
      columns: [
        "bbrtid",
        "rtname",
        "rtdesc",
        "max_adults",
        "max_occupancy",
        "room_qty",
        "private_bathroom",
        "room_size_sqm",
        "rate_scheme",
        "ota_room_type_code",
        "type_order_by",
        "raw",
        "updated_at",
      ],
      source: "data.roomtypes[bbrtid]",
    },
    room: {
      columns: [
        "bbroomid",
        "bbrtid",
        "bbid",
        "room_name",
        "property_name",
        "address",
        "configuration",
        "bathroom_type",
        "order_by",
        "is_active",
        "raw",
        "updated_at",
      ],
      source: "data.rooms[] + room_catalog enrichment for property/address/config/bath",
    },
    availability_cache: {
      columns: ["bbroomid", "check_date", "is_available", "status", "booking_ref", "rate", "updated_at"],
      source: "Derived from bookings in sync window (closeouts not yet applied)",
    },
    booking: { columns: "bookingid, booking_ref, status, dates, source, made_by*, notes, raw, is_cancelled", source: "data.bookings[]" },
    booking_room_stay: {
      columns: "bookingid, bbroomid, guestid, adults, children_*, avg_rate, checked_in/out",
      source: "data.bookings[].rooms[]",
    },
    guest: { columns: "guestid, name, email, phone, company", source: "data.bookings[].rooms[] (PII)" },
    closeout: { columns: "bbroomid, from_date, to_date, reason", source: "data.closeouts[]" },
    calendar_event: { columns: "event_date, title, description, raw", source: "data.events[]" },
    media_asset: { columns: "entity_type, entity_key, source_url, local_path, metadata", source: "NB scrape or site_catalog seed" },
    nb_api_snapshot: { columns: "payload_keys, counts, bootstrap_raw, payload_sample", source: "Per sync run audit trail" },
    sync_run: { columns: "started_at, finished_at, window, counts, ok, error", source: "Sync orchestration" },
  },
} as const

async function safeCount(supabase: SupabaseClient, table: string) {
  const res = await supabase.from(table).select("id", { count: "exact", head: true })
  if (res.error?.message.includes("does not exist") || res.error?.message.includes(table)) {
    return { count: 0, data: null, error: null }
  }
  return res
}

async function safeSelectAll(supabase: SupabaseClient, table: string) {
  const res = await supabase.from(table).select("*")
  if (res.error?.message.includes("does not exist") || res.error?.message.includes(table)) {
    return { data: [] as Record<string, unknown>[], error: null }
  }
  return res
}

export type NbAuditReport = Awaited<ReturnType<typeof buildNightsBridgeAudit>>

export async function buildNightsBridgeAudit() {
  const supabase = createSupabaseAdminClient()

  const [
    propertyRes,
    roomTypesRes,
    roomsRes,
    availabilityRes,
    bookingsRes,
    closeoutsRes,
    eventsRes,
    mediaRes,
    snapshotsRes,
    syncRunsRes,
  ] = await Promise.all([
    supabase.from("property").select("*"),
    supabase.from("room_type").select("*").order("bbrtid"),
    supabase.from("room").select("*, room_type(*)").eq("is_active", true).order("property_name").order("order_by"),
    supabase.from("availability_cache").select("bbroomid", { count: "exact", head: true }),
    supabase.from("booking").select("bookingid", { count: "exact", head: true }),
    safeCount(supabase, "closeout"),
    safeCount(supabase, "calendar_event"),
    safeSelectAll(supabase, "media_asset"),
    supabase.from("nb_api_snapshot").select("*").order("created_at", { ascending: false }).limit(3).then((res) =>
      res.error?.message.includes("does not exist") || res.error?.message.includes("nb_api_snapshot")
        ? { data: [], error: null }
        : res,
    ),
    supabase.from("sync_run").select("*").order("started_at", { ascending: false }).limit(10),
  ])

  const rooms = roomsRes.data ?? []
  const roomTypes = roomTypesRes.data ?? []
  const media = (mediaRes.data ?? []) as Array<{
    bbroomid?: number | null
    [key: string]: unknown
  }>

  const roomsWithType = rooms.filter((r) => r.bbrtid && r.room_type)
  const roomsMissingType = rooms.filter((r) => !r.bbrtid || !r.room_type)
  const roomsWithDescription = rooms.filter((r) => {
    const rt = r.room_type as { rtdesc?: string | null } | null
    return Boolean(rt?.rtdesc?.trim())
  })
  const roomsWithMedia = new Set(media.filter((m) => m.bbroomid).map((m) => m.bbroomid))

  const availabilitySample = await supabase
    .from("availability_cache")
    .select("bbroomid, check_date, is_available, rate, status, booking_ref")
    .order("check_date", { ascending: false })
    .limit(5)

  const latestSnapshot = snapshotsRes.data?.[0] ?? null
  const latestSync = syncRunsRes.data?.[0] ?? null

  const rawRoomTypeKeys = new Set<string>()
  for (const rt of roomTypes) {
    const raw = rt.raw as Record<string, unknown> | null
    if (raw) Object.keys(raw).forEach((k) => rawRoomTypeKeys.add(k))
  }

  return {
    generatedAt: new Date().toISOString(),
    syncSchedule: "Host cron → POST /api/sync (requires external Playwright worker via SYNC_WORKER_URL)",
    inventory: NB_FIELD_INVENTORY,
    counts: {
      properties: propertyRes.data?.length ?? 0,
      roomTypes: roomTypes.length,
      rooms: rooms.length,
      availabilityRows: availabilityRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
      closeouts: closeoutsRes.count ?? 0,
      calendarEvents: eventsRes.count ?? 0,
      mediaAssets: media.length,
      syncRuns: syncRunsRes.data?.length ?? 0,
    },
    coverage: {
      roomsLinkedToRoomType: `${roomsWithType.length}/${rooms.length}`,
      roomsWithDescription: `${roomsWithDescription.length}/${rooms.length}`,
      roomsWithMedia: `${roomsWithMedia.size}/${rooms.length}`,
      roomsMissingType: roomsMissingType.map((r) => ({
        bbroomid: r.bbroomid,
        room_name: r.room_name,
        bbrtid: r.bbrtid,
      })),
    },
    dataFlow: {
      fetched: [
        "Property (bbid, bbname)",
        "Physical rooms (bbroomid, roomname, bbrtid, orderby)",
        "Room types (rtname, rtdesc, occupancy, ratescheme, roomsizesqm, …)",
        "Bookings + room-stays (guest PII, rates, status)",
        "Closeouts",
        "Calendar events",
        "Derived availability_cache per room-night",
      ],
      storedInDb: Object.keys(NB_FIELD_INVENTORY.tables),
      displayedFromDb: ["/api/rooms", "/api/availability", "/stay UI", "/api/media"],
      notFromApi: ["property_name/address/config/bathroom on room (room_catalog enrichment during sync)"],
      notAvailableFromNb: [
        "Room/property image URLs via bridgeitapi",
        "Amenities/facilities list",
        "Direct booking deep-link parameters (widget only)",
        "Real-time rate cards (only avg_rate on confirmed bookings)",
      ],
    },
    properties: propertyRes.data ?? [],
    roomTypes: roomTypes.map((rt) => ({
      ...rt,
      rawKeys: rt.raw ? Object.keys(rt.raw as object) : [],
    })),
    rooms: rooms.map((r) => ({
      bbroomid: r.bbroomid,
      room_name: r.room_name,
      property_name: r.property_name,
      bbrtid: r.bbrtid,
      configuration: r.configuration,
      bathroom_type: r.bathroom_type,
      address: r.address,
      order_by: r.order_by,
      raw: r.raw,
      room_type: r.room_type,
      hasMedia: roomsWithMedia.has(r.bbroomid),
    })),
    media,
    availabilitySample: availabilitySample.data ?? [],
    latestSnapshot,
    recentSyncRuns: syncRunsRes.data ?? [],
    latestSync,
    recommendations: [
      "Run supabase/migrations/002_nb_extended.sql if calendar_event, media_asset, or nb_api_snapshot tables are missing.",
      "Fix room bbrtid linkage so room_type join populates descriptions and occupancy on /stay.",
      "Apply closeouts when rebuilding availability_cache.",
      "Implement bookingnotificationsrq for cheaper polling between full syncs.",
      "Scrape or upload real property photos into media_asset (NB API does not expose images).",
      "Schedule public/ScriptTestBLGH/run-sync.sh on a host with Playwright (set SYNC_WORKER_URL).",
    ],
  }
}
