# ⚡ Quick Start Guide

Get up and running with the Rescue Dog Aggregator in under 5 minutes.

## 📋 Prerequisites

- **Python 3.9+** (Python 3.13 compatible, 3.9.6+ recommended)
- **PostgreSQL 13+** (14+ recommended for enhanced JSON performance)  
- **Node.js 18+** (required for Next.js 15.3.0+ App Router features)
- **Cloudflare R2** account (for production image optimization and CDN)

## 🚀 30-Second Setup

### 1. Clone and Initialize

```bash
git clone https://github.com/rescue-dog-aggregator/rescue-dog-aggregator.git
cd rescue-dog-aggregator

# Backend setup
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database initialization
python database/db_setup.py
```

### 2. Environment Configuration

Create `.env` file in project root:

```bash
# Database (required)
DB_HOST=localhost
DB_NAME=rescue_dogs
DB_USER=rescue_user
DB_PASSWORD=your_secure_password

# Cloudflare R2 (required for image handling)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=rescue-dog-images
R2_CUSTOM_DOMAIN=images.rescuedogs.me

# API Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**💡 For complete environment configuration**, see: **[Installation Guide](installation.md)**

### 3. Start Development Servers

```bash
# Terminal 1: Backend API (http://localhost:8000)
source venv/bin/activate
uvicorn api.main:app --reload

# Terminal 2: Frontend App (http://localhost:3000)
cd frontend
npm install
npm run dev
```

## ✅ Verification

### Health Check

```bash
# Test API functionality
curl http://localhost:8000/health
curl "http://localhost:8000/api/animals?limit=5"

# Visit frontend in browser
open http://localhost:3000
```

### Test Suite Validation

```bash
# Backend tests (fast subset - ~3 seconds)
source venv/bin/activate
pytest tests/ -m "not slow" -v

# Frontend tests (1,500+ tests, ~15 seconds)
cd frontend
npm test
```

### Organization Setup

```bash
# Sync organizations from config files
python management/config_commands.py sync

# List configured organizations
python management/config_commands.py list

# Test scraper (optional - may take time)
python management/config_commands.py run pets-in-turkey
```

## Next Steps

- **Complete setup**: [Installation Guide](installation.md)
- **Configuration**: [Configuration System](configuration.md)
- **Development**: [Development Workflow](../development/workflow.md)
- **Testing**: [Testing Guide](../development/testing.md)