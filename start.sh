#!/bin/bash
# Railway startup script - routes to correct service based on SERVICE_TYPE

if [ "$SERVICE_TYPE" = "cron" ]; then
    echo "Starting scraper cron service..."
    exec uv run python management/railway_scraper_cron.py
else
    echo "Starting API service..."
    exec uv run uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080} --forwarded-allow-ips='*'
fi
