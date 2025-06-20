# Rescue Dog Aggregator

An open-source web platform that aggregates rescue dogs from multiple organizations using a **flexible configuration system**, standardizes the data, and presents it in a user-friendly Next.js interface.

## 🌟 Key Features

- **🔧 Configuration-Driven Architecture**: Add new rescue organizations via YAML config files
- **🔄 Automatic Data Standardization**: Breed, age, and size normalization across sources
- **☁️ Cloudinary Image Processing**: Automated image optimization and CDN delivery
- **🔒 Production-Ready Security**: SQL injection prevention, input validation, comprehensive error handling
- **🧪 Comprehensive Testing**: 259 backend tests + 1,249 frontend tests (88 suites) with advanced speed optimization
- **🗓️ Weekly Scraping Support**: Production-ready with stale data detection and availability management
- **📊 Enhanced Metrics & Monitoring**: JSONB-based detailed tracking with quality scoring
- **🎯 Smart Availability Filtering**: Users see only reliable, recently-seen animals by default
- **🚨 Error Recovery**: Partial failure detection prevents false positives from scraper issues
- **💝 CTA Optimization**: Favorites management, toast notifications, mobile sticky bar for enhanced user engagement
- **📱 Mobile-First UX**: Responsive design with dedicated mobile interactions and progressive enhancement
- **🌐 Tech Stack**: FastAPI backend, Next.js 15 frontend with App Router, PostgreSQL database

## 🏗️ Architecture Overview

### Configuration System
Organizations are defined via YAML configuration files:

```yaml
# configs/organizations/example-org.yaml
schema_version: "1.0"
id: "example-org"
name: "Example Rescue Organization"
enabled: true
scraper:
  class_name: "ExampleScraper"
  module: "scrapers.example"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
metadata:
  website_url: "https://example-rescue.org"
  description: "A wonderful rescue organization"
  location:
    country: "US"
    city: "Example City"
  contact:
    email: "info@example-rescue.org"
```

### Data Flow
1. **Config Loading**: YAML files define organization scrapers
2. **Organization Sync**: Configs auto-sync to database
3. **Data Collection**: Scrapers gather dog listings from websites with session tracking
4. **Standardization**: AI-powered normalization of breed, age, size data
5. **Availability Management**: Automatic stale data detection and confidence scoring
6. **API Exposure**: RESTful endpoints serve standardized data with smart filtering
7. **Frontend Display**: React interface showing only reliable, current animals by default

### Production-Ready Availability Management
- **Stale Data Detection**: Animals automatically tracked across scraping sessions
- **Confidence Levels**: `high` (recently seen) → `medium` (1 missed scrape) → `low` (2+ missed) → `unavailable` (4+ missed)
- **Smart API Defaults**: Only `available` animals with `high` or `medium` confidence shown by default
- **Error Recovery**: Partial failure detection prevents marking animals stale due to scraper issues
- **Quality Scoring**: Automatic assessment of data completeness (0-1 scale)

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ (3.9.6 recommended)
- PostgreSQL 13+
- Node.js 18+ (required for Next.js 15)
- Cloudinary account (for image processing)

### Quick Start

**For complete setup instructions**, see: **[Installation Guide](docs/installation_guide.md)**

**If you encounter setup issues**, refer to: [Troubleshooting Guide](docs/troubleshooting_guide.md)

**Basic setup:**
```bash
# 1. Setup backend
source venv/bin/activate
pip install -r requirements.txt
python main.py --setup
uvicorn api.main:app --reload

# 2. Setup frontend  
cd frontend && npm install && npm run dev
```

**Important**: Configure environment variables (`.env` file) with your database and Cloudinary credentials before running. See installation guide for details.

## 🧪 Testing & Quality Assurance

**Comprehensive testing with 259 backend + 1,249 frontend tests** covering all functionality, performance, accessibility, and cross-browser compatibility.

**Quick test commands:**
```bash
# Backend tests (fast development workflow)
source venv/bin/activate && python -m pytest tests/ -m "not slow" -v

# Frontend tests (all 88 suites)
cd frontend && npm test
```

**For complete testing strategy**, see: **[Development Workflow - Testing Guide](docs/development_workflow.md#testing-strategy)**

## 🔧 Configuration Management

**YAML-driven configuration system** for adding new rescue organizations without code changes.

**Quick commands:**
```bash
# Add new organization
python management/config_commands.py sync      # Sync configs to database
python management/config_commands.py run-all  # Run all scrapers
```

**For complete configuration guide**, see: **[Configuration System Documentation](docs/configuration_system.md)**

## 🗓️ Weekly Scraping & Production Operations

**Production-ready scraping system** with automatic stale data management and monitoring.

**Quick setup:**
```bash
# Set up weekly cron job
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run-all
```

**For complete production operations guide**, see: **[Weekly Scraping Guide](docs/weekly_scraping_guide.md)**

## 📚 Documentation Index

### 🚀 Getting Started
- **[Installation Guide](docs/installation_guide.md)** - Complete setup for development and production
- **[API Reference](docs/api_reference.md)** - Comprehensive API documentation with examples
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

### 🏗️ Architecture & Development
- **[Project Overview](docs/project_overview.md)** - High-level architecture and design decisions
- **[Frontend Architecture](docs/frontend_architecture.md)** - Next.js 15 components and patterns
- **[Scraper Design](docs/scraper_design.md)** - Configuration-driven scraper architecture
- **[Development Workflow](docs/development_workflow.md)** - TDD methodology and best practices

### 🔧 Configuration & Operations
- **[Configuration System](docs/configuration_system.md)** - YAML-based organization setup
- **[Weekly Scraping Guide](docs/weekly_scraping_guide.md)** - Production operations and monitoring
- **[Database Migration History](database/migration_history.md)** - All schema changes and migrations

### 🧪 Testing & Quality
- **[Testing Guide](TESTING.md)** - Comprehensive testing strategy (259 backend + 1,249 frontend tests)
- **[Test Optimization Guide](docs/test_optimization_guide.md)** - Performance and speed optimization
- **[Performance Optimization](docs/performance_optimization_guide.md)** - Mobile, accessibility, and Core Web Vitals

### 🚨 Troubleshooting & Monitoring
- **[Troubleshooting Guide](docs/troubleshooting_guide.md)** - Common issues and solutions
- **[Navigation Troubleshooting](docs/navigation_troubleshooting_guide.md)** - Hero image loading fixes
- **[Production Deployment](docs/production_deployment.md)** - Deployment and monitoring setup

### 📱 Features & Implementation
- **[CTA Optimization](docs/cta_optimization_guide.md)** - Favorites, toast notifications, mobile UX
- **[Related Dogs Feature](docs/related_dogs_feature.md)** - Cross-discovery implementation
- **[Data Standardization](docs/data_standardization.md)** - Breed, age, and size normalization

### 📝 Project Management
- **[Development Log](DEVELOPMENT_LOG.md)** - Feature timeline and change tracking
- **[Frontend Documentation](frontend/README.md)** - Frontend-specific setup and patterns

### 🔍 Quick Reference
- **Current Status**: 3 active organizations, 414 animals, 259 backend + 1,249 frontend tests
- **API Version**: 0.1.0
- **Frontend**: Next.js 15 with App Router
- **Backend**: FastAPI with PostgreSQL
- **Testing**: TDD approach with comprehensive coverage