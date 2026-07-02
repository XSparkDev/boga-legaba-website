# Boga Legaba Website – Handover Guide

This document explains how the Boga Legaba website works, what happens behind the
scenes when someone makes a booking, where everything lives, and what you need to
keep an eye on. It is written so that someone who is not a developer can follow it,
with enough detail that a developer can pick it up too.

---

## 1. What the website is

The website is the public face of Boga Legaba Guest House and Conference Centre in
Mahikeng. People use it to look at the rooms, check prices and availability, and
make a booking. It also has a private admin area where staff can see bookings and
how full the guest house is.

The booking side is connected to **NightsBridge**, which is the system Boga Legaba
already uses to manage its rooms and reservations. The website does not replace
NightsBridge. It sits in front of it and gives guests a nicer, branded way to book,
while NightsBridge stays the single source of truth for rooms, rates and bookings.

Live address: **bogalegaba.co.za**

---

## 2. The pages

There are 11 main pages:

1. Home
2. Stay / Rooms
3. Conference Venue
4. Corporate & Government Bookings
5. Dining / Events at Lantana
6. Local Area / Mahikeng Attractions
7. Specials
8. Gallery
9. FAQs
10. Contact / Find Us
11. Book Now (the booking page)

All of them are built and working. The text and photos can still be improved with
the real professional photography and final wording, but the structure is done.

---

## 3. How a booking works (the important part)

This is the heart of the site, so here it is step by step in plain terms.

1. A guest goes to the **Stay** page, picks their dates, and the site shows which
   rooms are free for those dates. It gets this information by asking NightsBridge
   directly, live, at that moment (and remembers the answer for about 10 minutes so
   the page stays fast).

2. The guest picks a room and goes to **Book Now**. They choose a meal plan, enter
   how many guests, and fill in their name, phone and email.

3. When they press **Confirm Booking**, the website sends the request to a small
   helper program (we call it the "booking worker"). This worker opens NightsBridge
   in the background, fills in the same form a person would fill in, selects the
   exact room and dates, ticks the terms, and presses NightsBridge's own
   "Confirm Booking" button.

4. Once NightsBridge accepts it, the booking shows up in the normal NightsBridge
   calendar, exactly as if it had been booked directly. The guest sees a
   confirmation on the website.

5. **NightsBridge then emails the guest** with the booking details and how to pay.
   The website itself does not send a payment email. Payment is handled through
   NightsBridge, the way Boga Legaba already does it.

So the short version: guest books on our nice website, but the booking really lands
in NightsBridge, and NightsBridge handles the confirmation and payment email.

---

## 4. About payment

There is **no separate card payment system** on the website. Earlier in the project
a payment gateway (Paystack) was built, but the decision was made to keep using the
existing NightsBridge process instead. So when a guest books, they pay through the
email NightsBridge sends them.

(The old Paystack code has not been thrown away. It is saved on a separate branch
called `paystack` in case it is ever needed again. It is not part of the live site.)

---

## 5. The admin area

There is a private admin area for staff. You reach it at `/admin/login` and sign in
with the admin password.

What you can do there:

- **Dashboard** (`/admin/dashboard`)
  - See how many rooms are booked today versus free, out of the 28 rooms.
  - See an occupancy chart for the next 30 days.
  - See a calendar showing how full each day is.
  - See a chart of room rates.
  - Quick links to the NightsBridge dashboard and calendar.

- **Bookings** (`/admin/bookings`)
  - See the list of bookings (90 days back, 180 days ahead).
  - Use **Add Booking** to create a booking yourself. This uses the same process
    as a guest booking: it goes into NightsBridge, and NightsBridge emails the
    guest. Note that this creates a *real* booking and blocks the room, so only use
    it for genuine bookings.

The occupancy numbers on the dashboard come from the real bookings in the database,
so they reflect what is actually booked.

---

## 6. The moving parts (what is connected to what)

There are four pieces that work together:

1. **The website** – what guests see. Built with Next.js.
2. **The booking worker** – a small background program that does the actual booking
   on NightsBridge for us. It needs a real browser to drive NightsBridge, which is
   why it runs separately from the website.
3. **The database (Supabase)** – stores the room list, room photos, cached prices,
   and a copy of the bookings, so the website is fast and does not have to ask
   NightsBridge for everything every time.
4. **NightsBridge** – the existing reservation system. The real source of truth for
   rooms, availability and bookings.

The website talks to the database for the room list and photos, talks to
NightsBridge directly for live availability and prices, and hands real booking
requests to the booking worker.

---

## 7. Where everything is hosted

- **Website and booking worker:** hosted on **Render**.
  - The website is one Render service.
  - The booking worker is a second Render service (named `boga-nb-sync`).
  - Both run from the same code repository.
- **Database:** **Supabase** (rooms, photos, cached rates, bookings).
- **Domain and email:** **bogalegaba.co.za**, managed in **Google Workspace**. The
  website only needs the domain's DNS to point at the Render hosting. The Google
  Workspace email keeps working as normal and is not affected.
- **Source code:** GitHub, repository `XSparkDev/boga-legaba-website`.

Important: when you deploy an update, remember there are **two services** on Render.
A change to how bookings are made lives in the booking worker, so the `boga-nb-sync`
service has to be redeployed for it to take effect. A change to the pages lives in
the website service.

---

## 8. Keeping the room and price data fresh

NightsBridge does not push changes to us, so the data is kept up to date by checking
NightsBridge on a regular schedule (a "sync" that runs roughly every 10 to 15
minutes) and saving the latest into the database. Live availability on the booking
page is also checked directly against NightsBridge at the moment a guest views it,
so what a guest sees is current.

Please confirm that this scheduled sync is switched on in Render so the room list,
photos and cached prices stay current.

---

## 9. Settings the site needs (kept private)

The site relies on a set of private settings (called environment variables). These
are stored in Render and Supabase, never in the code. You do not need to know the
values, but you should know they exist and must be kept safe:

- The Supabase address and keys (database access).
- The admin password and admin session secret (admin login).
- A shared secret the website uses to talk to the booking worker.
- The booking worker's address.

If any of these change, the matching service on Render needs to be updated.

---

## 10. Things to know (honest notes)

A few things worth understanding before and after go-live:

- **The booking depends on NightsBridge's website staying the same.** The booking
  worker fills in NightsBridge's booking form automatically. If NightsBridge changes
  the layout of that form, bookings can stop working until the worker is updated.
  This is worth monitoring so you find out before a guest does.

- **The free hosting tier "sleeps."** If no one has used the booking worker for a
  while, the very first booking after that can be slow (up to a minute) while it
  wakes up. After that it is quick again.

- **Editing the website content needs a developer.** There is no self-service
  content editor (CMS) built in. Changing page text, photos or contact details is
  done in the code. If self-editing is important later, a CMS can be added.

- **Visitor analytics** are tracked with Vercel Analytics. If you specifically want
  Google Analytics and Google Search Console, those still need to be set up.

- **Final content and photography.** The pages work, but they should be filled with
  the real professional photos and final wording before a full public launch.

---

## 11. Routine upkeep

- **Hosting:** the Render services and Supabase database stay running. Check the
  hosting plan and renewal so nothing lapses.
- **Domain:** renew bogalegaba.co.za each year in Google Workspace.
- **Security certificate (HTTPS):** handled automatically by Render. No action
  needed in normal use.
- **Watch the booking flow:** every so often, confirm a booking still goes all the
  way through to the NightsBridge calendar. The most reliable check is to make one
  test booking for a future date and then cancel it.
- **Keep secrets safe:** if a staff member with admin access leaves, change the
  admin password.

---

## 12. Code branches (for the developer)

- `main` – the main line of the code.
- `qa` – testing copy, kept in step with the latest work.
- `final` – the working branch the latest changes were made on.
- `paystack` – a saved copy that still has the old Paystack payment code, in case it
  is ever wanted again. Not used by the live site.

`main`, `qa` and `final` currently all carry the same up-to-date code.

---

## 13. Quick pre-launch checklist

Before going fully live for real guests:

- [ ] Real photography and final page content loaded in.
- [ ] Two or three real test bookings made across different rooms and dates, then
      cancelled, to confirm the room and dates come through correctly every time.
- [ ] Confirm the scheduled NightsBridge sync is running on Render.
- [ ] Confirm both Render services (website and `boga-nb-sync`) are deployed with the
      latest code.
- [ ] Strong admin password set, and old/test credentials rotated.
- [ ] Domain DNS pointing at the live site, with Google Workspace email still
      working.
- [ ] Basic monitoring in place so you are alerted if the booking worker fails.

---

If something on the booking side ever stops working, the first two things to check
are: (1) is the `boga-nb-sync` worker awake and deployed with the latest code, and
(2) has NightsBridge changed its booking form. Those cover the large majority of
booking problems.
