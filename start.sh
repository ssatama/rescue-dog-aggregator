#!/bin/bash
# Railway startup script - routes to correct service based on SERVICE_TYPE

if [ "$SERVICE_TYPE" = "cron" ]; then
    echo "Starting scraper cron service..."
    exec python management/railway_scraper_cron.py
else
    echo "Starting API service..."
    exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
fi
