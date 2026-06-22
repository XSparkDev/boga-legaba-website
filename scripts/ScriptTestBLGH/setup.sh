#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env — add your NightsBridge SITE_USER and SITE_PASS before running."
fi

echo "Setup complete. Run: npm run sync:nightsbridge:once"
