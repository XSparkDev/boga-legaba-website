"""
Scrape the NightsBridge payments/transactions page and upsert into Supabase.

Usage:
    python get_transactions.py [MONTH_OFFSET]

    MONTH_OFFSET: 0 = current month (default), -1 = previous month, etc.
    The NightsBridge UI shows one month at a time; pass an offset to fetch past data.

The script logs into NightsBridge (via auth.py), navigates to the Transactions
page, parses the HTML table, and upserts into the `transactions` Supabase table.
"""

import json
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

import auth
import config

load_dotenv()

# ── Supabase client (optional – skipped if keys not set) ──────────────────────
try:
    from supabase import create_client, Client as SupabaseClient

    _supa = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )
except Exception:
    _supa = None

config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRANSACTIONS_URL = "https://www.nightsbridge.com/dashboard/payments/transactions"


# ── Parsing helpers ────────────────────────────────────────────────────────────

STATUS_MAP = {
    "W": "Waiting on Authorisation",
    "P": "Paid to you",
    "F": "Failed",
    "R": "Refunded",
    "C": "Cancelled",
    "S": "Success / Settled",
}

AMOUNT_RE = re.compile(r"[\d\s,]+\.?\d*")


def clean_amount(raw: str):  # -> float | None
    raw = raw.strip().replace(",", "").replace(" ", "")
    try:
        return float(raw)
    except ValueError:
        return None


def parse_booking_info(raw: str) -> dict:
    """Parse the booking info cell, e.g. '(N) 120065427 / Maake\\nArriving: Thu, 18 Jun 2026'."""
    info: dict = {"booking_ref": None, "guest_name": None, "arriving": None, "source": None}
    lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
    for line in lines:
        if line.startswith("Arriving:"):
            info["arriving"] = line.replace("Arriving:", "").strip()
        elif re.match(r"\(.\)", line):
            # e.g. "(N) 120065427 / Maake"
            m = re.match(r"\((\w)\)\s*([\d]+)\s*/\s*(.+)", line)
            if m:
                info["source"] = m.group(1)
                info["booking_ref"] = m.group(2)
                info["guest_name"] = m.group(3).strip()
        elif "transferred" in line.lower() or "money" in line.lower():
            info["note"] = line
    return info


def parse_transactions_html(page) -> list[dict]:
    """
    Parse the transactions table using NightsBridge's Angular component classes.
    Each row is a <div class="nb-table-row"> containing <div class="nb-table-cell"> children.
    """
    rows = page.query_selector_all("div.nb-table-row")
    transactions: list[dict] = []

    for row in rows:
        cells = row.query_selector_all("div.nb-table-cell")
        if len(cells) < 4:
            continue

        try:
            # Cell 0: Pay ID (may have "Pay ID: " label inside)
            pay_id_raw = re.sub(r"Pay ID\s*:", "", cells[0].inner_text()).strip()
            if not pay_id_raw or not re.match(r"^\d+$", pay_id_raw):
                continue

            date_raw = cells[1].inner_text().strip() if len(cells) > 1 else ""
            gateway = cells[2].inner_text().strip() if len(cells) > 2 else ""
            booking_raw = cells[3].inner_text().strip() if len(cells) > 3 else ""
            success_raw = cells[4].inner_text().strip() if len(cells) > 4 else ""
            # Cell 5 may have "Amount: " label
            amount_raw = re.sub(r"Amount\s*:", "", cells[5].inner_text() if len(cells) > 5 else "").strip()

            # Status is in an nbui-payment-status-pill component
            status_pill = row.query_selector("nbui-payment-status-pill")
            status_raw = status_pill.inner_text().strip() if status_pill else ""
            # The status letter is the character inside the circle span
            status_letter_el = row.query_selector("span.rounded-circle")
            status_letter = status_letter_el.inner_text().strip() if status_letter_el else status_raw[:1]
            status_text = STATUS_MAP.get(status_letter, status_raw[:80])

            # Booking link: href="/dashboard/booking/XXXXXXX"
            booking_link = row.query_selector("a[href*='/dashboard/booking/']")
            booking_ref_from_link = None
            if booking_link:
                href = booking_link.get_attribute("href") or ""
                m = re.search(r"/dashboard/booking/(\d+)", href)
                if m:
                    booking_ref_from_link = m.group(1)

            booking = parse_booking_info(booking_raw)
            if booking_ref_from_link:
                booking["booking_ref"] = booking_ref_from_link

            amount = clean_amount(amount_raw)

            txn = {
                "pay_id": int(pay_id_raw),
                "txn_date": date_raw,
                "gateway": gateway.lower().strip(),
                "booking_ref": booking.get("booking_ref"),
                "guest_name": booking.get("guest_name"),
                "arriving": booking.get("arriving"),
                "booking_source": booking.get("source"),
                "success": "success" in success_raw.lower(),
                "amount": amount,
                "status_code": status_letter,
                "status_text": status_text,
                "raw_booking_info": booking_raw[:300],
            }
            transactions.append(txn)
        except Exception as e:
            print(f"  [!] Row parse error: {e}")

    return transactions


# ── Supabase upsert ────────────────────────────────────────────────────────────


def upsert_transactions(transactions: list[dict]) -> None:
    valid = [t for t in transactions if t.get("pay_id")]
    if not valid:
        print("No valid transactions to upsert.")
        return
    if not _supa:
        print("Supabase not configured — skipping upsert.")
        return

    try:
        result = (
            _supa.table("transactions")
            .upsert(valid, on_conflict="pay_id")
            .execute()
        )
        print(f"Upserted {len(valid)} transactions to Supabase ✓")
    except Exception as e:
        print(f"Supabase upsert error: {e}")


# ── Main ───────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    print("Scraping NightsBridge transactions…\n")

    with sync_playwright() as p:
        headless = os.environ.get("HEADLESS", "true").lower() == "true"
        browser = p.chromium.launch(headless=headless, args=["--disable-dev-shm-usage", "--no-sandbox"])

        context, page = auth.get_authenticated_context(browser)
        page.wait_for_timeout(2_000)

        print(f"Navigating to: {TRANSACTIONS_URL}")
        page.goto(TRANSACTIONS_URL, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_timeout(5_000)

        print(f"Page title: {page.title()}  |  URL: {page.url}")

        transactions = parse_transactions_html(page)
        print(f"Parsed {len(transactions)} transactions from current month.\n")

        # Save raw output
        out_path = config.OUTPUT_DIR / "transactions.json"
        out_path.write_text(
            json.dumps(transactions, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"Saved → {out_path}")

        # Upsert
        upsert_transactions(transactions)

        # Summary
        print("\n── Transaction summary ──")
        for t in transactions[:15]:
            print(
                f"  [{t.get('status_code','?')}] PayID={t['pay_id']}  "
                f"R{t.get('amount',0):.0f}  {t.get('guest_name','?'):20}  "
                f"via {t.get('gateway','?')}"
            )
        if len(transactions) > 15:
            print(f"  … and {len(transactions) - 15} more")

        browser.close()
