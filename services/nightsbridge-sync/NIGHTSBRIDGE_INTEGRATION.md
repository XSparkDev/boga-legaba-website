# NightsBridge Data Integration — Discovery & Live-Sync Design

**Property:** Boga Legaba Guest House & Conference Centre (`bbid` 21091)
**Prepared:** 2026-06-18
**Status:** Working proof-of-concept + design for a continuously-synced local database.

> **Purpose & scope.** This documents how the guesthouse's *own* booking data
> can be read out of its NightsBridge account programmatically, as a **fallback
> bridge** for when an official NightsBridge API integration is not available.
> All data described here belongs to the guesthouse, which already holds it as
> the responsible party. This is a private, authorised automation of the
> property's own account — not third-party scraping.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [How NightsBridge is built (discovery)](#2-how-nightsbridge-is-built-discovery)
3. [Authentication flow](#3-authentication-flow)
4. [The `bridgeitapi` interface](#4-the-bridgeitapi-interface)
5. [Data model: what `BookingCalendarRQ` returns](#5-data-model-what-bookingcalendarrq-returns)
6. [Inventory of personal data collected](#6-inventory-of-personal-data-collected)
7. [Live-sync architecture](#7-live-sync-architecture)
8. [Proposed database schema](#8-proposed-database-schema)
9. [Sync algorithm](#9-sync-algorithm)
10. [Operational concerns](#10-operational-concerns)
11. [Risks, limitations & compliance](#11-risks-limitations--compliance)
12. [Roadmap](#12-roadmap)

---

## 1. Executive summary

NightsBridge's booking calendar is a JavaScript (Angular) web app. There is no
public HTML to scrape; instead the app talks to a **private JSON endpoint**,
`bridgeitapi`. By logging in with the property's normal credentials and then
calling that endpoint the way the calendar does, we can pull **complete,
structured booking data** — guests, dates, rooms, rates and status — without
parsing any visual grid.

A working scraper already does this (`main.py` in this project). It currently
exports to JSON/CSV. This document describes how to evolve it into a service
that keeps a **local database continuously in step** with NightsBridge.

**Key facts discovered**

| Item | Value |
|------|-------|
| Login page | `https://login.nightsbridge.com/` (Angular SPA) |
| Dashboard | `https://www.nightsbridge.com/dashboard/home` |
| Calendar app | `https://calendar.nightsbridge.com/` |
| Data API | `https://bridgeit.nightsbridge.com/bridgeitapi` (POST, form-encoded) |
| Auth token | a 96-char hex `loginkey`; obtained via the dashboard then refreshed by `BootstrapRQ` |
| Response shape | `{"success": bool, "data": { ... }}` |
| Booking source message | `BookingCalendarRQ` (date-range query) |
| Change-feed message | `bookingnotificationsrq` (10 most recent bookings) |

---

## 2. How NightsBridge is built (discovery)

- **`login.nightsbridge.com`** serves an Angular single-page app. The static
  HTML contains only `runtime/polyfills/main.<hash>.js` bundles; the login form
  is rendered client-side. The username/password inputs have **random GUID
  `id`s that change on every page load**, so elements must be selected by type
  (`input[type=text]`, `input[type=password]`) and the `button.btn-primary`
  ("Login").
- After login the browser lands on **`www.nightsbridge.com/dashboard/home`**, a
  launcher page. Bookings are **not** here — they live in the separate
  **Calendar** app (`calendar.nightsbridge.com`), reachable via a "Go to
  Calendar" link whose URL embeds a `loginkey` token.
- The calendar renders bookings as positioned DOM elements (no `<canvas>`), but
  it populates them by calling **`bridgeit.nightsbridge.com/bridgeitapi`**. That
  API — not the DOM — is the clean data source.

```
login.nightsbridge.com  ──login──►  www.nightsbridge.com/dashboard/home
                                            │  ("Go to Calendar" link → loginkey)
                                            ▼
                                  calendar.nightsbridge.com  ──XHR──►  bridgeit.nightsbridge.com/bridgeitapi
```

---

## 3. Authentication flow

The `bridgeitapi` is **stateless per call** — every request carries a
`credentials.loginkey`. Cookies from the website login are *not* what authorise
the API; the `loginkey` is. The flow:

1. **Web login.** Drive the Angular login form with the property's credentials.
   This establishes a browser session and lands on the dashboard.
2. **Read the dashboard `loginkey`.** It is embedded in the "Go to Calendar"
   link: `https://calendar.nightsbridge.com/loginkey/<96-hex-chars>`.
3. **`BootstrapRQ`.** POST this message with the dashboard `loginkey`. The
   response's `data.loginkey` is a **session loginkey** used for all subsequent
   data messages. (It also returns config such as `vatRate`, `statusCodes`,
   feature flags.)
4. **Data calls.** Use the session `loginkey` for `BookingCalendarRQ`, etc.

> **Session lifetime.** The login session expires within roughly a day. When it
> does, the dashboard may still *render* the "Go to Calendar" link, but its
> `loginkey` is dead and the API answers **HTTP 200 with an empty body**. The
> scraper treats an empty/non-JSON body as `SessionExpired`, discards the saved
> session, and logs in again automatically. A live service must do the same.

---

## 4. The `bridgeitapi` interface

- **URL:** `https://bridgeit.nightsbridge.com/bridgeitapi`
- **Method:** `POST`
- **Body:** form-encoded with a single field `data`, whose value is a
  **URL-encoded JSON string**:

  ```
  data=%7B%22messagename%22%3A%22BookingCalendarRQ%22%2C ... %7D
  ```

  Decoded:

  ```json
  {
    "messagename": "BookingCalendarRQ",
    "credentials": { "loginkey": "<session-loginkey>" },
    "startdate": "2026-06-18",
    "enddate": "2026-08-17",
    "countryLocationId": 179
  }
  ```

- **Response envelope:** `{"success": true|false, "data": { ... }}`.
  - `success: false` → application error (inspect the body).
  - **Empty body** → expired `loginkey` (re-authenticate).

### Messages observed

| Message | Purpose | Notable response keys |
|---------|---------|-----------------------|
| `BootstrapRQ` | Exchange dashboard loginkey for a session loginkey + config | `loginkey`, `statusCodes`, `vatRate`, `runReports`, feature flags |
| `BookingCalendarRQ` | All bookings/availability for a date range | `bb`, `rooms`, `roomtypes`, `roomtypemode`, `closeouts`, `bookings`, `events` |
| `bookingnotificationsrq` | The **10 most recent** bookings (a change feed) | `notifications[]` |
| `DoubleBookingsRQ` | Conflicting/overlapping bookings | `doublebookings[]` |
| `PaymentTapFeatureStatusRQ` | Payment-feature status for the property | `paymentTap*` flags |

> Other messages almost certainly exist (invoices, reports, guest history,
> rates). They can be discovered the same way with `explore_api.py`, which logs
> every `bridgeitapi` call the live app makes.

---

## 5. Data model: what `BookingCalendarRQ` returns

`data` contains:

| Key | Type | Meaning |
|-----|------|---------|
| `bb` | object | Property: `{ bbid, bbname }` |
| `rooms` | array | Physical rooms: `roomname`, `bbroomid`, `bbrtid` (room-type id), `orderby` |
| `roomtypes` | object (keyed by `bbrtid`) | Room-type definitions (see below) |
| `roomtypemode` | bool | Whether the calendar is in room-type mode |
| `bookings` | array | **The reservations** (see below) |
| `closeouts` | array | Availability blocks / closed dates (empty in sample) |
| `events` | array | Calendar events/notes (empty in sample) |

**Room type** (`roomtypes["<bbrtid>"]`): `rtname`, `rtdesc`, `maxadults`,
`maxoccupancy`, `roomqty`, `privatebathroom`, `roomsizesqm`, `defaultmealplanid`,
`ratescheme`, `otaroomtypecode`, `childflag1/2`, `appliesto`, `roomquality`,
`orderby`.

**Booking** (one element of `bookings[]`):

| Field | Meaning |
|-------|---------|
| `bookingid` | Internal booking id (e.g. `119594721`) — stable primary key |
| `bbbookingid` | Human-facing booking reference (e.g. `14448`) |
| `status` | Status letter (see codes below) |
| `bookingtype` | `P`, `N`, etc. (provisional / normal …) |
| `source` | Booking source/channel (e.g. an OTA or agent) |
| `bookingdate` | When the booking was made (`YYYY-MM-DD HH:MM:SS`) |
| `fromdate` / `todate` | Stay start / end (`YYYY-MM-DD`) |
| `madeby`, `madebytext`, `madebyemail`, `madebyphoneno` | Who placed the booking |
| `notes` | Free text — **may contain deposit/payment instructions** |
| `rooms[]` | One entry per room occupied — the *room-stays* (see below) |

**Room-stay** (one element of a booking's `rooms[]`):

| Field | Meaning |
|-------|---------|
| `bbroomid` | Which physical room (join to `rooms[]` → `roomname`) |
| `bbrtid` | Room-type id |
| `firstname`, `surname`, `title` | Guest name |
| `email`, `phoneno` | Guest contact |
| `company` | Guest's company/organisation |
| `noadults`, `child1`, `child2` | Occupancy |
| `avgrate` | Average nightly rate |
| `checkedin`, `checkedout` | Status booleans |
| `guestid`, `bbguestid`, `clientid`, `client2id`, `bbaccountid`, `bbrateid` | Internal ids |

**Status codes** (from `BootstrapRQ`):

| Code | Meaning |
|------|---------|
| `C` | Confirmed |
| `W` | Waiting for Deposit |
| `P` | Provisional |
| `R` | Reserved with Auto-Expire |
| `S` | Paid |
| `O` | Outstanding Account |
| `U` | Unavailable |

**`bookingnotificationsrq`** returns the latest bookings as a lightweight feed —
ideal for cheap "what changed?" polling:

```json
{ "clientname": "Mr A. Example", "bookingdate": "2026-06-17 15:11:10",
  "allocatedrooms": "Reeds", "bookingid": 120038954, "fromdate": "2026-06-28" }
```

---

## 6. Inventory of personal data collected

Pulling bookings necessarily collects **personal information about guests**.
This is the guesthouse's own customer data, but it is still personal data and
must be handled accordingly (see §11). What a sync captures, per booking/stay:

**Guest (data subject)**
- Full name (`title`, `firstname`, `surname`)
- Email address (`email`)
- Phone number (`phoneno`)
- Company / organisation (`company`)
- Occupancy details (adults, children counts)
- Stay dates, room allocated, check-in/out status
- Average rate paid (`avgrate`) → financial information
- NightsBridge identifiers (`guestid`, `bbguestid`, `clientid`)

**Booker (may differ from guest — e.g. a travel agent)**
- Name (`madebytext`), email (`madebyemail`), phone (`madebyphoneno`)

**Free-text `notes`**
- Operational notes that **can include sensitive content** such as deposit
  handling and payment-gateway instructions (PayBridge references were observed
  in live data). Treat `notes` as potentially containing financial/sensitive
  detail.

> Real exported samples live in `output/` (git-ignored). They contain genuine
> guest PII — secure or delete them when not needed (`rm output/*`).

---

## 7. Live-sync architecture

NightsBridge offers **no webhooks** through this interface, so a live mirror is
**poll-based**:

```
        ┌────────────────────────────────────────────────────────────┐
        │                     Sync service (yours)                     │
        │                                                              │
  cron  │  1. ensure NightsBridge session (login / reuse / refresh)    │
  ────► │  2. bookingnotificationsrq  → cheap "anything new?" check     │
        │  3. BookingCalendarRQ(window) → full state for a date window  │
        │  4. diff vs DB → upsert + detect cancellations                │
        │  5. write change log + sync-run record                        │
        └───────────────┬───────────────────────────┬──────────────────┘
                        │                           │
                        ▼                           ▼
                 NightsBridge API              Your database
              (bridgeitapi)                 (Postgres / SQLite)
```

**Two-tier polling** keeps it light:

- **Frequent, cheap tick (e.g. every 5–15 min):** call `bookingnotificationsrq`.
  If the newest `bookingid`/`bookingdate` differs from what's stored, trigger a
  full window sync. Otherwise do nothing.
- **Full window sync (on change, plus a periodic safety net, e.g. hourly):**
  call `BookingCalendarRQ` over a rolling window (e.g. `today-7d` …
  `today+365d`) and reconcile the DB to it. The window is what lets you detect
  **edits and cancellations**, which the notifications feed alone won't show.

---

## 8. Proposed database schema

PostgreSQL flavour (SQLite works with minor type changes). Designed for upserts
and an audit trail.

```sql
-- Reference data ----------------------------------------------------------
CREATE TABLE property (
    bbid          INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE room_type (
    bbrtid        INTEGER PRIMARY KEY,
    name          TEXT,
    description   TEXT,
    max_adults    INTEGER,
    max_occupancy INTEGER,
    room_qty      INTEGER,
    raw           JSONB
);

CREATE TABLE room (
    bbroomid      INTEGER PRIMARY KEY,
    bbid          INTEGER REFERENCES property(bbid),
    bbrtid        INTEGER REFERENCES room_type(bbrtid),
    name          TEXT,
    order_by      INTEGER
);

-- Guests (deduplicated) ---------------------------------------------------
CREATE TABLE guest (
    guestid       BIGINT PRIMARY KEY,        -- NightsBridge guest id
    bbguestid     BIGINT,
    title         TEXT,
    first_name    TEXT,
    surname       TEXT,
    email         TEXT,
    phone         TEXT,
    company       TEXT,
    first_seen    TIMESTAMPTZ DEFAULT now(),
    last_seen     TIMESTAMPTZ DEFAULT now()
);

-- Bookings ----------------------------------------------------------------
CREATE TABLE booking (
    bookingid     BIGINT PRIMARY KEY,        -- internal id, stable
    booking_ref   INTEGER,                   -- bbbookingid (human-facing)
    status        CHAR(1),
    status_text   TEXT,
    booking_type  TEXT,
    source        TEXT,
    booked_on     TIMESTAMPTZ,
    from_date     DATE,
    to_date       DATE,
    made_by       TEXT,
    made_by_email TEXT,
    made_by_phone TEXT,
    notes         TEXT,
    is_cancelled  BOOLEAN DEFAULT false,     -- set when it vanishes from window
    raw           JSONB,                     -- full original payload
    first_seen    TIMESTAMPTZ DEFAULT now(),
    last_synced   TIMESTAMPTZ DEFAULT now()
);

-- One row per room occupied by a booking ----------------------------------
CREATE TABLE booking_room_stay (
    bookingid     BIGINT REFERENCES booking(bookingid) ON DELETE CASCADE,
    bbroomid      INTEGER REFERENCES room(bbroomid),
    guestid       BIGINT REFERENCES guest(guestid),
    adults        INTEGER,
    children_1    INTEGER,
    children_2    INTEGER,
    avg_rate      NUMERIC(12,2),
    checked_in    BOOLEAN,
    checked_out   BOOLEAN,
    PRIMARY KEY (bookingid, bbroomid)
);

-- Audit / observability ---------------------------------------------------
CREATE TABLE booking_change_log (
    id            BIGSERIAL PRIMARY KEY,
    bookingid     BIGINT,
    change_type   TEXT,        -- 'insert' | 'update' | 'cancel'
    diff          JSONB,       -- changed fields old→new
    changed_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sync_run (
    id            BIGSERIAL PRIMARY KEY,
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    window_from   DATE,
    window_to     DATE,
    bookings_seen INTEGER,
    inserted      INTEGER,
    updated       INTEGER,
    cancelled     INTEGER,
    ok            BOOLEAN,
    error         TEXT
);
```

Storing the full `raw` JSON per booking future-proofs you against fields we
haven't modelled and lets you re-derive columns without re-scraping.

---

## 9. Sync algorithm

```text
function full_window_sync(start, end):
    run = open sync_run(start, end)
    data = BookingCalendarRQ(session_loginkey, start, end)

    upsert property(data.bb)
    upsert room_type[*], room[*]              # reference data

    seen_ids = {}
    for b in data.bookings:
        seen_ids.add(b.bookingid)
        for stay in b.rooms:
            upsert guest(stay)                # dedupe on guestid, refresh last_seen
        diff = compare(db.booking[b.bookingid], b)
        if new:        insert booking + stays;  log 'insert'
        elif changed:  update booking + stays;  log 'update' with diff
        set booking.last_synced = now()

    # Cancellation / deletion detection within the window:
    for db_booking in db.bookings where from_date<=end and to_date>=start
                                     and not is_cancelled:
        if db_booking.bookingid not in seen_ids:
            mark is_cancelled = true;  log 'cancel'

    close sync_run(counts, ok=true)
```

Key points:

- **Idempotent upserts** keyed on `bookingid` (and `(bookingid, bbroomid)` for
  stays) — safe to re-run any time.
- **Cancellations** are inferred: a booking previously seen in a window that is
  no longer returned for that window is marked cancelled (not hard-deleted, so
  history is preserved).
- **Change log** captures field-level diffs for auditing and for downstream
  triggers (e.g. "notify housekeeping when a booking is confirmed").
- **Cheap tick** uses `bookingnotificationsrq`; only escalate to a full window
  sync when the newest booking id/date changes — keeps API load minimal.

---

## 10. Operational concerns

- **Secrets:** credentials only in `.env` / a secrets manager — never in code or
  the DB. The repo already git-ignores `.env` and `storage_state.json`.
- **Session handling:** persist `storage_state.json`; reuse it; auto-refresh on
  the empty-body `SessionExpired` signal. Don't log in every tick.
- **Rate limiting / politeness:** one property, low frequency. Keep the cheap
  tick ≥ ~5 min and full syncs hourly-ish. Add jitter; back off on errors.
- **Resilience:** wrap each run in try/except; record failures in `sync_run`;
  alert after N consecutive failures (often means a layout/API change or a
  password change).
- **Scheduling:** cron, a systemd timer, or a small long-running scheduler
  (APScheduler). Must run on a machine that's online — not inside Claude.
- **Time zones:** store timestamps as UTC; the property operates in SAST
  (UTC+2). Convert on read.
- **Monitoring:** dashboard off `sync_run` (last success, counts, error rate).

---

## 11. Risks, limitations & compliance

**This is an unofficial interface.**
- `bridgeitapi` is private. Field names, message names, the `loginkey` scheme,
  or `countryLocationId` can change without notice and **break the sync**. Build
  for graceful failure and keep `explore_api.py` to re-discover changes.
- Automated login can be affected if NightsBridge adds 2FA, CAPTCHA, or
  anti-automation. Plan for a manual re-auth path.
- **Check the NightsBridge Terms of Service** for this account. Even for your
  own data, confirm automated access is permitted, and prefer an official route
  if one exists (see Roadmap).

**Data protection (POPIA — South Africa).**
- The guesthouse is the **responsible party** for this guest data; copying it to
  a local DB does not reduce that responsibility — it increases your custody of
  it.
- Apply: a lawful basis & purpose limitation, **access control & encryption at
  rest** for the DB, retention limits (don't keep PII longer than needed),
  secure deletion of `output/` exports, and breach-handling readiness.
- Treat `notes`, `email`, `phone`, and `avgrate` as sensitive.

**Reliability.**
- Poll-based, so there's inherent lag (minutes) and no guaranteed delivery —
  the periodic full-window safety-net sync is what guarantees eventual
  consistency.

---

## 12. Roadmap

1. **Pursue the official path first.** NightsBridge has partner/channel
   integrations; an official API, iCal feed, or channel-manager connection is
   more stable than this and should be the long-term answer. Use this bridge as
   the fallback the brief calls for.
2. **Phase 1 (done):** authenticated read of `BookingCalendarRQ` → JSON/CSV
   (`main.py`).
3. **Phase 2:** add a database layer (schema in §8) + the sync algorithm (§9),
   starting with SQLite, upserting by `bookingid`.
4. **Phase 3:** add the two-tier scheduler + `sync_run`/`change_log` + alerting.
5. **Phase 4:** map additional messages (invoices, occupancy/revenue reports,
   guest history) via `explore_api.py` and extend the schema.
6. **Phase 5:** expose your own clean internal API / dashboard on top of the
   mirrored DB for the rest of the business to consume.

---

*Generated from a working proof-of-concept in this repository. See
`README.md` for how to run the current scraper, and `explore_api.py` to
re-capture the live API messages if NightsBridge changes.*
