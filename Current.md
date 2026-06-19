# Current.md — Boga Legaba Website: Live Status

> **Last updated:** Friday, 19 June 2026 · 16:45 SAST
> **Dev server:** `npm run dev` → `http://localhost:3000`
> **NightsBridge property ID (bbid):** `21091`
> **Supabase project:** `tserpdstcpcdivujpswq.supabase.co`

---

## ✅ What Was Done Last Session

### Book-Now Flow — End-to-End Room Linking (FIXED ✨)

Three root bugs were identified and fixed:

**Bug 1 — Dates not passed without searching**  
`stay-rooms.tsx` was only forwarding `checkIn`/`checkOut` to `RoomCard` when `availability.searched` was true. If the user hadn't clicked "Search", the book-now URL had no `from`/`to` params and showed "No dates selected".  
**Fix:** Always pass the current date-picker values (`checkIn`/`checkOut` state) to `RoomCard`.

**Bug 2 — Wrong room type name in URL**  
`room-card.tsx` fell back to `room.name` ("Flutes") when `synced.roomTypeName` was null. On the book-now page, `findSelectedRate("Flutes", ...)` couldn't match any NightsBridge room type name like "Double Room (Bath)".  
**Fix:** Added `bbrtid` (NightsBridge room type ID) to the URL. The book-now page now does a **direct `estData.roomTypes.get(bbrtid)` lookup** before any fuzzy matching, resolving the correct NB room type even when `roomTypeName` is wrong.

**Bug 3 — URL format didn't match user expectation**  
Old format: `/book-now?room=Flutes&property=Chababa&from=...&bbroomid=3&bbid=21091&roomTypeName=...`  
New format: `/book-now?roomTypeName=Double%20Room%20(Bath)&from=2026-06-23&to=2026-06-25&bbid=21091&bbrtid=123&bbroomid=3`  
**Fix:** Rewrote `buildBookHref()` in `room-card.tsx` to put `roomTypeName`, `from`, `to`, `bbid` first, then optional `bbrtid`, `bbroomid`.

**New features added:**
- **Full photo gallery** on the book-now page — all images for the room type scraped from NightsBridge establishment API (not just 1 hero image)
- **No-dates view now shows room detail** — when a user lands without dates, the room's description, facts, amenities, and all images from NightsBridge are shown along with a "Choose dates →" prompt
- **Reusable `RoomFactsBlock` + `RoomAmenitiesBlock`** components for the facts grid and amenities (used in both normal and fallback views)
- **Better metadata** — page title now uses `roomTypeName` param first

**Files changed:**
| File | Change |
|------|--------|
| `components/stay/stay-rooms.tsx` | Always pass `checkIn`/`checkOut` to `RoomCard` |
| `components/room-card.tsx` | `buildBookHref()` with `bbrtid`, cleaner URL format |
| `app/(main)/book-now/page.tsx` | `bbrtid` param, direct establishment lookup, full gallery, better no-dates view |

---

### Session highlights — June 19 2026

#### Transaction scraper (NEW ✨)
- **`services/nightsbridge-sync/get_transactions.py`** — Playwright script that logs into NightsBridge, navigates to `/dashboard/payments/transactions`, parses the Angular `nb-table-row` component rows, and upserts 62 real transactions into Supabase.
- Successfully scraped **62 real payment transactions** from the current month including Pay ID, date, gateway (paybridgevcaps, travelit, caps), guest name, booking ref, arrival date, amount, and status (Paid / Pending).
- **`supabase/migrations/005_transactions.sql`** — New `transactions` table with `pay_id` as unique key, proper indexes, and service-role-only RLS.

Run manually:
```bash
cd services/nightsbridge-sync
HEADLESS=true .venv/bin/python get_transactions.py
```

#### Admin dashboard — Transactions section added
- **Summary stat** card now shows scraped transaction count.
- **Section 6 — Payment Transactions** added to admin dashboard:
  - Revenue summary bar: Paid total | Pending total | Grand total
  - Full transactions table with Pay ID, date, guest name, booking ref (linked to NightsBridge), gateway, amount, status badge
  - **"Sync from NightsBridge"** button triggers `get_transactions.py` via `/api/admin/sync-transactions` API route, auto-refreshes page.
- **`app/api/admin/sync-transactions/route.ts`** — POST endpoint (admin-auth protected) that runs the Python scraper server-side.
- **`components/admin/sync-transactions-button.tsx`** — Client component with loading spinner, success/error states.

#### Bookings scraper — fixed (get_bookings.py)
- Fixed two bugs: redundant `page.goto()` after login that timed out, and the BridgeIt direct `fetch()` API call approach (returns empty bodies when called from browser context).
- New approach: intercept API calls the NightsBridge calendar page fires naturally, using response listener on a separate calendar tab.
- **Known limitation**: The NightsBridge calendar Angular app does not fire API calls automatically in headless mode (SPA only makes calls on user interaction). The `get_transactions.py` scraper is the preferred method for getting financial data.

### 1.1 — Room card deep-link fix (carried over)
- `components/room-card.tsx` — "Book This Room" includes `roomTypeName` (NB `rtname`) as first query param.
- Booking detail page uses `roomTypeName` to match and highlight the correct NightsBridge room type.

### 1.2 — Admin area (carried over)
| File | Purpose |
|------|---------|
| `app/(main)/admin/page.tsx` | Entry — redirects to login or dashboard |
| `app/(main)/admin/login/page.tsx` | Dark branded login form |
| `app/(main)/admin/dashboard/page.tsx` | Full server-rendered dashboard |
| `app/api/admin/auth/route.ts` | POST (login) / DELETE (logout) API |
| `middleware.ts` | Protects `/admin/dashboard/*` via `bl_admin_session` cookie |

**Dashboard sections (all live data):**
- Summary stats: room types, available today, Supabase rooms, **transaction count**
- Property overview: room type images, check-in/out, Wi-Fi, parking, grading, amenities
- 30-day occupancy calendar (green/amber/red grid)
- Active NightsBridge specials
- Supabase data tables (rooms + rate cache)
- **Payment transactions table with revenue totals** ← NEW
- 7-day detailed availability per room type with rates
- NightsBridge quick-access links

**Admin credentials (in `.env.local`):**
```
ADMIN_PASSWORD=bogalegaba2026
ADMIN_SECRET=bl-admin-jwt-secret-2026
```
> Change `ADMIN_PASSWORD` to something secure before going live.

### 1.3 — Deeper scraping (carried over)
| File | What was added |
|------|---------------|
| `lib/nightsbridge-api.ts` | `fetchSpecials()`, `fetchOccupancyCalendar()`, `EstablishmentData` with `attractions`, `directions`, `address`, `lat/lng` |
| `app/(main)/specials/page.tsx` | Live NightsBridge specials |
| `app/(main)/attractions/page.tsx` | Live area info + directions |
| `app/(main)/book-now/page.tsx` | Explore Mafikeng section |

---

## 🔄 What Needs To Be Done Next

### HIGH PRIORITY

- [ ] **Run SQL migration 005** in Supabase SQL Editor:
  ```sql
  -- Paste contents of supabase/migrations/005_transactions.sql
  ```
- [ ] **Run the full SQL stack** in Supabase SQL Editor (all 5 migration files — see `supabase/migrations/`)
- [ ] **Change `ADMIN_PASSWORD`** in `.env.local` to something secure before deploying
- [ ] **Test admin dashboard** at `http://localhost:3000/admin` (password: `bogalegaba2026`)
- [ ] **Click "Sync from NightsBridge"** on the transactions section of the admin dashboard to populate the `transactions` table

### MEDIUM PRIORITY

- [ ] **Edge function** (`supabase/functions/trigger-nightsbridge-sync`) — skipped for now, revisit
- [ ] **Sync worker** (Railway/VPS) — `services/sync-worker/` ready with Dockerfile, `railway.json`

### SCRAPING / DATA

- [ ] **TripAdvisor reviews** — keep current link badge; or use official iFrame (requires TA account)
- [ ] **Room images from Supabase `media_asset`** — sync script should populate; currently images come from NB establishment API
- [ ] **Cache admin dashboard data** — currently 4+ live NB API calls per load; add Redis or Supabase caching if slow
- [ ] **`get_bookings.py`** — Currently limited by NB calendar SPA not firing API calls in headless mode. Alternative approach: use `get_transactions.py` booking refs to call individual booking detail pages for full guest data.

### UX / BOOKING FLOW

- [ ] **Admin bookings view** — after transactions are synced, cross-reference with `bookings` table for arrivals, outstanding balances
- [ ] **Book-now page: rate caching** — add background upsert in `app/api/nightsbridge/rates/route.ts`
- [ ] **Stay page: live availability dots** — green/red dot on room cards

---

## 📁 Key Files Reference

```
app/
  (main)/
    admin/
      page.tsx              ← redirects to login/dashboard
      login/page.tsx        ← admin login form
      dashboard/page.tsx    ← full admin dashboard (9 sections)
    book-now/page.tsx       ← booking detail page (Booking.com style)
    specials/page.tsx       ← live NB specials + static
    attractions/page.tsx    ← live NB area info + static

  api/
    admin/
      auth/route.ts                  ← login/logout API
      sync-transactions/route.ts     ← triggers get_transactions.py
    nightsbridge/rates/route.ts      ← live rates from NB APIs

components/
  room-card.tsx                      ← "Book This Room" with roomTypeName
  admin/
    sync-transactions-button.tsx     ← client sync button with spinner

lib/
  nightsbridge-api.ts                ← all NB API calls
  supabase/admin.ts                  ← service-role Supabase client

middleware.ts                        ← admin auth guard + redirects

services/
  nightsbridge-sync/
    get_transactions.py   ← transactions scraper ★ NEW ★
    get_bookings.py       ← bookings scraper (partially working)
    auth.py               ← NB login helper
    config.py             ← NB API config

supabase/
  schema.sql
  migrations/
    002_nb_extended.sql
    003_rate_cache.sql
    004_bookings.sql
    005_transactions.sql  ← NEW ★
```

---

## 🔑 Credentials & Config

| Key | Value | Where |
|-----|-------|-------|
| NightsBridge bbid | `21091` | everywhere |
| NightsBridge login | `21091` / `4609` | `.env.local` → `SITE_USER` / `SITE_PASS` |
| Admin password | `bogalegaba2026` | `.env.local` → `ADMIN_PASSWORD` |
| Admin URL | `/admin` | browser |
| Supabase project | `tserpdstcpcdivujpswq` | `.env.local` |
| WhatsApp number | `+27 82 875 7018` | `data/rooms.ts` |

---

## 🧱 Architecture Overview

```
Guest browser
  └─▶ Next.js (localhost:3000 / Vercel)
        ├─▶ NightsBridge public APIs (no auth needed)
        │     ├─ /bridge/api/5.0/availgrid          ← availability + rates
        │     ├─ /bridge/api/5.0/availability/21091 ← meal plan rates, policies
        │     ├─ /bridge/api/5.0/establishment/21091 ← property + room details
        │     └─ /bridge/api/5.0/specials/21091     ← promotions
        └─▶ Supabase (PostgreSQL + RLS)
              ├─ room / room_type / availability_cache  ← synced by Python
              ├─ rate_cache                             ← written by /api/nightsbridge/rates
              ├─ bookings                              ← written by get_bookings.py
              └─ transactions ★                        ← written by get_transactions.py

Admin browser (/admin)
  └─▶ Next.js admin dashboard (9 sections)
        ├─ NightsBridge APIs (+ occupancy, specials, establishment)
        ├─ Supabase (service role — full access incl. transactions)
        └─ "Sync" button → /api/admin/sync-transactions → get_transactions.py

Python sync scripts (local / Railway)
  └─▶ Playwright browser → NightsBridge (login) → scrape → Supabase upsert
```
