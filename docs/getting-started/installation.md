# 📦 Installation Guide

## 🎯 Overview

This guide provides step-by-step instructions for setting up the Rescue Dog Aggregator platform on your local machine or production environment.

## ⚡ Prerequisites

Before installing, ensure you have the following prerequisites:

### Required Software
- **Python 3.9+** (Python 3.13 compatible, 3.9.6+ recommended)
- **Node.js 18+** (Node.js 18+ required for Next.js 15.3.0+)
- **PostgreSQL 13+** (PostgreSQL 14+ recommended for enhanced JSON performance)
- **Git** (for cloning the repository)

### Optional (for production)
- **Docker** (for containerized deployment)
- **Nginx** (for reverse proxy)
- **SystemD** (for service management on Linux)

### System Requirements
- **RAM**: Minimum 4GB, 8GB recommended
- **Storage**: 5GB free space minimum
- **OS**: macOS, Linux, or Windows (with WSL2)

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/rescue-dog-aggregator/rescue-dog-aggregator.git
cd rescue-dog-aggregator
```

### 2. Database Setup

#### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

#### Create Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE rescue_dogs;
CREATE USER rescue_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rescue_dogs TO rescue_user;

# Exit psql
\q
```

#### Initialize Database Schema

```bash
# Method 1: Use the setup script (recommended)
python database/db_setup.py

# Method 2: Apply schema manually
psql -h localhost -d rescue_dogs -U rescue_user < database/schema.sql
```

**Note**: The project now uses `schema.sql` as the single source of truth. All previous migration files have been consolidated into this schema file.

### 3. Backend Setup

#### Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Python Dependencies

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, psycopg2; print('Dependencies installed successfully')"
```

#### Configure Environment Variables

Create `.env` file in the project root:

```bash
# Database configuration
DB_HOST=localhost
DB_NAME=rescue_dogs
DB_USER=rescue_user
DB_PASSWORD=your_secure_password
DB_PORT=5432

# API configuration  
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# Cloudflare R2 configuration (required for image handling)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=rescue-dog-images
R2_CUSTOM_DOMAIN=images.rescuedogs.me

# CORS configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# CORS security settings (optional)
CORS_ALLOW_CREDENTIALS=false
CORS_MAX_AGE=3600

# Testing environment (optional)
TESTING=false

# Logging configuration (optional)
LOG_LEVEL=INFO

# Rate limiting (optional)
API_RATE_LIMIT_ENABLED=false
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=3600

# Production optimizations (optional)
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
API_WORKERS=4
```

**Configuration Reference:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | No | `localhost` | PostgreSQL host |
| `DB_NAME` | No | `rescue_dogs` | Database name |
| `DB_USER` | No | System user | Database user |
| `DB_PASSWORD` | Yes* | None | Database password |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `API_HOST` | No | `0.0.0.0` | API bind address |
| `API_PORT` | No | `8000` | API port |
| `ENVIRONMENT` | No | `development` | Environment: `development` or `production` |
| `R2_ACCOUNT_ID` | Yes | None | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | None | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | None | R2 secret access key |
| `R2_BUCKET_NAME` | Yes | None | R2 bucket name |
| `R2_CUSTOM_DOMAIN` | Yes | None | R2 custom domain |
| `ALLOWED_ORIGINS` | No | Auto-detected | Comma-separated CORS origins |
| `CORS_ALLOW_CREDENTIALS` | No | `false` | Allow credentials in CORS |
| `CORS_MAX_AGE` | No | `3600` | CORS preflight cache duration |
| `TESTING` | No | `false` | Enable test mode |
| `LOG_LEVEL` | No | `INFO` | Logging level |

*Required in production environments

#### Test Backend Installation

```bash
# Activate virtual environment
source venv/bin/activate

# Test database connection
python -c "
import psycopg2
from config import DB_CONFIG
try:
    conn = psycopg2.connect(**DB_CONFIG)
    print('✅ Database connection successful')
    conn.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"

# Run backend tests (fast subset - 3 seconds)
python -m pytest tests/ -m "not slow" -v

# Run all backend tests (comprehensive)
python -m pytest tests/ -m "not browser and not requires_migrations" -v

# Test configuration commands
python management/config_commands.py list
```

### 4. Frontend Setup

#### Install Node.js Dependencies

```bash
cd frontend
npm install

# Verify installation
npm list next react
```

#### Configure Frontend Environment

Create `frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# R2 Configuration (must match backend)
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me

# Development settings
NODE_ENV=development
```

#### Test Frontend Installation

```bash
cd frontend

# Run tests (1,500+ tests, ~15 seconds)
npm test

# Build for production (to verify setup)
npm run build

# Verify build was successful
ls -la .next/

# Run E2E tests (optional - for comprehensive validation)
npm run e2e:install  # Install Playwright browsers
npm run e2e          # Run E2E test suite
```

### 5. Organization Configuration

The system uses configuration-driven scraper management. Set up organizations:

#### Sync Organizations to Database

```bash
# Activate virtual environment
source venv/bin/activate

# Validate configurations
python management/config_commands.py validate

# Sync organizations to database
python management/config_commands.py sync

# Verify sync
python management/config_commands.py list
```

### 6. Start the Application

#### Start Backend API

```bash
# Activate virtual environment
source venv/bin/activate

# Start the API server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at: `http://localhost:3000`

### 7. Verify Installation

#### Health Check

Test the complete setup:

```bash
# Test API health
curl http://localhost:8000/health

# Test API functionality
curl "http://localhost:8000/api/animals?limit=5"

# Test organizations endpoint
curl http://localhost:8000/api/organizations

# Test frontend (in browser)
# Navigate to http://localhost:3000
```

#### Run Test Scrapers

```bash
# Activate virtual environment
source venv/bin/activate

# Test scraper functionality (optional - may take time)
python management/config_commands.py run pets-in-turkey

# Check results and service regions
python management/config_commands.py show pets-in-turkey
```

## 🏭 Production Deployment

### Environment Setup

For production environments, additional configuration is required:

#### Database Optimization

```sql
-- Add production indexes
CREATE INDEX CONCURRENTLY idx_animals_search 
ON animals USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY idx_animals_status_confidence 
ON animals(status, availability_confidence);

-- Analyze tables
ANALYZE animals;
ANALYZE organizations;
ANALYZE scrape_logs;
```

#### Security Configuration

Update `.env` for production:

```bash
# Security
ENVIRONMENT=production
SECRET_KEY=your_production_secret_key
ALLOWED_ORIGINS=["https://yourdomain.com"]

# Database (use connection pooling)
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30

# API
API_HOST=127.0.0.1  # Bind to localhost only (behind reverse proxy)
```

#### Process Management

**Using SystemD (Linux):**

Create `/etc/systemd/system/rescue-dog-api.service`:

```ini
[Unit]
Description=Rescue Dog Aggregator API
After=network.target postgresql.service

[Service]
Type=exec
User=rescue
Group=rescue
WorkingDirectory=/opt/rescue-dog-aggregator
Environment=PATH=/opt/rescue-dog-aggregator/venv/bin
ExecStart=/opt/rescue-dog-aggregator/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable rescue-dog-api
sudo systemctl start rescue-dog-api
sudo systemctl status rescue-dog-api
```

#### Frontend Production Build

```bash
cd frontend

# Build for production
npm run build

# Start production server
npm start

# Or serve with a web server (recommended)
npx serve .next
```

#### Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/rescue-dog-aggregator`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API docs
    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/rescue-dog-aggregator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Scheduled Scraping

Set up weekly scraping with cron:

```bash
# Edit crontab
crontab -e

# Add weekly scraping (every Monday at 2 AM)
0 2 * * 1 cd /opt/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run-all >> /var/log/rescue-scraper.log 2>&1
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors

**Error**: `psycopg2.OperationalError: could not connect to server`

**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if needed
sudo systemctl start postgresql

# Test connection manually
psql -h localhost -d rescue_dogs -U rescue_user
```

#### Virtual Environment Issues

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Verify activation
which python  # Should point to venv/bin/python

# Reinstall dependencies if needed
pip install -r requirements.txt
```

#### Frontend Build Errors

**Error**: `Module not found: Can't resolve 'next/...'`

**Solution**:
```bash
cd frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for duplicate files (automated fix)
npm run check:duplicates
npm run fix:duplicates --interactive

# Try building again
npm run build
```

#### R2 Configuration

**Error**: Images not loading or showing as broken

**Solution**:
```bash
# Verify R2 configuration
echo $R2_CUSTOM_DOMAIN
echo $NEXT_PUBLIC_R2_CUSTOM_DOMAIN

# Test R2 connectivity
curl -I "https://$R2_CUSTOM_DOMAIN/test-image.jpg"
```

#### Testing Architecture Issues

**Error**: Tests failing or test isolation problems

**Solution**:
```bash
# Backend: Database isolation is automatic via global fixtures
python -m pytest tests/ -v --tb=short

# Frontend: Clear test cache if needed
cd frontend
npm test -- --clearCache
npm test

# E2E: Reset browser state
npm run e2e:install
npm run e2e
```

**Understanding Test Boundaries**:
- **Jest Tests**: Component logic, mobile responsiveness, API integrations
- **E2E Tests**: Critical user journeys, cross-browser compatibility
- **Database Isolation**: All Python tests automatically protected from production DB writes

### Getting Help

If you encounter issues:

1. **Check the logs**: Look at console output and log files
2. **Verify prerequisites**: Ensure all required software is installed
3. **Run tests**: Use `npm test` and `python -m pytest tests/`
4. **Check documentation**: Review [troubleshooting guide](../operations/troubleshooting.md)
5. **Submit an issue**: Include system information and error messages

### Performance Optimization

For better performance:

#### Database
- **Connection pooling**: Use pgBouncer for connection pooling
- **Schema verification**: Ensure schema.sql is properly applied
- **Vacuuming**: Set up automated vacuum and analyze

#### API
- **Workers**: Use multiple uvicorn workers in production
- **Caching**: Implement Redis for API response caching
- **Monitoring**: Set up application performance monitoring

#### Frontend
- **CDN**: Use a CDN for static assets
- **Caching**: Configure proper browser caching headers
- **Compression**: Enable gzip compression

## ➡️ Next Steps

After successful installation:

1. **Add Organizations**: Configure new scrapers in `configs/organizations/`
2. **Set up Monitoring**: Configure health checks and alerting
3. **Backup Strategy**: Set up database backups
4. **SSL Certificate**: Configure HTTPS for production
5. **Monitoring**: Set up logging and monitoring solutions

For ongoing maintenance, see:
- [Weekly Scraping Guide](../operations/weekly-scraping.md)
- [API Reference](../api/reference.md)
- [Contributing Guide](../development/contributing.md)