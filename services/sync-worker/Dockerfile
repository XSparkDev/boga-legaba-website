FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY public/ScriptTestBLGH/requirements.txt /app/scraper/requirements.txt
RUN pip install --no-cache-dir -r /app/scraper/requirements.txt

RUN playwright install --with-deps chromium

COPY public/ScriptTestBLGH /app/scraper
COPY services/sync-worker/server.py /app/server.py

ENV SCRAPER_DIR=/app/scraper
ENV PYTHONUNBUFFERED=1
ENV HEADLESS=true
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')"

CMD ["python", "/app/server.py"]
