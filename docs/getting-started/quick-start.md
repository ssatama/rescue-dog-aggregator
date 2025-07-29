# Quick Start Guide

## Prerequisites

- Python 3.9+ (3.9.6 recommended)
- PostgreSQL 13+
- Node.js 18+ (required for Next.js 15)
- Cloudinary account (for image processing)

## Basic Setup

**For complete setup instructions**, see: **[Installation Guide](installation.md)**

**If you encounter setup issues**, refer to: [Troubleshooting Guide](../operations/troubleshooting.md)

### 1. Backend Setup

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database and setup
python main.py --setup

# Start development server
uvicorn api.main:app --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Configuration

**Important**: Configure environment variables (`.env` file) with your database and Cloudinary credentials before running. See [Installation Guide](installation.md) for details.

## Verification

### Test Commands

```bash
# Backend tests (fast development workflow)
source venv/bin/activate && python -m pytest tests/ -m "not slow" -v

# Frontend tests (all 88 suites)
cd frontend && npm test
```

### Configuration Management

```bash
# Add new organization
python management/config_commands.py sync    # Sync configs to database
python management/config_commands.py run-all  # Run all scrapers
```

## Next Steps

- **Complete setup**: [Installation Guide](installation.md)
- **Configuration**: [Configuration System](configuration.md)
- **Development**: [Development Workflow](../development/workflow.md)
- **Testing**: [Testing Guide](../development/testing.md)