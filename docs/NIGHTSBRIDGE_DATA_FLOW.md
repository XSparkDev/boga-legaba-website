# NightsBridge data flow

## Overview

```
Playwright login → dashboard loginkey
       ↓
BootstrapRQ (session loginkey)
       ↓
BookingCalendarRQ (date window)
       ↓
public/ScriptTestBLGH/storage.py → Supabase
       ↓
Next.js /api/rooms, /api/availability, /api/media
       ↓
Custom React UI (/stay, room cards)
```

**NightsBridge is never embedded on `/stay`.** The booking iframe (`book.nightsbridge.com/21091`) is only used optionally for image scraping and legacy book-now flows.

---

## 1. What data is fetched?

### API: `POST https://bridgeit.nightsbridge.com/bridgeitapi`

| Message | Purpose |
|---------|---------|
| `BootstrapRQ` | Exchange dashboard loginkey for session loginkey |
| `BookingCalendarRQ` | Full calendar state for a date range |

### `BookingCalendarRQ` response keys

| Key | Contents |
|-----|----------|
| `bb` | Property id + name (`bbid`, `bbname`) |
| `rooms[]` | Physical rooms: `bbroomid`, `roomname`, `bbrtid`, `orderby` |
| `roomtypes{}` | Room types keyed by `bbrtid`: name, description, occupancy, size, rate scheme, … |
| `roomtypemode` | Boolean calendar mode flag |
| `bookings[]` | Reservations with nested `rooms[]` stays (guest PII, rates, status) |
| `closeouts[]` | Blocked date ranges per room |
| `events[]` | Calendar notes/events |

### Not implemented (documented elsewhere)

- `bookingnotificationsrq` — lightweight change feed
- `DoubleBookingsRQ` — overlap detection
- `availRQ` / `FromPriceRQ` — public webservice availability/pricing

### Not available from bridgeitapi

- **Room/property image URLs** (managed in NightsBridge Webview → Web Info)
- Amenities/facilities lists
- Marketing copy (unless in `roomtypes[].rtdesc`)
- Live rate cards (only `avgrate` on existing booking stays)

---

## 2. Which API endpoints does our website use?

| Route | Source | Auth |
|-------|--------|------|
| `GET /api/rooms` | Supabase `room` + `room_type` | Public (anon) |
| `GET /api/availability?from&to` | Supabase `availability_cache` | Public |
| `GET /api/media` | Supabase `media_asset` | Public |
| `GET /api/nightsbridge/audit` | Full DB audit report | `NB_AUDIT_KEY` or dev |
| `GET /api/bookings` | Supabase `booking` | Service role bearer |
| `POST /api/sync` | Triggers external worker | Cron secret |

**The website never calls NightsBridge directly at runtime.** All guest-facing pages read from Supabase.

---

## 3. Is data saved to our database?

Yes — when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set and you run:

```bash
cd public/ScriptTestBLGH && ./run-sync.sh
```

---

## 4. Which tables are updated?

| Table | Updated by sync |
|-------|-----------------|
| `property` | Yes |
| `room_type` | Yes |
| `room` | Yes |
| `booking`, `guest`, `booking_room_stay` | Yes |
| `availability_cache` | Yes (rebuilt each sync) |
| `closeout` | Yes |
| `calendar_event` | Yes (after migration 002) |
| `nb_api_snapshot` | Yes (audit trail) |
| `media_asset` | Via `images.py` (site catalog + optional NB scrape) |
| `sync_run` | Yes |

---

## 5. Which fields are stored?

See the visual audit at **`/admin/nightsbridge`** or `GET /api/nightsbridge/audit`.

Room rows also get **catalog enrichment** during sync (`room_catalog.py`): `property_name`, `address`, `configuration`, `bathroom_type` — these are not in the raw NB `rooms[]` payload but are stored on the `room` row.

---

## 6. How often is data synchronized?

| Mechanism | Schedule | Notes |
|-----------|----------|-------|
| Supabase Edge → Railway | Every 10 min | [`trigger-nightsbridge-sync`](../supabase/functions/trigger-nightsbridge-sync/index.ts) |
| Railway worker | On demand | [`services/sync-worker/`](../services/sync-worker/) runs `public/ScriptTestBLGH/main.py` |
| Manual | Any time | `cd public/ScriptTestBLGH && ./run-sync.sh` |

See [`docs/COMPLETION_CHECKLIST.md`](COMPLETION_CHECKLIST.md).

---

## 7. API vs database on the frontend

| UI element | Source |
|------------|--------|
| Room names, config, bath | Database (`room`) |
| Descriptions, occupancy | Database (`room_type`) when `bbrtid` linked |
| Availability badges, rates | Database (`availability_cache`) |
| Images | Database (`media_asset.source_url` from webview scrape) → fallback `data/site-images.ts` |
| Property name/address | Database (`room.property_name`, `room.address`) |

---

## Debug / audit UI

- **Page:** `/admin/nightsbridge` (set `NB_AUDIT_KEY` in env, pass `?key=…`)
- **JSON:** `/api/nightsbridge/audit`

---

## Images

1. Run migration `supabase/migrations/002_nb_extended.sql`
2. After sync: `python images.py` (auto-runs webview scrape after sync in `main.py`)
3. Image URLs only — stored in `media_asset.source_url`, not downloaded

---

## Gaps & recommendations

| Gap | Recommendation |
|-----|----------------|
| No NB images in API | Scrape Web Info webview (`images.py`) or upload URLs to `media_asset` |
| `bbrtid` often null on rooms | Fix NB room-type mode / re-link in dashboard |
| Closeouts not in availability | Extend `_rebuild_availability_cache` |
| Playwright sync host | Dedicated worker + `SYNC_WORKER_URL` |
| PII in `booking`/`guest` | Keep RLS; never expose on public routes |
