# 📦 Installation Guide

## 🎯 Overview

Get the Rescue Dog Aggregator platform running locally in under 10 minutes. This guide covers system requirements, step-by-step installation, configuration, and troubleshooting.

**Tech Stack**: Python/FastAPI backend, Next.js 15 frontend, PostgreSQL database, 434+ backend tests, 1,249+ frontend tests.

## ⚡ Prerequisites

### Required Software
- **Python 3.9+** (Python 3.13 compatible, 3.9.6+ recommended)
- **Node.js 18+** (required for Next.js 15.3.0+ App Router features)
- **PostgreSQL 13+** (PostgreSQL 14+ recommended for enhanced JSON performance)
- **Git** (for cloning the repository)

### System Requirements
- **RAM**: Minimum 4GB, 8GB recommended
- **Storage**: 5GB free space minimum
- **OS**: macOS, Linux, or Windows (with WSL2)

### Cloud Services (Production)
- **Cloudflare R2** account (for image optimization and CDN)

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Setup Backend

```bash
git clone https://github.com/rescue-dog-aggregator/rescue-dog-aggregator.git
cd rescue-dog-aggregator

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
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

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE rescue_dogs;
CREATE USER rescue_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rescue_dogs TO rescue_user;
\q

# Initialize schema
python database/db_setup.py
```

### 3. Environment Configuration

Create `.env` file in project root:

```bash
# Database Configuration (required)
DB_HOST=localhost
DB_NAME=rescue_dogs
DB_USER=rescue_user
DB_PASSWORD=your_secure_password
DB_PORT=5432

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Cloudflare R2 Configuration (required for images)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=rescue-dog-images
R2_CUSTOM_DOMAIN=images.rescuedogs.me

# Optional Settings
LOG_LEVEL=INFO
TESTING=false
CORS_ALLOW_CREDENTIALS=false
```

### 4. Frontend Setup

```bash
cd frontend
npm install

# Create frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me" >> .env.local
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend API (http://localhost:8000)
source venv/bin/activate
uvicorn api.main:app --reload

# Terminal 2: Frontend App (http://localhost:3000)
cd frontend
npm run dev
```

## ✅ Verification

### Health Check

```bash
# Test API
curl http://localhost:8000/health
curl "http://localhost:8000/api/animals?limit=5"

# Test Frontend
open http://localhost:3000  # Or visit in browser
```

### Test Suite Validation

```bash
# Backend tests (fast subset - ~3 seconds)
source venv/bin/activate
pytest tests/ -m "not slow" -v

# Frontend tests (1,500+ tests, ~15 seconds)
cd frontend
npm test

# Build verification
npm run build
```

### Organization Setup

```bash
# Sync organizations from config files
python management/config_commands.py sync

# List configured organizations (8 available)
python management/config_commands.py list

# Test scraper (optional)
python management/config_commands.py run pets-in-turkey
```

## 🔧 Configuration System

The platform uses YAML-based configuration for rescue organizations.

### Adding New Organizations

1. **Create config file**: `configs/organizations/org-name.yaml`

```yaml
schema_version: "1.0"
id: "org-name"
name: "Organization Display Name"
enabled: true

scraper:
  class_name: "OrgScraper"
  module: "scrapers.org_module"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30

metadata:
  website_url: "https://org.com"
  description: "Organization description"
  location:
    country: "US"
    state: "CA"
    city: "City Name"
  service_regions:
    - country: "US"
      regions: ["CA", "NV", "OR"]
  contact:
    email: "info@org.com"
  social_media:
    facebook: "https://facebook.com/org"
```

2. **Validate and sync**:

```bash
python management/config_commands.py validate
python management/config_commands.py sync
```

3. **Implement scraper** (using modern patterns):

```python
# scrapers/org_module/scraper.py
from scrapers.base_scraper import BaseScraper

class OrgScraper(BaseScraper):
    def collect_data(self):
        """Modern context manager usage."""
        with self:  # Automatic connection handling
            return self._extract_dog_listings()
    
    def _extract_dog_listings(self):
        # Your scraping implementation
        return []
```

### Configuration Commands

```bash
# List organizations
python management/config_commands.py list

# Show organization details (including service regions)
python management/config_commands.py show pets-in-turkey

# Run specific scraper
python management/config_commands.py run org-name

# Run all enabled scrapers
python management/config_commands.py run-all
```

## 🏭 Production Deployment

### Environment Variables

Update `.env` for production:

```bash
# Security
ENVIRONMENT=production
SECRET_KEY=your_production_secret_key
ALLOWED_ORIGINS=["https://yourdomain.com"]

# Database optimization
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30

# API scaling
API_HOST=127.0.0.1  # Behind reverse proxy
API_WORKERS=4
```

### Database Optimization

```sql
-- Add production indexes
CREATE INDEX CONCURRENTLY idx_animals_search 
ON animals USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY idx_animals_status_confidence 
ON animals(status, availability_confidence);

-- Analyze tables
ANALYZE animals;
ANALYZE organizations;
```

### Process Management (SystemD)

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

### Frontend Production Build

```bash
cd frontend
npm run build
npm start  # Or use a web server like nginx
```

### Scheduled Scraping

Set up weekly scraping:

```bash
# Edit crontab
crontab -e

# Add weekly scraping (Monday 2 AM)
0 2 * * 1 cd /opt/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run-all >> /var/log/rescue-scraper.log 2>&1
```

## 🐛 Troubleshooting

### Database Issues

**Error**: `psycopg2.OperationalError: could not connect to server`

```bash
# Check PostgreSQL status
sudo systemctl status postgresql
sudo systemctl start postgresql

# Test connection
psql -h localhost -d rescue_dogs -U rescue_user
```

### Virtual Environment Issues

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

```bash
# Ensure virtual environment is activated
source venv/bin/activate
which python  # Should point to venv/bin/python

# Reinstall if needed
pip install -r requirements.txt
```

### Frontend Build Errors

**Error**: Module resolution or build failures

```bash
cd frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for duplicates (automated fix available)
npm run check:duplicates
npm run fix:duplicates --interactive

# Try building again
npm run build
```

### R2 Configuration Issues

**Error**: Images not loading

```bash
# Verify R2 configuration
echo $R2_CUSTOM_DOMAIN
echo $NEXT_PUBLIC_R2_CUSTOM_DOMAIN

# Test connectivity
curl -I "https://$R2_CUSTOM_DOMAIN/test-image.jpg"
```

### Test Failures

**Architecture**: The system includes automatic database isolation for all tests.

```bash
# Backend: Database isolation is automatic
pytest tests/ -v --tb=short

# Frontend: Clear cache if needed
cd frontend
npm test -- --clearCache
npm test

# E2E: Reset browser state
npm run e2e:install
npm run e2e
```

### Performance Issues

**Database**:
- Use pgBouncer for connection pooling
- Set up automated vacuum and analyze
- Monitor query performance

**API**:
- Use multiple uvicorn workers in production
- Implement Redis for response caching
- Set up application performance monitoring

**Frontend**:
- Use CDN for static assets
- Configure browser caching headers
- Enable gzip compression

## 📊 Essential Commands

```bash
# Backend Development (always activate venv first)
source venv/bin/activate
pytest tests/ -m "unit or fast" -v          # Fast feedback
pytest tests/ -m "not browser and not requires_migrations" -v  # CI pipeline
pytest tests/ -v                            # All tests

# Frontend Development
cd frontend
npm test                                    # All tests
npm run build                              # Verify build
npm run check:duplicates                   # Check for duplicate files

# Configuration Management
python management/config_commands.py list  # List organizations
python management/config_commands.py sync  # Sync to database
python management/config_commands.py run pets-turkey  # Test scraper

# Data Quality Monitoring
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=overall --all
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=26
```

## 🎯 Next Steps

After successful installation:

1. **Explore the API**: Visit `http://localhost:8000/docs` for interactive documentation
2. **Add Organizations**: Configure new scrapers in `configs/organizations/`
3. **Set up Monitoring**: Configure health checks and alerting
4. **Review Architecture**: Check `docs/architecture/` for system design
5. **Contributing**: See `docs/development/workflow.md` for development practices

## 📚 Additional Resources

- **Development Workflow**: `docs/development/workflow.md`
- **Testing Guide**: `docs/development/testing.md`
- **API Reference**: `docs/api/reference.md`
- **Troubleshooting**: `docs/operations/troubleshooting.md`
- **Architecture**: `docs/architecture/`

## 💡 Key Features

- **Configuration-Driven**: YAML-based organization management
- **Test-Driven Development**: 434+ backend tests, 1,249+ frontend tests
- **Modern Architecture**: Null Object Pattern, Context Managers, Template Methods
- **Database Isolation**: Automatic test protection from production data
- **Service Regions**: Geographic filtering and location-based search
- **Image Optimization**: Cloudflare R2 integration for performance
- **Zero Technical Debt**: Clean code principles enforced

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation in `docs/` directory. For development questions, see the workflow guide and testing documentation.