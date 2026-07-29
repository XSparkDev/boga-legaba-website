# Boga Legaba Website — Full Explanation (Study & Presentation Notes)

> A plain-English walkthrough of the whole application: every page, what it's for,
> why it exists, how booking works, what runs behind the scenes, and the honest
> weaknesses. Read top to bottom and you'll be able to explain the whole system.

---

## 1. The big picture (say this first)

Boga Legaba is a **guest house + conference centre in Mahikeng** with 3 properties
(Chababa, Interlaken/Lantana, Transnet portfolio) and ~27 rooms. This website does
three jobs:

1. **Show the business** — market the rooms, conference venue, dining, and area.
2. **Take bookings + payments directly** — guests book a room and pay online, so the
   business avoids booking-site commission fees.
3. **Give the owner an admin area** — see bookings, availability, photos, reviews,
   and data, all in one private dashboard.

**How it's built (in simple terms):**
- **Next.js** (a modern website framework) — hosted on **Render**, reachable at
  `bogalegaba.co.za`.
- **Supabase** — the database (stores rooms, bookings, guests, photos), file storage
  (room photos), and now the admin login.
- **NightsBridge** — the hotel's existing booking system ("PMS"). It's the source of
  truth for rooms, prices, and availability. Our site reads from it and creates real
  bookings in it.
- **Paystack** — processes card/EFT payments.
- **Resend** — sends confirmation emails.
- **Google Places** — source of the customer reviews shown on the homepage.

**One-line summary:** *A marketing website with a built-in "book and pay" flow that
plugs into the hotel's existing NightsBridge system, plus a private admin dashboard.*

---

## 2. How the site is organised

There are really **three parts**:

| Part | Who sees it | Purpose |
|------|-------------|---------|
| **Public marketing pages** | Anyone | Sell the property + take bookings |
| **Admin area (`/admin/*`)** | Owner only (password) | Run the business behind the scenes |
| **Behind-the-scenes (APIs + services)** | Nobody directly | The "plumbing" that connects everything |

**First-visit behaviour:** when a brand-new visitor lands on the site, they're sent
to the **Stay** page first (it's the "front door" — that's where bookings start).
After that first visit, the **Home** page works normally again via the logo / Home link.

---

## 3. Public pages — what each one is for

Most public pages are the **same design pattern** — a single-scroll page with a dark
hero image at the top and sections below. Only a few (Stay, Book Now) are different
because they're interactive.

### Home (`/`)
- **Pattern:** Single-scroll parallax page.
- **What it shows:** Hero slideshow, the three properties, "why choose us", customer
  reviews, WhatsApp contact.
- **Why it's there:** The brand story / first impression. Reviews here are pulled from
  Google.

### Stay (`/stay`) — *the most important public page*
- **Pattern:** Live, filterable room browser (not a static page).
- **What it shows:** Every room, with **real-time availability** — the guest picks
  check-in/check-out dates and the page checks NightsBridge to show which rooms are
  free. They can filter by type (twin, double, family…), property, and bathroom.
- **Why it's there:** This is the **front door to booking**. Clicking "Book This Room"
  carries the exact room into the booking page.

### Book Now (`/book-now`) — *the booking page*
- **Pattern:** Single-scroll, but **live-data driven**, with the booking form embedded.
- **What it shows:** One room in detail — a **photo gallery** (real room photos with a
  full-screen viewer), room facts, amenities, live rates, meal-plan options, a
  comparison table of all room types, property info, and the local area guide. The
  **booking form** is embedded here.
- **Why it's there:** This is where the actual reservation + payment happen. (See the
  booking flow in section 4.)

### Conference (`/conference`)
- **Pattern:** Single-scroll brochure page.
- **What / why:** Pitches the conference venue (up to 80 delegates), facilities, AV,
  catering. For corporate/event enquiries.

### Corporate (`/corporate`)
- **Pattern:** Single-scroll brochure page.
- **What / why:** Pitches corporate & **government** accommodation (per-diem stays,
  procurement). A key revenue segment for this business.

### Dining (`/dining`)
- **Pattern:** Single-scroll brochure page.
- **What / why:** Shows the food & bar offering. Has an "interest form" (still being
  built out).

### Attractions (`/attractions`)
- **Pattern:** Single-scroll information page.
- **What / why:** Local area guide — nearby sights, history, directions. Helps guests
  (and SEO for "things to do in Mahikeng").

### Specials (`/specials`)
- **Pattern:** Live promo listing.
- **What / why:** Shows current discounts/offers, pulled live from NightsBridge.

### Gallery (`/gallery`)
- **Pattern:** Filterable photo grid + full-screen lightbox.
- **What / why:** The full visual portfolio of the property. (The room photo gallery on
  the Book Now page reuses this same viewer style.)

### FAQs (`/faqs`)
- **Pattern:** Accordion list.
- **What / why:** Policies and common questions, answered without contacting anyone.

### Contact (`/contact`)
- **Pattern:** Form + info page.
- **What / why:** Enquiry form, phone/WhatsApp/email, and the map/location.

### Register (`/register`)
- **Pattern:** Form page.
- **What / why:** Guest registration form (details captured for a stay).

---

## 4. How a booking actually works (explain this slowly — it's the heart of the app)

This is a **"pay-first"** flow, designed so the guest never waits a long time:

1. **Guest picks a room + dates** on Stay → clicks "Book This Room" → lands on Book Now.
2. **Guest fills the booking form** (name, contact, meal plan, guests) and submits.
3. The site does a **fast live availability check** against NightsBridge (is the room
   still free right now?), and puts a short **"hold"** on it so two people can't grab
   the same room at once.
4. The site **immediately creates a Paystack payment session** and sends the guest
   straight to checkout — they don't wait.
5. **At the same time, in the background,** the site tells the NightsBridge worker to
   create the real reservation (this takes ~1 minute, so it happens behind the scenes).
6. Guest **pays on Paystack** → Paystack confirms back to the site (via a "webhook"
   and a verify step).
7. On successful payment, the site sends the **owner** an email immediately, and sends
   the **guest** a "Payment Confirmed" email once the NightsBridge booking has settled
   (so the email shows the real room details).
8. If the background NightsBridge booking ever fails, the system **self-heals** (a
   sweep retries it) and the admin dashboard shows a "not yet on NightsBridge" flag
   with a Retry button.

**Why pay-first:** NightsBridge booking is slow (~50–90s). Making the guest wait that
long before paying caused drop-offs, so payment now happens first and the reservation
catches up in the background.

**Key safety point:** the room's availability is re-checked live *right before* booking,
so the site can't double-book a room that was just taken.

---

## 5. Admin area — what each page is for

All admin pages require **login** (see the login page). Once logged in, a session
"cookie" keeps the owner signed in for 8 hours.

### Admin login (`/admin/login`)
- **What / why:** The gate. You now log in with **email + password**, checked against
  **Supabase** (see section 7 — this was recently upgraded). Email is pre-filled, so in
  practice you just type the password.

### Admin home (`/admin`)
- **What / why:** A redirect — sends you to the Dashboard if logged in, or to Login if not.

### Dashboard (`/admin/dashboard`)
- **Pattern:** Data console (control-panel layout).
- **What / why:** The command centre. Live stats (room types, rooms available today,
  synced rooms), **charts** (occupancy trend, today's occupancy donut, rates by room
  type), an **availability calendar**, active specials, and tables of the synced rooms
  and cached rates. Quick links out to NightsBridge.

### Bookings (`/admin/bookings`)
- **Pattern:** Record table.
- **What / why:** Search, view, and manage real bookings — including manually retrying a
  booking that didn't reach NightsBridge.

### Registrations (`/admin/registrations`)
- **Pattern:** Record list.
- **What / why:** The submitted guest registration forms.

### Room Photos (`/admin/rooms`)
- **Pattern:** Photo manager (upload tool).
- **What / why:** Upload, order, and title the **real photos per physical room**. These
  are what power the room photo gallery on the Book Now page and the photos on Stay.
  *(Note: only some rooms have photos uploaded so far — the rest fall back to the
  generic NightsBridge image.)*

### Reviews (`/admin/reviews`)
- **Pattern:** Manual sync panel.
- **What / why:** Click a button to pull the latest **Google reviews**, which then show
  on the Home page. It only syncs when clicked — never automatically.

### NightsBridge Audit (`/admin/nightsbridge`)
- **Pattern:** Diagnostics panel.
- **What / why:** A technical audit of the NightsBridge data (sync status, snapshots).
  ⚠️ This page uses a **different, weaker** access method than the rest of admin (see
  Weaknesses).

---

## 6. Behind the scenes — the external services

These are the outside systems the website talks to. Explaining these shows you
understand the "plumbing."

| Service | What it does for us | Notes |
|---------|--------------------|-------|
| **NightsBridge** (booking system, ID 21091) | Source of truth for rooms, prices, availability; where real bookings are created | A separate **worker on Render** does the actual booking automation |
| **Supabase** | Database (bookings, guests, rooms, rates), file storage (room photos), and now admin login | ~28 tables |
| **Paystack** | Card/EFT payment processing | Now using **LIVE** keys (real money) |
| **Resend** | Sends confirmation emails (to owner + guest) | |
| **Google Places** | Source of the reviews on the Home page | Pulled manually from the admin Reviews page |

**Important flow to understand:** the website is the "middle-man." Guests interact with
*our* site; our site quietly talks to NightsBridge (rooms/booking), Paystack (payment),
and Resend (email) on their behalf. NightsBridge stays the master record — we never
replace it, we sync with it (roughly every 5 minutes).

---

## 7. The database (Supabase) — in plain terms

The database stores everything the site needs. The main groups of tables:

- **Rooms & rates:** `room`, `room_type`, `rate_cache`, `availability_cache` — the
  catalogue of rooms and their live-ish prices/availability (kept in sync with NightsBridge).
- **Bookings:** `booking`, `booking_job`, `booking_room_stay`, `booking_status_history`,
  `booking_hold`, etc. — every reservation and its progress through the system.
- **Guests:** `guest`, `guest_registration` — guest details.
- **Payments:** `transactions` — the payment records.
- **Content:** `room_images`, `site_images`, `media_asset` — photos. `google_reviews` —
  the reviews.
- **Enquiries:** `enquiry` — contact/enquiry form submissions.

**Security of the database (important):** Every table has **Row-Level Security** turned
on. The "public" key that the website uses in the browser can **only read display data**
(rooms, prices, photos, reviews). It **cannot** read bookings, guests, or payments.
Anything sensitive is only reachable by the server using a private key. *(This is a
strong point — say it with confidence.)*

**Admin login (recently upgraded):** The admin password used to sit in a settings file
as plain text. It's now stored **inside Supabase**, hashed (scrambled) — the way real
login systems work. You log in with `admin@bogalegaba.co.za` + the password. To change
the password in future: Supabase → Authentication → Users → that user → reset password.
No developer needed.

---

## 8. Recent work done (so you can speak to "what's new")

**Already live** (pushed to the site):
- Fixed text glitch where apostrophes showed as blank spaces (a NightsBridge encoding issue).
- Restyled the **payment success page** and **admin dashboard** to match the brand
  (colours, fonts, charts) + a success toast after paying.
- Added the **real room-photo gallery** on the Book Now page (with NightsBridge image
  as fallback for rooms without photos).
- Made **Stay** the first page new visitors see, while keeping Home reachable.
- Small hero-image polish on Stay.

**Done but NOT yet pushed** (still local, waiting for the go-ahead):
- **Admin login moved to Supabase** (email + password).
- **Booking references made random/unguessable** (a security fix — see Weaknesses #2).

---

## 9. Weaknesses & risks (be honest — this builds trust)

No system is perfect. Here's the honest list, with status:

1. **Two secrets were shown in a private work session** (the Paystack live key and the
   old admin password).
   - **Risk:** low/bounded — only in a private chat, not public on the internet.
   - **Fix:** rotate them in the Paystack dashboard (and the old admin password is
     already unused now that login moved to Supabase). **Deferred by owner for now.**

2. **Booking status link used to be guessable.** The link that checks a booking's status
   used a predictable reference (a timestamp), so in theory someone could guess others'
   references and see a guest's name, email, dates, and payment link.
   - **Status: FIXED** (references are now random + unguessable). *(Local, not pushed yet.)*

3. **Payment amount is trusted from the browser.** A technical person could pay *less*
   than the real price for **their own** booking.
   - **Risk:** medium — but it's caught later when the real NightsBridge booking + payment
     are reconciled. It's in the "money path", so it needs a careful fix.
   - **Status: deferred** (recommended to fix carefully, on its own, later).

4. **The NightsBridge audit page uses a weaker login** than the rest of admin (a URL key,
   and it skips login in development).
   - **Risk:** low in production.
   - **Status: to be handled by the mentor.**

**Strengths to balance it (say these too):**
- No secrets stored in the code or on GitHub.
- Database fully locked down (Row-Level Security on every table).
- The powerful "master key" never reaches the browser.
- All admin and sensitive pages require login.
- Admin password now managed properly by Supabase.

---

## 10. Quick cheat-sheet (if someone asks…)

- **"What is this site?"** → A marketing website + direct booking/payment system for a
  Mahikeng guest house, connected to their NightsBridge booking system.
- **"Where do bookings live?"** → NightsBridge is the master; our site creates the
  booking there and stores a copy in Supabase.
- **"How do people pay?"** → Paystack (card/EFT), pay-first so they don't wait.
- **"Is guest data safe?"** → Yes — the database blocks public access to bookings/guests;
  only the server can read them.
- **"How does the owner manage it?"** → The `/admin` dashboard (bookings, photos,
  reviews, availability) behind a Supabase login.
- **"Any known issues?"** → See section 9 — mainly: rotate the exposed keys, and tighten
  the payment-amount check. The guessable-booking-link issue is already fixed.

---

*This document is study notes only — it does not change how the application works.*
