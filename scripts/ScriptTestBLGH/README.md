# NightsBridge Bookings Scraper

Logs into [NightsBridge](https://login.nightsbridge.com/) with your
credentials and exports your bookings/reservations to JSON and CSV.

Rather than scraping the visual calendar grid, it logs in through the website
and then reads bookings from the same JSON API the calendar itself uses
(`bridgeitapi` → `BookingCalendarRQ`). That makes the data clean and the
scraper far less fragile.

> **Use responsibly.** This is for your own NightsBridge account. There's a
> rate-friendly single API call per run; don't loop it aggressively.

## How it works

```
log in (website)  ->  read loginkey from dashboard  ->  BootstrapRQ
                  ->  BookingCalendarRQ (date range)  ->  flatten  ->  save
```

| File                     | Role                                                          |
|--------------------------|---------------------------------------------------------------|
| `main.py`                | Entry point; ties everything together, saves output.          |
| `worker.py`              | Background loop or `--once` for cron / npm scripts.             |
| `auth.py`                | Login + session reuse (`storage_state.json`); reads loginkey. |
| `nightsbridge.py`        | API client for `bridgeitapi`.                                 |
| `transform.py`           | Flattens the API payload into clean rows.                     |
| `storage.py`             | Writes `output/*.json` and `output/*.csv`.                    |
| `config.py`              | URLs, selectors, status codes, date defaults.                 |
| `explore_after_login.py` | Optional helper: log in and map what's in your account.       |
| `explore_api.py`         | Optional helper: dump the API calls (if the site changes).    |

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cp .env.example .env        # then edit .env with your NightsBridge login
```

## Run

```bash
python main.py
```

**Background worker** (from repo root or this folder):

```bash
python worker.py          # loop every SYNC_INTERVAL_MINUTES (default 60)
python worker.py --once   # single sync, then exit
```

Output lands in `output/` as `scrape_<timestamp>.json` and `.csv`. By default
it fetches **today → today + 60 days**. To pick a range, set `DATE_FROM` /
`DATE_TO` (YYYY-MM-DD) in `.env`.

The first run logs in and saves your session to `storage_state.json`; later
runs reuse it and skip the login. If that session has expired, the scraper
detects it and logs in again automatically.

## Output columns

One row **per room-stay** (a booking spanning multiple rooms produces multiple
rows), with booking-level fields repeated:

`booking_id`, `booking_ref`, `status`, `status_text`, `booking_type`,
`source`, `booked_on`, `from_date`, `to_date`, `made_by`, `made_by_email`,
`made_by_phone`, `notes`, `room_name`, `guest_first_name`, `guest_surname`,
`guest_email`, `guest_phone`, `company`, `adults`, `children_1`, `children_2`,
`avg_rate`, `checked_in`, `checked_out`.

Status codes: `C` Confirmed · `W` Waiting for Deposit · `P` Provisional ·
`R` Reserved (auto-expire) · `S` Paid · `O` Outstanding Account · `U` Unavailable.

## Troubleshooting

- **Login won't complete** → run with `HEADLESS=false` in `.env` to watch it;
  check your credentials.
- **0 bookings** → widen `DATE_FROM`/`DATE_TO`; the default window may simply
  have no bookings.
- **Site changed / API errors** → run `python explore_api.py` to re-capture the
  live API messages, then adjust `nightsbridge.py`.

## Next steps (ideas)

- Save to a database (SQLite/Postgres) instead of files.
- Pull other data: invoices, occupancy reports, guest history.
- Schedule it to run daily.
