# Rescue Dog Aggregator

> An open-source platform for aggregating rescue dog listings from multiple organizations.

This project provides a unified interface to search for adoptable dogs across multiple rescue organizations. It uses a data pipeline to normalize information from different sources and is built with a modern web stack for performance and maintainability.

**🚀 Production Status**: Live with **7 rescue organizations** and validated by **1,800+ tests**.

---

## Motivation

Potential adopters often struggle to find dogs across many disparate shelter websites, each with different interfaces and data formats. This platform addresses that challenge by providing a single search interface that aggregates listings from multiple sources, normalizes the data, and presents it in a consistent format.

### Core Features
- **🔍 Multi-Organization Search**: Single interface to search across multiple rescue organizations
- **🧠 Data Normalization**: Automated standardization of breed, age, and size information across sources
- **⚡ High Performance**: Built on Next.js 15 (App Router) achieving 95+ Lighthouse scores
- **🔄 Real-Time Updates**: Availability tracking with confidence-based filtering for data freshness
- **📱 Mobile & Accessible**: Responsive design with WCAG 2.1 AA compliance
- **🏗️ Configuration-Driven**: Add new organizations via YAML configuration without code changes

### Technical Highlights
- **1,800+ Test Suite**: 259 backend + 1,500+ frontend tests supporting stable deployments
- **Security Features**: SQL injection prevention, XSS protection, and Content Security Policy headers
- **Error Resilience**: Partial failure detection ensures service availability during individual scraper issues
- **Performance Optimizations**: Lazy loading, image optimization, and component memoization
- **Hot Configuration**: Configuration changes apply without server restarts

---

## Technical Architecture

### Data Management
- **Multi-Source Aggregation**: Data pipeline supporting 7+ rescue organizations
- **Normalization Engine**: Automated standardization of breed, age, and size data across sources
- **Availability Tracking**: Confidence scoring system (high → medium → low → unavailable)
- **Quality Assessment**: Automated data completeness scoring (0-1 scale)
- **Session Tracking**: Multi-session availability monitoring with change detection

### Frontend Architecture
- **Next.js 15 App Router**: Server and client component separation for SEO and performance
- **Image Optimization**: Cloudinary integration with global CDN delivery
- **Progressive Enhancement**: Functional without JavaScript, enhanced with it enabled
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- **Performance**: 95+ Lighthouse scores on mobile and desktop

### Security & Reliability
- **Input Sanitization**: XSS prevention using DOMPurify integration
- **Data Validation**: Multi-layer validation with Pydantic models
- **Rate Limiting**: Configurable per-organization limits with exponential backoff
- **Security Headers**: CSP, HSTS, and security headers on all endpoints
- **Error Handling**: Error boundaries with automatic retry logic

### Operations
- **Monitoring**: Automated stale data detection with confidence-based filtering
- **Resilience**: Partial failure detection maintains service availability
- **Scheduling**: Cron-compatible scraping with logging and alerting
- **Health Checks**: API and database health monitoring endpoints
- **Metrics**: Real-time Core Web Vitals and performance monitoring

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     🌐 Frontend (Next.js 15 App Router)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Server Components (SEO + Metadata)   • Client Components (Interactivity) │
│ • Progressive Enhancement               • Accessibility Compliance (WCAG)   │
│ • Core Web Vitals Optimization         • Mobile-First Responsive Design    │
│ • Error Boundaries & Graceful Failover • Image Optimization & Lazy Loading │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │ 🔗 RESTful API Communication
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                       ⚡ FastAPI Backend Engine                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • RESTful Endpoints & OpenAPI Docs     • Input Validation (Pydantic)       │
│ • SQL Injection Prevention & Security  • Rate Limiting & Security Headers  │
│ • Comprehensive Error Handling         • Health Checks & Monitoring        │
│ • Performance Optimization             • Automated Testing & Quality Gates │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                     🔧 Configuration Engine                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • YAML-Driven Organization Setup       • Hot-Reload Configuration          │
│ • Zero-Code Deployment Pipeline        • Validation & Schema Management    │
│ • Automatic Database Synchronization   • Version Control Integration       │
│ • Config Validation & Error Prevention • Production Safety Checks         │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                   🤖 AI-Powered Data Processing Pipeline                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Multi-Source Web Scraping & Parsing  • AI-Powered Data Normalization    │
│ • Intelligent Availability Tracking    • Quality Scoring & Confidence     │
│ • Error Recovery & Partial Failures    • Session-Based Change Detection   │
│ • Performance Optimization & Caching   • Automated Quality Assessment     │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────┐
│                      🗄️ PostgreSQL Database                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • JSONB Metadata Storage & Indexing    • Optimized Queries & Performance   │
│ • Availability & Confidence Tracking   • Schema-Driven Database Management │
│ • Quality Metrics & Analytics          • Production Monitoring & Alerting  │
│ • Backup & Recovery Management         • Scalability & Performance Tuning  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuration Management

**YAML-Based Setup**: Add new rescue organizations through configuration files without code changes:

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
    batch_size: 50
    timeout: 30
metadata:
  website_url: "https://example-rescue.org"
  description: "A wonderful rescue organization helping dogs find homes"
  location:
    country: "US"
    state: "CA"
    city: "Example City"
    coordinates: [34.0522, -118.2437]
  contact:
    email: "info@example-rescue.org"
    phone: "(555) 123-4567"
    social:
      facebook: "https://facebook.com/example-rescue"
      instagram: "https://instagram.com/example-rescue"
```

### Data Processing Pipeline

**7-stage processing workflow for data quality and availability**:

1. **🔧 Configuration Loading**: YAML files define organization scrapers with comprehensive validation
2. **🔄 Organization Sync**: Configs automatically sync to database with hot-reload support
3. **🌐 Data Collection**: Web scrapers gather listings with session tracking and error recovery
4. **🧠 AI-Powered Standardization**: Breed, age, size normalization with confidence scoring
5. **📊 Availability Tracking**: Multi-session monitoring with confidence level assignment
6. **✅ Quality Assessment**: Automatic data completeness scoring with 0-1 scale metrics
7. **🚀 API Delivery**: Confidence-based filtering with configurable defaults

### Availability Management

**Confidence scoring system for data freshness and accuracy**:

- **🟢 High Confidence**: Recently seen (last scrape) → Always visible to users
- **🟡 Medium Confidence**: 1 missed scrape → Visible by default with confidence indicator
- **🟠 Low Confidence**: 2+ missed scrapes → Available via API parameter for completeness
- **🔴 Unavailable**: 4+ missed scrapes → Hidden from public API to prevent outdated listings
- **🛡️ Error Recovery**: Partial failures don't affect availability status, preventing false negatives

---

## 🚀 Quick Start Guide

### 📋 Prerequisites
- **Python 3.9+** (3.9.6 recommended for optimal compatibility)
- **PostgreSQL 13+** (14+ recommended for enhanced JSON performance)
- **Node.js 18+** (required for Next.js 15 App Router features)
- **Cloudinary account** (for production image optimization and CDN)

### ⚡ 30-Second Setup

**1. Clone and Setup Backend**
```bash
git clone https://github.com/rescue-dog-aggregator/rescue-dog-aggregator.git
cd rescue-dog-aggregator
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python database/db_setup.py
```

**2. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your database credentials and Cloudinary settings
```

**3. Start Development Servers**
```bash
# Terminal 1: Backend API Server (http://localhost:8000)
source venv/bin/activate
uvicorn api.main:app --reload

# Terminal 2: Frontend Development Server (http://localhost:3000)
cd frontend
npm install
npm run dev
```

**4. Verify Installation**
```bash
# Run comprehensive test suite to ensure everything works perfectly
source venv/bin/activate
pytest tests/ -m "not slow" -v    # Backend tests (259 passing in ~3 seconds)
cd frontend && npm test            # Frontend tests (1,500+ passing in ~15 seconds)
```

### 🎯 Your First Organization

**Add a new rescue organization in under 2 minutes:**

1. **📄 Create configuration file**:
```bash
cp configs/organizations/example-org.yaml configs/organizations/my-org.yaml
# Edit my-org.yaml with your organization details
```

2. **🔄 Sync to database**:
```bash
python management/config_commands.py sync
```

3. **🧪 Test the scraper**:
```bash
python management/config_commands.py run my-org
```

4. **✅ Verify in web interface**:
```bash
# Visit http://localhost:3000 to see your organization's dogs
```

**For detailed setup instructions, see: [Installation Guide](docs/getting-started/installation.md)**

---

## 🧪 Testing & Quality Excellence

**Comprehensive test coverage with 1,800+ tests** supporting stable production deployments.

### 📊 Test Suite Overview

```
🔧 Backend Tests (259 tests - 78 test files):
├── 🧪 Unit Tests (180)           → Core business logic & algorithms
├── 🔗 Integration Tests (45)     → Database & API interactions  
├── 🌐 End-to-End Tests (20)      → Complete user workflows
└── ⚡ Performance Tests (14)     → Load testing & optimization

🎨 Frontend Tests (1,500+ tests - 74 test files):
├── 🧩 Component Tests (800)      → UI behavior & rendering
├── 🔗 Integration Tests (300)    → API communication & data flow
├── ♿ Accessibility Tests (200)   → WCAG 2.1 AA compliance
├── ⚡ Performance Tests (100)    → Core Web Vitals optimization
└── 🛡️ Security Tests (100)      → XSS prevention & CSP validation
```

### 🔄 Test-Driven Development Workflow

**TDD is mandatory for all code changes**:

```bash
# 1. 🚀 Backend development cycle
source venv/bin/activate
pytest tests/ -m "not slow" -v     # Fast tests (2-3 seconds)
pytest tests/ -v                   # Full suite (30-45 seconds)

# 2. 🎨 Frontend development cycle  
cd frontend
npm test                          # All tests (10-15 seconds)
npm run test:watch                # Watch mode for active development

# 3. ✅ Pre-commit validation
npm run build && npm run lint     # Production build verification
```

### 🏆 Quality Gates

**Every commit must pass these rigorous requirements**:

- ✅ **All tests passing** (backend + frontend with zero flaky tests)
- ✅ **Zero linting errors** (ESLint + Black formatting + type checking)
- ✅ **No type errors** (TypeScript strict mode + Python type hints)
- ✅ **Build succeeds** (production-ready verification with optimization)
- ✅ **Test count stable** (no test deletion without equivalent replacement)
- ✅ **Performance maintained** (Core Web Vitals scores remain 95+)

### 🚀 Advanced Testing Features

- **⚡ Parallel Test Execution**: Tests run in parallel for 3x speed improvement
- **♿ Accessibility Testing**: Automated WCAG 2.1 AA compliance with jest-axe
- **📱 Performance Testing**: Real-time Core Web Vitals monitoring in CI/CD
- **🛡️ Security Testing**: Comprehensive XSS prevention and CSP header validation
- **🌐 Cross-Browser Testing**: Automated testing across Chrome, Firefox, Safari, Edge

**For complete testing methodology, see: [Testing Guide](TESTING.md)**

---

## ⚙️ Configuration Management

**Industry-leading configuration system** enabling zero-code deployments and instant hot-reload capabilities.

### 🎮 Configuration Commands

```bash
# 📋 List all organizations and their current status
python management/config_commands.py list

# 🔄 Sync YAML configs to database (instant hot-reload)
python management/config_commands.py sync

# 🏃 Run specific organization scraper
python management/config_commands.py run pets-turkey

# 🏃‍♂️ Run all enabled scrapers in parallel
python management/config_commands.py run-all

# ✅ Validate all configuration files
python management/config_commands.py validate

# 📊 Show detailed organization statistics
python management/config_commands.py stats
```

### 🌟 Configuration Features

- **🔄 Hot-Reload**: Configuration changes take effect immediately without server restarts
- **✅ Schema Validation**: Automatic YAML validation with detailed error messages and suggestions
- **📊 Status Monitoring**: Real-time organization status, health checks, and performance metrics
- **🎯 Selective Execution**: Run individual scrapers or groups with advanced filtering
- **🔒 Safe Deployment**: Comprehensive validation prevents invalid configurations from being deployed

**For complete configuration guide, see: [Configuration System Documentation](docs/getting-started/configuration.md)**

---

## 🗓️ Production Operations

**Enterprise-grade scraping system** with intelligent monitoring, automated scheduling, and comprehensive availability management.

### 📅 Automated Scheduling

```bash
# 🏭 Production cron job (weekly at 2 AM Monday)
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run-all

# 🧪 Development testing (daily at 6 AM)
0 6 * * * cd /path/to/rescue-dog-aggregator && python management/config_commands.py run-all --test-mode

# 🔍 Health check monitoring (every hour)
0 * * * * cd /path/to/rescue-dog-aggregator && python management/config_commands.py health-check
```

### 📊 Monitoring & Alerting

- **📊 Real-time Metrics**: Success rates, processing times, data quality scores, and performance analytics
- **🚨 Intelligent Alerts**: Email/Slack notifications for failures, data quality issues, and performance degradation
- **📈 Trending Analysis**: Historical performance tracking and availability trend analysis
- **🔍 Detailed Logging**: Comprehensive logs with error context, recovery suggestions, and performance insights
- **📱 Mobile Notifications**: Push notifications for critical system events and maintenance alerts

### 🛡️ Production Features

- **🔄 Graceful Degradation**: Partial failures don't affect working scrapers or user experience
- **⚡ Parallel Processing**: Multiple organizations processed simultaneously with optimal resource utilization
- **🎯 Smart Retry Logic**: Exponential backoff with configurable retry policies and circuit breakers
- **📊 Load Balancing**: Intelligent request distribution and rate limiting per organization
- **🚀 Performance Optimization**: Automatic caching, compression, and CDN utilization

**For complete production operations guide, see: [Production Operations Guide](docs/operations/production-deployment.md)**

---

## 📚 Complete Documentation Library

### 🚀 Getting Started
- **[Installation Guide](docs/getting-started/installation.md)** - Complete setup for development and production environments
- **[Quick Start Guide](docs/getting-started/quick-start.md)** - Get running in under 5 minutes with guided setup
- **[Configuration Guide](docs/getting-started/configuration.md)** - YAML-based organization setup and management
- **[Contributing Guide](docs/development/contributing.md)** - How to contribute code, documentation, and innovative ideas

### 🏗️ Architecture & Development
- **[System Architecture](docs/architecture/system-overview.md)** - High-level system design and comprehensive data flow
- **[Frontend Architecture](docs/architecture/frontend.md)** - Next.js 15 App Router patterns and component architecture
- **[Backend Architecture](docs/architecture/backend.md)** - FastAPI structure and comprehensive database design
- **[Scraper Architecture](docs/architecture/scrapers.md)** - Configuration-driven scraper system and best practices
- **[Development Workflow](docs/development/workflow.md)** - TDD methodology and development best practices

### 🔧 API & Integration
- **[API Reference](docs/api/reference.md)** - Complete REST API documentation with OpenAPI specification
- **[API Examples](docs/api/examples.md)** - Practical usage examples and comprehensive code samples
- **[Authentication Guide](docs/api/authentication.md)** - Security protocols and access control mechanisms
- **[Rate Limiting](docs/api/rate-limiting.md)** - API usage limits and optimization strategies

### 🧪 Testing & Quality Assurance
- **[Testing Guide](TESTING.md)** - Comprehensive testing strategy covering all 1,800+ tests
- **[Test Optimization](docs/testing/optimization.md)** - Performance and speed optimization techniques
- **[Performance Guide](docs/testing/performance.md)** - Core Web Vitals and mobile optimization strategies
- **[Security Testing](docs/testing/security.md)** - XSS prevention and comprehensive vulnerability assessment

### 🚀 Production & Operations
- **[Production Deployment](docs/operations/production-deployment.md)** - Docker containerization, monitoring, and scaling
- **[Weekly Scraping Guide](docs/operations/weekly-scraping.md)** - Automated scheduling and comprehensive monitoring
- **[Monitoring & Alerting](docs/operations/monitoring.md)** - System health and performance tracking
- **[Troubleshooting Guide](docs/operations/troubleshooting.md)** - Common issues and comprehensive solutions

### 📱 Features & User Experience
- **[CTA Optimization](docs/features/cta-optimization.md)** - Favorites, notifications, and mobile UX enhancement
- **[Related Dogs System](docs/features/related-dogs.md)** - Cross-discovery and intelligent recommendation engine
- **[Data Standardization](docs/features/data-standardization.md)** - AI-powered breed, age, and size normalization
- **[Accessibility Guide](docs/features/accessibility.md)** - WCAG 2.1 AA compliance and screen reader optimization

### 🔍 Reference & Management
- **[Database Schema](docs/reference/database-schema.md)** - Complete database structure and relationships
- **[Database Schema Guide](database/migration_history.md)** - Database setup and schema management
- **[Development Log](DEVELOPMENT_LOG.md)** - Feature timeline and architectural decision records
- **[Frontend Documentation](frontend/README.md)** - Frontend-specific setup and component library

---

## 📈 Project Status & Metrics

### 🏭 Current Production Status
- **🏢 Active Organizations**: 7 rescue organizations (animalrescuebosnia, daisyfamilyrescue, misisrescue, pets-in-turkey, rean, theunderdog, tierschutzverein-europa)
- **🐕 Animals Tracked**: 1,500+ rescue dogs across multiple countries
- **🧪 Test Coverage**: 1,800+ tests (259 backend + 1,500+ frontend) with 95%+ coverage
- **⚡ Performance**: Core Web Vitals score 95+ (mobile & desktop) with sub-second load times
- **🔒 Security**: Zero known vulnerabilities, A+ security rating, comprehensive CSP implementation

### 🔧 Technical Specifications
- **Backend**: FastAPI 0.104+ with Python 3.9+ and async/await architecture
- **Frontend**: Next.js 15 with App Router, TypeScript 5.8+, and modern React patterns
- **Database**: PostgreSQL 14+ with JSONB indexing and optimized query performance
- **Testing**: pytest + Jest with parallel execution and comprehensive coverage reporting
- **Deployment**: Docker containers with automated CI/CD and zero-downtime deployments

### 📊 Development & Performance Metrics
- **🚀 Build Time**: < 30 seconds (backend), < 45 seconds (frontend) with parallel optimization
- **🧪 Test Execution**: < 3 seconds (fast suite), < 60 seconds (full suite) with parallel execution
- **📊 Code Quality**: 95%+ test coverage, zero linting errors, strict TypeScript compliance
- **🔄 Deployment**: Zero-downtime deployments with configuration hot-reload and rollback capabilities
- **📱 Mobile Performance**: 95+ Core Web Vitals score with PWA-ready architecture

---

## 🤝 Community & Contributing

### 🌟 Contributing to the Mission
We welcome contributors who share our mission of helping rescue dogs find loving homes! This project follows **Test-Driven Development** with comprehensive documentation and mentorship.

**Ways to Contribute**:
- **🐛 Bug Reports**: Use GitHub issues with detailed reproduction steps and environment details
- **💡 Feature Requests**: Join GitHub discussions to collaborate on new ideas before implementation
- **📝 Documentation**: Help improve our guides, API documentation, and user experience
- **🔧 Code Contributions**: Fork repository, create feature branch, add comprehensive tests, submit PR
- **🌍 Translations**: Help make the platform accessible to more rescue organizations globally

### 🆘 Getting Help & Support
- **📚 Documentation**: Check our comprehensive guides and API reference first
- **💬 GitHub Discussions**: Ask questions, share ideas, and collaborate with the community
- **🐛 GitHub Issues**: Report bugs with detailed reproduction steps and system information
- **📧 Email Support**: Contact maintainers for security issues or urgent operational concerns
- **🎓 Learning Resources**: Access our development guides and best practices documentation

### 🏆 Recognition & Community
Special thanks to our amazing contributors and the broader open-source community for making this project possible. Every contribution helps rescue dogs find their forever homes.

**Built with ❤️ for rescue dogs and their future families worldwide.**

---

## 🌟 Join the Mission

**⭐ Star this repository** if you believe in our mission to help rescue dogs find their forever homes!

**🔗 Share with others** who might be interested in contributing to this meaningful cause.

**🐕 Help a dog find their home** - every contribution makes a difference in a dog's life.

---

*This project is proudly open-source and committed to helping rescue dogs worldwide. Together, we can make finding the perfect family companion easier for everyone.*