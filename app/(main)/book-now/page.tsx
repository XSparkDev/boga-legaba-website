import type { Metadata } from "next"
import {
  ArrowUpRight,
  MessageCircle,
  Phone,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  Car,
  Clock,
  Star,
  BedDouble,
  Maximize2,
  Wind,
  Tv,
  Coffee,
  Shirt,
  Waves,
  Utensils,
  UtensilsCrossed,
  TreePine,
  Building2,
  ChevronDown,
  Check,
  Moon,
  Baby,
  Lock,
  Flame,
  Thermometer,
  Monitor,
  Droplets,
  Bath,
  ShowerHead,
  Accessibility,
  Dumbbell,
  Sparkles,
  CookingPot,
  Home,
  PawPrint,
  BanIcon,
  Calendar,
} from "lucide-react"
import { Reveal } from "@/components/reveal"
import { properties, BUSINESS } from "@/data/rooms"
import {
  callAvailGrid,
  fetchPropertyPolicies,
  fetchEstablishment,
  fetchMealPlanRates,
  type NbRoomTypeDetail,
  type EstablishmentData,
} from "@/lib/nightsbridge-api"
import {
  findSelectedRate,
  type RoomRate,
  type MealPlanRate,
} from "@/lib/nightsbridge-rates"
import { BookingWidget } from "@/components/book-now/booking-widget"
import { RoomPhotoGallery } from "@/components/book-now/room-photo-gallery"
import { getRoomImagesByBbroomid } from "@/lib/room-images"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ searchParams }: BookNowPageProps): Promise<Metadata> {
  const params = await searchParams
  const name = params.roomTypeName ?? params.room
  return {
    title: name
      ? `Book ${name} | Boga Legaba Guest House`
      : "Availability & Rates | Boga Legaba Guest House",
  description:
      "Check live room availability and rates at Boga Legaba Guest House, Mafikeng. Book directly: no OTA fees, secure and instant.",
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NB_BBID = 21091

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return `R\u202F${Math.round(n).toLocaleString("en-ZA")}`
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`))
}

function nightCount(arrive: string, depart: string): number {
  return Math.max(
    1,
    Math.round(
      (new Date(`${depart}T12:00:00`).getTime() -
        new Date(`${arrive}T12:00:00`).getTime()) /
        86_400_000,
    ),
  )
}


function waEnquiryUrl(
  propertyName: string | null,
  roomTypeName: string | null,
  arrive: string | null,
  depart: string | null,
): string {
  const prop = properties.find((p) => p.name === propertyName)
  const num = prop
    ? prop.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "27828757018"
    : "27828757018"
  const parts = ["Hi Boga Legaba, I'd like to enquire about"]
  if (roomTypeName) parts.push(` the ${roomTypeName}`)
  if (arrive && depart) parts.push(` for ${arrive} to ${depart}`)
  parts.push(".")
  return `https://wa.me/${num}?text=${encodeURIComponent(parts.join(""))}`
}

const MEAL_PLAN_ORDER = [5, 1, 3] // Room Only first, then B&B, then DBB

function AmenityIcon({ name, className = "size-3.5 shrink-0 text-[#996948]" }: { name: string; className?: string }) {
  const n = name.toLowerCase()
  if (n.includes("air con") || n.includes("cooling"))  return <Thermometer className={className} />
  if (n.includes("wi-fi") || n.includes("wifi"))        return <Wifi className={className} />
  if (n.includes("tv") || n.includes("dstv") || n.includes("satellite")) return <Monitor className={className} />
  if (n.includes("coffee") || n.includes("tea"))        return <Coffee className={className} />
  if (n.includes("iron"))                               return <Shirt className={className} />
  if (n.includes("shower only"))                        return <ShowerHead className={className} />
  if (n.includes("tub") || n.includes("bath"))          return <Bath className={className} />
  if (n.includes("shower"))                             return <Droplets className={className} />
  if (n.includes("hair"))                               return <Wind className={className} />
  if (n.includes("smok"))                               return <XCircle className={className} />
  if (n.includes("pool") || n.includes("swim"))         return <Waves className={className} />
  if (n.includes("park"))                               return <Car className={className} />
  if (n.includes("wheelchair") || n.includes("access")) return <Accessibility className={className} />
  if (n.includes("bar") || n.includes("lounge"))        return <Utensils className={className} />
  if (n.includes("conference") || n.includes("meeting")) return <Building2 className={className} />
  if (n.includes("bbq") || n.includes("grill") || n.includes("picnic")) return <Flame className={className} />
  if (n.includes("spa"))                                return <Sparkles className={className} />
  if (n.includes("gym") || n.includes("fitness"))       return <Dumbbell className={className} />
  if (n.includes("kitchen") || n.includes("cook"))      return <CookingPot className={className} />
  return <Check className={className} />
}

function GroupIcon({ group, className = "size-3.5 shrink-0 text-gray-400" }: { group: string; className?: string }) {
  const g = group.toLowerCase()
  if (g.includes("bathroom"))  return <ShowerHead className={className} />
  if (g.includes("kitchen"))   return <Coffee className={className} />
  if (g.includes("in-room") || g.includes("room")) return <Home className={className} />
  if (g.includes("outdoor"))   return <TreePine className={className} />
  return <Star className={className} />
}

function MealPlanIcon({ id, className = "size-4 shrink-0 text-[#996948]" }: { id: number; className?: string }) {
  if (id === 1) return <Utensils className={className} />
  if (id === 3) return <UtensilsCrossed className={className} />
  return <BedDouble className={className} />  // Room Only (5)
}

// ---------------------------------------------------------------------------
// Room hero image
// ---------------------------------------------------------------------------

function RoomHero({
  detail,
  roomTypeName,
  arrive,
  depart,
}: {
  detail: NbRoomTypeDetail | null
  roomTypeName: string
  arrive: string
  depart: string
}) {
  const heroImg = detail?.images?.[0]
  const nights = nightCount(arrive, depart)

  return (
    <div className="relative h-72 w-full overflow-hidden bg-gray-900 sm:h-96 lg:h-[440px]">
      {heroImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImg.big}
          alt={`${roomTypeName} room`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#000000]">
          <div className="text-center">
            <BedDouble className="mx-auto mb-3 size-12 text-[#996948]/40" />
            <p className="font-body text-xs text-white/30">No image available</p>
          </div>
        </div>
      )}

      {/* Flat semi-transparent overlay for text legibility — brand guide: flat
          color blocks, no gradients. */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {detail?.quality ? (
                <span className="mb-2 inline-block rounded-full border border-[#996948]/50 bg-[#996948]/20 px-2.5 py-0.5 font-body text-[11px] font-medium text-[#996948]">
                  {detail.quality}
                </span>
              ) : null}
              <h1 className="font-title text-3xl font-extrabold text-white sm:text-4xl">
                {roomTypeName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {detail?.roomSizeM2 ? (
                  <span className="flex items-center gap-1.5 font-body text-xs text-white/70">
                    <Maximize2 className="size-3.5" />
                    {detail.roomSizeM2} m²
                  </span>
                ) : null}
                {detail?.bedTypes?.[0] ? (
                  <span className="flex items-center gap-1.5 font-body text-xs text-white/70">
                    <BedDouble className="size-3.5" />
                    {detail.bedTypes[0].description} bed
                  </span>
                ) : null}
                {detail?.maxAdults ? (
                  <span className="flex items-center gap-1.5 font-body text-xs text-white/70">
                    <Users className="size-3.5" />
                    Max {detail.maxAdults} adults
                  </span>
                ) : null}
              </div>
            </div>

            {/* Dates pill */}
            <div className="rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 backdrop-blur-sm">
              <p className="font-body text-[11px] text-white/60">Stay</p>
              <p className="mt-0.5 font-body text-sm font-medium text-white">
                {fmtDate(arrive)} → {fmtDate(depart)}
              </p>
              <p className="mt-0.5 font-body text-xs font-semibold text-[#996948]">
                {nights} night{nights !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Room facts grid (reused in both normal and fallback flows)
// ---------------------------------------------------------------------------

function RoomFactsBlock({ detail, rateFallback }: { detail: NbRoomTypeDetail | null; rateFallback?: RoomRate | null }) {
  const d = detail
  if (!d && !rateFallback) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-body text-[13px] font-semibold tracking-normal text-gray-500">Room facts</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {d?.roomSizeM2 ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <Maximize2 className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Size</p>
              <p className="text-sm font-semibold text-gray-800">{d.roomSizeM2} m²</p>
            </div>
          </div>
        ) : null}
        {d?.bedTypes?.[0] ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <BedDouble className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Bed</p>
              <p className="text-sm font-semibold text-gray-800">
                {d.bedTypes.map((b) => `${b.bedcount > 1 ? `${b.bedcount}× ` : ""}${b.description}`).join(", ")}
              </p>
            </div>
          </div>
        ) : null}
        {(d?.maxAdults ?? rateFallback?.maxAdults) ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <Users className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Guests</p>
              <p className="text-sm font-semibold text-gray-800">Max {d?.maxAdults ?? rateFallback?.maxAdults} adults</p>
            </div>
          </div>
        ) : null}
        {d?.maxOccupancy && d.maxOccupancy !== d.maxAdults ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <Users className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Occupancy</p>
              <p className="text-sm font-semibold text-gray-800">Up to {d.maxOccupancy} guests</p>
            </div>
          </div>
        ) : null}
        {d?.quality ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <Star className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Tier</p>
              <p className="text-sm font-semibold text-gray-800">{d.quality}</p>
            </div>
          </div>
        ) : null}
        {d?.roomType ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <Building2 className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Type</p>
              <p className="text-sm font-semibold text-gray-800">{d.roomType}</p>
            </div>
          </div>
        ) : null}
        {d !== null && !d.allowSmoking ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
            <XCircle className="size-4 shrink-0 text-[#996948]" />
            <div>
              <p className="font-body text-[11px] text-gray-400">Smoking</p>
              <p className="text-sm font-semibold text-gray-800">Non-smoking</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RoomAmenitiesBlock({ detail }: { detail: NbRoomTypeDetail | null }) {
  if (!detail?.amenityGroups?.length) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-body text-[13px] font-semibold tracking-normal text-gray-500">Room amenities</h2>
      <div className="space-y-5">
        {detail.amenityGroups.map((g) => (
          <div key={g.group}>
            <p className="mb-2.5 flex items-center gap-1.5 font-body text-xs font-semibold text-gray-600">
              <GroupIcon group={g.group} />
              {g.group}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {g.amenities.map((a) => (
                <div key={a.otaamenitycode}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                  <AmenityIcon name={a.description} />
                  <span className="text-xs text-gray-600">{a.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Room detail + booking widget (two-column layout)
// ---------------------------------------------------------------------------

function RoomDetailAndBooking({
  rate,
  detail,
  mealPlans,
  arrive,
  depart,
  bbid,
  whatsappUrl,
}: {
  rate: RoomRate
  detail: NbRoomTypeDetail | null
  mealPlans: MealPlanRate[] | null
  arrive: string
  depart: string
  bbid: number
  whatsappUrl: string
}) {
  const nights = nightCount(arrive, depart)

  // Sort mealplans: Room Only first, then B&B, then DBB
  const sortedPlans = mealPlans
    ? [...mealPlans].sort((a, b) => {
        const ia = MEAL_PLAN_ORDER.indexOf(a.mealplanid)
        const ib = MEAL_PLAN_ORDER.indexOf(b.mealplanid)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
    : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">

        {/* ── LEFT: Room details (2/3 width) ────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Description — prefer the establishment description (richer text) */}
          {(detail?.description || rate.description) ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-body text-[13px] font-semibold tracking-normal text-gray-500">
                About this room
              </h2>
              <p className="text-base leading-relaxed text-gray-700">
                {detail?.description || rate.description}
              </p>
            </div>
          ) : null}

          {/* Quick facts */}
          <RoomFactsBlock detail={detail} rateFallback={rate} />

          {/* Amenity groups */}
          <RoomAmenitiesBlock detail={detail} />

          {/* Children policy */}
          {rate.childrenPolicy ? (
            <div className="flex items-start gap-3 rounded-xl border border-[#73CAC3]/30 bg-[#73CAC3]/10 px-5 py-4">
              <Baby className="mt-0.5 size-5 shrink-0 text-[#7A8850]" />
              <div>
                <p className="font-medium text-gray-800">Children policy</p>
                <p className="mt-0.5 text-sm text-gray-600">{rate.childrenPolicy}</p>
              </div>
            </div>
          ) : null}

          {/* Booking widget — expands here when guest clicks "Book This Room" */}
          <BookingWidget
            roomTypeName={rate.rtname}
            arrive={arrive}
            depart={depart}
            bbid={bbid}
            mealPlans={mealPlans}
            available={rate.available}
            whatsappUrl={whatsappUrl}
            maxAdults={rate.maxAdults}
            maxOccupancy={rate.maxGuests}
          />
        </div>

        {/* ── RIGHT: Rates summary + WhatsApp (1/3 width, sticky) ─────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">

            {/* Availability badge */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              rate.available
                ? "border border-emerald-200 bg-emerald-50"
                : "border border-red-200 bg-red-50"
            }`}>
              {rate.available ? (
                <>
                  <span className="flex items-center gap-2 font-medium text-emerald-800">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1 font-body text-[11px] text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Live
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-2 font-medium text-red-700">
                  <XCircle className="size-4 text-red-500" />
                  Sold out for these dates
                </span>
              )}
            </div>

            {/* Date summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <Clock className="size-3.5 text-[#996948]" />
                <span>{fmtDate(arrive)} → {fmtDate(depart)}</span>
              </div>
              <p className="mt-1 font-body text-sm font-semibold text-[#996948]">
                {nights} night{nights !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Mealplan rates */}
            {rate.available && sortedPlans.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <p className="font-body text-[11px] text-gray-400">
                    Rate options · per night
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedPlans.map((plan) => (
                    <div key={plan.mealplanid} className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MealPlanIcon id={plan.mealplanid} />
                        <p className="text-[13px] font-semibold text-gray-800">
                          {plan.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {plan.rateSingle != null ? (
                          <div>
                            <p className="font-serif text-lg font-bold text-[#996948] leading-none">
                              {fmt(plan.rateSingle)}
                            </p>
                            <p className="mt-0.5 font-body text-[11px] text-gray-400">
                              1 adult
                            </p>
                          </div>
                        ) : null}
                        {plan.rateDouble != null ? (
                          <div>
                            <p className="font-serif text-lg font-bold text-[#996948] leading-none">
                              {fmt(plan.rateDouble)}
                            </p>
                            <p className="mt-0.5 font-body text-[11px] text-gray-400">
                              2 adults
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <p className="font-body text-[11px] text-gray-400">
                    Per room · VAT included · Rates may vary per night
                  </p>
                </div>
              </div>
            ) : rate.available && (rate.rateSingle != null || rate.rateDouble != null) ? (
              // Fallback if no mealplan data
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-2 font-body text-[11px] text-gray-400">
                  From · per night
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {rate.rateSingle != null ? (
                    <div>
                      <p className="font-serif text-2xl font-bold text-[#996948]">
                        {fmt(rate.rateSingle)}
                      </p>
                      <p className="font-body text-[11px] text-gray-400">1 adult</p>
                    </div>
                  ) : null}
                  {rate.rateDouble != null ? (
                    <div>
                      <p className="font-serif text-2xl font-bold text-[#996948]">
                        {fmt(rate.rateDouble)}
                      </p>
                      <p className="font-body text-[11px] text-gray-400">2 adults</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* WhatsApp enquiry */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <MessageCircle className="size-4 text-[#1ea952]" />
              Enquire via WhatsApp
            </a>

            {/* NightsBridge badge */}
            <p className="text-center font-body text-[10px] text-gray-300">
              Powered by NightsBridge · Secure & Instant
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Availability comparison table (condensed)
// ---------------------------------------------------------------------------

function AvailabilityTable({
  rates,
  selectedRate,
  arrive,
  depart,
  bbid,
}: {
  rates: RoomRate[]
  selectedRate: RoomRate | null
  arrive: string
  depart: string
  bbid: number
}) {
  const nights = nightCount(arrive, depart)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Date banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar className="size-4 shrink-0 text-[#996948]" />
          <span>
            {fmtDate(arrive)} → {fmtDate(depart)}
          </span>
          <span className="rounded-full bg-[#996948]/10 px-2.5 py-0.5 font-body text-xs font-semibold text-[#996948]">
            {nights} night{nights !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-body text-xs text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Live · NightsBridge
        </span>
      </div>

      {/* Table wrapper — horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-3 pl-4 pr-2 text-left font-body text-xs font-medium tracking-normal text-gray-500 sm:pl-6">
                Room type
              </th>
              <th className="px-3 py-3 text-center font-body text-xs font-medium tracking-normal text-gray-500">
                Guests
              </th>
              <th className="px-3 py-3 text-right font-body text-xs font-medium tracking-normal text-gray-500">
                1 adult / night
              </th>
              <th className="px-3 py-3 text-right font-body text-xs font-medium tracking-normal text-gray-500">
                2 adults / night
              </th>
              <th className="px-3 py-3 text-center font-body text-xs font-medium tracking-normal text-gray-500">
                Status
              </th>
              <th className="py-3 pl-2 pr-4 text-right font-body text-xs font-medium tracking-normal text-gray-500 sm:pr-6">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rates.map((r) => {
              const isSelected = r === selectedRate
              const detailUrl = `/book-now?roomTypeName=${encodeURIComponent(r.rtname)}&from=${arrive}&to=${depart}&bbid=${bbid}`
              return (
                <tr
                  key={r.rtname}
                  className={`transition-colors hover:bg-gray-50/80 ${
                    isSelected ? "border-l-4 border-l-[#996948] bg-amber-50/40" : ""
                  } ${!r.available ? "opacity-60" : ""}`}
                >
                  {/* Room name */}
                  <td className="py-4 pl-4 pr-2 sm:pl-6">
                    <div className="flex items-start gap-2">
                      {isSelected && (
                        <span className="mt-0.5 shrink-0 text-[#996948]">★</span>
                      )}
                      <div>
                        <a
                          href={detailUrl}
                          className="font-medium text-gray-900 hover:text-[#996948] transition-colors"
                        >
                          {r.rtname}
                        </a>
                        {r.description ? (
                          <p className="mt-0.5 text-xs leading-snug text-gray-400 line-clamp-1 max-w-[260px]">
                            {r.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Guests */}
                  <td className="px-3 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-body text-xs text-gray-600">
                      <Users className="size-3" />
                      {r.maxAdults ?? r.maxGuests ?? "N/A"}
                    </span>
                  </td>

                  {/* 1 adult/night */}
                  <td className="px-3 py-4 text-right">
                    {r.rateSingle != null ? (
                      <span className="font-semibold text-[#996948]">
                        {fmt(r.rateSingle)}
                      </span>
                    ) : r.available ? (
                      <span className="text-gray-400">N/A</span>
                    ) : null}
                  </td>

                  {/* 2 adults/night */}
                  <td className="px-3 py-4 text-right">
                    {r.rateDouble != null ? (
                      <span className="font-semibold text-[#996948]">
                        {fmt(r.rateDouble)}
                      </span>
                    ) : r.available ? (
                      <span className="text-gray-400">N/A</span>
                    ) : null}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-4 text-center">
                    {r.available ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-body text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="size-3" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-body text-[11px] font-medium text-red-600">
                        <XCircle className="size-3" />
                        Sold
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 pl-2 pr-4 text-right sm:pr-6">
                    {r.available ? (
                      <a
                        href={detailUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#996948] px-4 py-2 font-body text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                      >
                        View & Book
                        <ChevronDown className="size-3" />
                      </a>
                    ) : (
                      <span className="font-body text-xs text-gray-400">Unavailable</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 sm:px-6">
        <p className="font-body text-[11px] text-gray-400">
          Rates are per room · Room Only · VAT included · Click a room for full details & all meal plan options
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Property info strip
// ---------------------------------------------------------------------------

function PropertyInfoSection({ est }: { est: EstablishmentData }) {
  const gradeMain = est.grading.find(
    (g) =>
      g.gradingauthority.includes("Tourism Grading") ||
      g.gradingauthority.includes("Self Assessment"),
  )

  return (
    <div className="space-y-4">
      {/* Check-in / check-out + quick facts */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
          <h3 className="font-body text-[13px] font-semibold tracking-normal text-gray-500">
            Property information
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          {est.checkintime ? (
            <div className="flex items-center gap-3 p-4">
              <Clock className="size-5 shrink-0 text-[#996948]" />
              <div>
                <p className="font-body text-[11px] text-gray-400">Check-in</p>
                <p className="font-semibold text-gray-800">{est.checkintime}</p>
              </div>
            </div>
          ) : null}
          {est.checkouttime ? (
            <div className="flex items-center gap-3 p-4">
              <Clock className="size-5 shrink-0 text-[#996948]" />
              <div>
                <p className="font-body text-[11px] text-gray-400">Check-out</p>
                <p className="font-semibold text-gray-800">{est.checkouttime}</p>
              </div>
            </div>
          ) : null}
          {est.wifi ? (
            <div className="flex items-center gap-3 p-4">
              <Wifi className="size-5 shrink-0 text-[#996948]" />
              <div>
                <p className="font-body text-[11px] text-gray-400">Wi-Fi</p>
                <p className="font-semibold text-gray-800">
                  {est.wificost === "Free and unlimited" ? "Free" : est.wificost ?? est.wifi}
                </p>
              </div>
            </div>
          ) : null}
          {est.parking ? (
            <div className="flex items-center gap-3 p-4">
              <Car className="size-5 shrink-0 text-[#996948]" />
              <div>
                <p className="font-body text-[11px] text-gray-400">Parking</p>
                <p className="font-semibold text-gray-800">{est.parking}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Grading + pets + smoking row */}
        <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 py-3 sm:px-6">
          {gradeMain ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#996948]/30 bg-[#996948]/5 px-3 py-1 font-body text-xs text-[#996948]">
              <Star className="size-3" />
              {gradeMain.grade} · {gradeMain.gradingauthority}
            </span>
          ) : null}
          {est.allowPet ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-body text-xs text-gray-600">
              <PawPrint className="size-3.5 shrink-0" /> {est.allowPet}
            </span>
          ) : null}
          {!est.allowSmoking ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-body text-xs text-gray-600">
              <BanIcon className="size-3.5 shrink-0" /> Non-smoking property
            </span>
          ) : null}
        </div>
      </div>

      {/* Property amenities */}
      {est.propertyAmenities.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
            <h3 className="font-body text-[13px] font-semibold tracking-normal text-gray-500">
              Facilities & amenities
            </h3>
          </div>
          <div className="flex flex-wrap gap-2.5 p-5 sm:p-6">
            {est.propertyAmenities.map((a) => (
              <span
                key={a.code}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                <AmenityIcon name={a.description} className="size-3.5 shrink-0 text-[#996948]" />
                {a.description}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Property photo gallery */}
      {est.propertyImages.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
            <h3 className="font-body text-[13px] font-semibold tracking-normal text-gray-500">
              Property gallery
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5">
            {est.propertyImages.map((img, i) => (
              <div
                key={i}
                className="relative aspect-video overflow-hidden rounded-lg bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.medium}
                  alt={img.categoryname || "Property photo"}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {img.categoryname ? (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
                    <p className="font-body text-[10px] text-white/70">
                      {img.categoryname}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Area info, attractions, directions, TripAdvisor
// ---------------------------------------------------------------------------

function AreaSection({ est }: { est: EstablishmentData }) {
  const hasArea = Boolean(est.areainfo || est.attractions || est.directions)
  if (!hasArea && !est.tripadvisorLocationId) return null

  // Parse attractions bullet list (newline + "*" delimited)
  const attractionsList = est.attractions
    ? est.attractions
        .split(/\n/)
        .map((l) => l.replace(/^\*\s*/, "").trim())
        .filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      {/* About the area */}
      {est.areainfo ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-body text-[13px] font-semibold tracking-normal text-gray-500">
            <TreePine className="size-4 text-[#996948]" /> About Mafikeng
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">{est.areainfo}</p>
        </div>
      ) : null}

      {/* Attractions */}
      {attractionsList.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-body text-[13px] font-semibold tracking-normal text-gray-500">
            <Star className="size-4 text-[#996948]" /> Local attractions
          </h3>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {attractionsList.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 shrink-0 text-[#996948]">✦</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Directions */}
      {est.directions ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="mb-2 flex items-center gap-2 font-body text-[13px] font-semibold tracking-normal text-gray-500">
                🗺️ Getting here
              </h3>
              {est.address ? (
                <p className="mb-2 font-body text-xs text-[#996948]">{est.address.replace(/\n/g, " · ")}</p>
              ) : null}
              <p className="text-sm leading-relaxed text-gray-600">{est.directions}</p>
            </div>
            {est.lat && est.lng ? (
              <a
                href={`https://www.google.com/maps?q=${est.lat},${est.lng}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-xl border border-[#996948]/30 bg-[#996948]/5 px-4 py-2.5 font-body text-xs text-[#996948] hover:bg-[#996948]/10 transition-colors"
              >
                Open in Maps
                <ArrowUpRight className="ml-1 inline size-3" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* TripAdvisor link */}
      {est.tripadvisorLocationId ? (
        <a
          href={`https://www.tripadvisor.com/Hotel_Review-g${est.tripadvisorLocationId}.html`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#34e0a1]/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34e0a1]/10">
            <span className="text-lg">🦉</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">View on TripAdvisor</p>
            <p className="text-xs text-gray-500">Read guest reviews for Boga Legaba Guest House</p>
          </div>
          <ArrowUpRight className="ml-auto size-4 text-gray-300" />
        </a>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Policies section (only real data)
// ---------------------------------------------------------------------------

function PoliciesSection({
  childAgeFreeUpTo,
  childAgeFixedRate,
  childFixedRate,
  cancellationPolicy,
}: {
  childAgeFreeUpTo: number | null
  childAgeFixedRate: number | null
  childFixedRate: number | null
  cancellationPolicy: string | null
}) {
  const hasChildren = childAgeFreeUpTo != null
  const hasCancellation = Boolean(cancellationPolicy)
  if (!hasChildren && !hasCancellation) return null

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
        <h3 className="font-body text-[13px] font-semibold tracking-normal text-gray-500">
          Property policies
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {hasChildren ? (
          <div className="flex gap-4 px-5 py-4 sm:px-6">
            <Baby className="mt-0.5 size-5 shrink-0 text-[#7A8850]" />
            <div>
              <p className="font-medium text-gray-800">Children</p>
              <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
                <li>Ages 0–{childAgeFreeUpTo} stay free</li>
                {childAgeFixedRate != null && childFixedRate != null ? (
                  <li>
                    Ages {childAgeFreeUpTo! + 1}–{childAgeFixedRate} pay{" "}
                    <strong>{fmt(childFixedRate)}</strong> per stay
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        {hasCancellation ? (
          <div className="flex gap-4 px-5 py-4 sm:px-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-gray-800">Cancellation policy</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {cancellationPolicy}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface BookNowPageProps {
  searchParams: Promise<{
    room?: string
    property?: string
    bbroomid?: string
    bbid?: string
    bbrtid?: string
    from?: string
    to?: string
    roomTypeName?: string
  }>
}

export default async function BookNowPage({ searchParams }: BookNowPageProps) {
  const params = await searchParams

  const roomNameParam = params.room ?? null
  const propertyNameParam = params.property ?? null
  const bbroomid = params.bbroomid ? Number(params.bbroomid) : null
  const bbid = params.bbid ? Number(params.bbid) : NB_BBID
  // bbrtid = NightsBridge room TYPE id — use it for direct lookup in establishment data
  const bbrtidParam = params.bbrtid ? Number(params.bbrtid) : null
  const fromDate = params.from ?? null
  const toDate = params.to ?? null
  const roomTypeNameParam = params.roomTypeName ?? null

  // Real per-room photos (Supabase room_images, keyed by physical room id).
  // Kicked off in parallel with the NightsBridge calls below; empty when this
  // room has no uploaded photos or arrived here without a bbroomid.
  const roomPhotosPromise = bbroomid ? getRoomImagesByBbroomid(bbroomid) : Promise.resolve([])

  // ── Parallel API calls ─────────────────────────────────────────────
  const [rates, policies, estData, mealPlanMap] =
    fromDate && toDate
      ? await Promise.all([
          callAvailGrid(bbid, fromDate, toDate),
          fetchPropertyPolicies(bbid, fromDate, toDate),
          fetchEstablishment(bbid),
          fetchMealPlanRates(bbid, fromDate, toDate),
        ])
      : await Promise.all([
          Promise.resolve(null),
          Promise.resolve(null),
          fetchEstablishment(bbid),
          Promise.resolve(null),
        ])

  const roomPhotos = await roomPhotosPromise

  // ── Resolve the room type detail ────────────────────────────────────
  // Priority 1: direct bbrtid lookup (most reliable — survives stale roomTypeName)
  const directDetail: NbRoomTypeDetail | null =
    estData && bbrtidParam ? (estData.roomTypes.get(bbrtidParam) ?? null) : null

  // The effective room type name: use the NB name from establishment if bbrtid matched
  const resolvedRoomTypeName =
    directDetail?.name ?? roomTypeNameParam

  const sortedRates: RoomRate[] = rates
    ? [...rates].sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1
        return a.rtname.localeCompare(b.rtname)
      })
    : []

  const selectedRate = sortedRates.length
    ? findSelectedRate(sortedRates, bbroomid, roomNameParam, resolvedRoomTypeName, null, null)
    : null

  // Re-sort: selected first, then available, then sold
  const displayRates = selectedRate
    ? [selectedRate, ...sortedRates.filter((r) => r !== selectedRate)]
    : sortedRates

  // Priority: directDetail (bbrtid) > lookup by selectedRate.rtid
  const selectedDetail: NbRoomTypeDetail | null =
    directDetail ??
    (estData && selectedRate?.rtid ? (estData.roomTypes.get(selectedRate.rtid) ?? null) : null)

  // Get meal plan options for selected room
  const selectedMealPlans: MealPlanRate[] | null =
    mealPlanMap && (selectedDetail?.rtid ?? selectedRate?.rtid) != null
      ? (mealPlanMap.get((selectedDetail?.rtid ?? selectedRate?.rtid)!) ?? null)
      : null

  const availableCount = sortedRates.filter((r) => r.available).length

  // Display name for this room's booking page
  const displayRoomTypeName =
    selectedDetail?.name ?? selectedRate?.rtname ?? resolvedRoomTypeName ?? roomNameParam

  const whatsappLink = waEnquiryUrl(
    propertyNameParam,
    displayRoomTypeName,
    fromDate,
    toDate,
  )

  const hasSelectedRoom = Boolean((selectedRate || directDetail) && fromDate && toDate)

  // Real photos for THIS physical room → drives the gallery. When empty we fall
  // back to the NightsBridge hero image exactly as before.
  const realPhotos = roomPhotos.map((p) => ({ url: p.image_url, title: p.title }))

  return (
    <>
      {/* ── Dark header with breadcrumb ──────────────────────── */}
      {/* pt clears the fixed nav (4.5rem on mobile, 6rem on xl) + breathing room */}
      <div className="border-b border-white/10 bg-[#000000] px-4 pb-6 pt-[calc(4.5rem+1.5rem)] sm:px-6 lg:px-8 xl:pt-[calc(6rem+1.5rem)]">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-2 flex items-center gap-1 font-body text-xs text-white/40">
            <a href="/stay" className="hover:text-white/70 transition-colors">Stay</a>
            <ChevronRight className="size-3" />
            {propertyNameParam ? (
              <>
                <span>{propertyNameParam}</span>
                <ChevronRight className="size-3" />
              </>
            ) : null}
            <span className="text-white/70">
              {displayRoomTypeName ?? "Book a room"}
            </span>
          </nav>
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            {displayRoomTypeName
              ? `Book ${displayRoomTypeName}`
              : "Check Availability & Rates"}
          </h1>
          <p className="mt-1 font-body text-xs text-white/40">
            Boga Legaba Guest House &amp; Conference Centre · Mafikeng
          </p>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="min-h-screen bg-[#FFFFFF]">

        {fromDate && toDate ? (
          <>
            {/* SELECTED ROOM DETAIL FLOW */}
            {hasSelectedRoom && (selectedRate || directDetail) ? (
              <>
                {realPhotos.length > 0 ? (
                  /* Real per-room photos → Airbnb-style lead + thumbnails gallery */
                  <RoomPhotoGallery
                    photos={realPhotos}
                    roomTypeName={displayRoomTypeName ?? ""}
                    arrive={fromDate}
                    depart={toDate}
                    quality={selectedDetail?.quality}
                    roomSizeM2={selectedDetail?.roomSizeM2}
                    bedType={selectedDetail?.bedTypes?.[0]?.description}
                    maxAdults={selectedDetail?.maxAdults}
                  />
                ) : (
                  <>
                    {/* No real photos for this room → NightsBridge hero fallback */}
                    <RoomHero
                      detail={selectedDetail}
                      roomTypeName={displayRoomTypeName ?? ""}
                      arrive={fromDate}
                      depart={toDate}
                    />

                    {/* Photo gallery strip (all images from NightsBridge) */}
                    {selectedDetail && selectedDetail.images.length > 1 ? (
                      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
                        <h2 className="mb-3 font-body text-[13px] font-semibold tracking-normal text-gray-500">
                          Room photos · {selectedDetail.images.length} images
                        </h2>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {selectedDetail.images.map((img, i) => (
                            <div
                              key={i}
                              className="group relative aspect-video overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.big ?? img.medium}
                                alt={`${displayRoomTypeName}: photo ${i + 1}`}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              {img.categoryname ? (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <p className="font-body text-[10px] text-white/80">
                                    {img.categoryname}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {/* Detail + booking widget */}
                {selectedRate ? (
                <RoomDetailAndBooking
                  rate={selectedRate}
                  detail={selectedDetail}
                  mealPlans={selectedMealPlans}
                  arrive={fromDate}
                  depart={toDate}
                  bbid={bbid}
                  whatsappUrl={whatsappLink}
                />
                ) : directDetail ? (
                  /* Room found via bbrtid but NOT in availgrid (e.g. sold, or dates not sent yet) */
                  <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
                      <div className="space-y-6 lg:col-span-2">
                        {directDetail.description ? (
                          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-3 font-body text-[13px] font-semibold tracking-normal text-gray-500">About this room</h2>
                            <p className="text-base leading-relaxed text-gray-700">{directDetail.description}</p>
                          </div>
                        ) : null}
                        <RoomFactsBlock detail={directDetail} />
                        <RoomAmenitiesBlock detail={directDetail} />
                      </div>
                      <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                            <XCircle className="mx-auto mb-2 size-6 text-red-400" />
                            <p className="text-sm font-medium text-red-700">Not available for these dates</p>
                            <p className="mt-1 text-xs text-red-500">Try different dates or select another room type</p>
                          </div>
                          <a href={whatsappLink} target="_blank" rel="noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                            <MessageCircle className="size-4 text-[#1ea952]" />
                            Enquire via WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Comparison table (all rooms) */}
                {sortedRates.length > 1 ? (
                  <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                    <h2 className="mb-3 font-serif text-xl font-bold text-gray-900">
                      All room types
                    </h2>
                    <p className="mb-4 text-sm text-gray-500">
                      {availableCount} of {sortedRates.length} room types available for these dates.
                    </p>
                    <AvailabilityTable
                      rates={displayRates}
                      selectedRate={selectedRate}
                      arrive={fromDate}
                      depart={toDate}
                      bbid={bbid}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              /* No specific room selected — show table only */
              <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold text-gray-900">Available rooms</h2>
                  {sortedRates.length > 0 ? (
                    <p className="font-body text-xs text-gray-500">
                      {availableCount} of {sortedRates.length} available
                    </p>
                  ) : null}
                </div>

                {sortedRates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-gray-600">
                      Could not load live rates right now.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Please try again or contact us directly.
                    </p>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1ea952] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <MessageCircle className="size-4" />
                      Enquire via WhatsApp
                    </a>
                  </div>
                ) : (
                  <AvailabilityTable
                    rates={displayRates}
                    selectedRate={null}
                    arrive={fromDate}
                    depart={toDate}
                    bbid={bbid}
                  />
                )}
              </div>
            )}

            {/* Property info section */}
            {estData ? (
              <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                <h2 className="mb-4 font-serif text-xl font-bold text-gray-900">
                  About the property
                </h2>
                {estData.teaser ? (
                  <p className="mb-5 text-sm leading-relaxed text-gray-600 max-w-2xl">
                    {estData.teaser}
                  </p>
                ) : null}
                <PropertyInfoSection est={estData} />
              </div>
            ) : null}

            {/* Area, attractions, directions, TripAdvisor */}
            {estData ? (
              <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                <h2 className="mb-4 font-serif text-xl font-bold text-gray-900">
                  Explore Mafikeng
                </h2>
                <AreaSection est={estData} />
              </div>
            ) : null}

            {/* Policies */}
            {policies ? (
              <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                <PoliciesSection
                  childAgeFreeUpTo={policies.childAgeFreeUpTo}
                  childAgeFixedRate={policies.childAgeFixedRate}
                  childFixedRate={policies.childFixedRate}
                  cancellationPolicy={policies.cancellationPolicy}
                />
              </div>
            ) : null}
          </>
        ) : (
          /* No dates — show room detail from establishment API + date prompt */
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

            {/* If we know the room (via bbrtid or roomTypeName), show its detail */}
            {selectedDetail ? (
              <>
                {/* Room hero image from establishment */}
                {selectedDetail.images.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedDetail.images[0].big ?? selectedDetail.images[0].medium}
                      alt={displayRoomTypeName ?? selectedDetail.name}
                      className="h-64 w-full object-cover sm:h-80 lg:h-96"
                    />
                  </div>
                ) : null}

                {/* Image gallery strip */}
                {selectedDetail.images.length > 1 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {selectedDetail.images.slice(1).map((img, i) => (
                      <div key={i} className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.medium} alt={`Photo ${i + 2}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Room description + facts */}
                {selectedDetail.description ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-3 font-body text-[13px] font-semibold tracking-normal text-gray-500">About this room</h2>
                    <p className="text-base leading-relaxed text-gray-700">{selectedDetail.description}</p>
                  </div>
                ) : null}

                <RoomFactsBlock detail={selectedDetail} />
                <RoomAmenitiesBlock detail={selectedDetail} />
              </>
            ) : null}

            {/* Date CTA */}
            <div className="rounded-2xl border-2 border-dashed border-[#996948]/30 bg-[#996948]/5 p-8 text-center">
              <p className="font-body text-sm font-semibold text-[#996948]">
                Add your dates to see live pricing
              </p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                {displayRoomTypeName
                  ? `Go back to the Stay page, pick your dates, and click "Book ${displayRoomTypeName}" to see live availability.`
                  : "Pick your travel dates on the Stay page to see live rates and availability."}
              </p>
              <a
                href={`/stay`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#996948] px-6 py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Choose dates →
              </a>
            </div>

            {/* Property info */}
            {estData ? (
              <>
                <h2 className="font-serif text-xl font-bold text-gray-900">About the property</h2>
                {estData.teaser ? (
                  <p className="text-sm leading-relaxed text-gray-600 max-w-2xl">{estData.teaser}</p>
                ) : null}
                <PropertyInfoSection est={estData} />
                <h2 className="font-serif text-xl font-bold text-gray-900">Explore Mafikeng</h2>
                <AreaSection est={estData} />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ── WhatsApp desks ───────────────────────────────────── */}
      <section className="bg-white py-14 lg:py-20 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-body text-xs font-semibold text-[#996948]">
              Prefer to talk?
            </p>
            <h2 className="mt-3 text-balance font-serif text-2xl font-bold text-gray-900 sm:text-3xl">
              Message a property desk
            </h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-gray-500">
              Message the desk for the property you&apos;d like to stay at. Always confirm your
              arrival address at time of booking.
            </p>
          </Reveal>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {properties
              .filter((p) => p.id !== "transnet")
              .map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <a
                  href={p.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                    className="group flex h-full flex-col rounded-xl border border-gray-200 border-l-4 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#996948]/40"
                    style={{ borderLeftColor: p.colorHex }}
                  >
                    <span
                      className="font-body text-xs"
                      style={{ color: p.colorHex }}
                    >
                    {p.tagline}
                  </span>
                    <span className="mt-1 font-serif text-lg text-gray-900">{p.name}</span>
                    <span className="font-body text-xs text-gray-400">
                      {p.code}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1ea952]">
                    <MessageCircle className="size-4" /> Chat now
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          <div className="mx-auto mt-6 flex max-w-4xl justify-center">
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#996948]/40"
            >
              <Phone className="size-4 text-[#996948]" /> Call {BUSINESS.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
