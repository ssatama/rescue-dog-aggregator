# Rescue Dog Aggregator

An open-source web platform that aggregates rescue dogs from multiple organizations using a **flexible configuration system**, standardizes the data, and presents it in a user-friendly Next.js interface.

## 🌟 Key Features

- **🔧 Configuration-Driven Architecture**: Add new rescue organizations via YAML config files
- **🔄 Automatic Data Standardization**: Breed, age, and size normalization across sources
- **☁️ Cloudinary Image Processing**: Automated image optimization and CDN delivery
- **🔒 Production-Ready Security**: SQL injection prevention, input validation, comprehensive error handling
- **🧪 Comprehensive Testing**: 93%+ test coverage including integration, security, and resilience tests
- **🌐 Tech Stack**: FastAPI backend, Next.js frontend, PostgreSQL database

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
3. **Data Collection**: Scrapers gather dog listings from websites
4. **Standardization**: AI-powered normalization of breed, age, size data
5. **API Exposure**: RESTful endpoints serve standardized data
6. **Frontend Display**: React interface with advanced filtering

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL
- Node.js 16+
- Cloudinary account (for image processing)

### Backend Setup

1. **Environment Configuration**
   ```bash
   cp .env.sample .env
   # Edit .env with your database and Cloudinary credentials
   ```

2. **Database Initialization**
   ```bash
   python main.py --setup
   ```

3. **Add Organizations**
   ```bash
   # Add organization configs to configs/organizations/
   python manage.py sync-organizations
   ```

4. **Run Scrapers**
   ```bash
   python manage.py run-scraper pets-in-turkey
   # or run all enabled scrapers:
   python manage.py run-all-scrapers
   ```

5. **Start API Server**
   ```bash
   uvicorn api.main:app --reload --port 8000
   ```

6. **Important CORS Configuration:**

  - ALLOWED_ORIGINS: Comma-separated list of allowed frontend URLs
  - ENVIRONMENT: Set to 'development' or 'production'
  - Example: ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## 🔧 Configuration Management

### Adding New Organizations

1. **Create Config File**
   ```bash
   # Create configs/organizations/new-org.yaml
   python manage.py validate-configs  # Verify syntax
   ```

2. **Sync to Database**
   ```bash
   python manage.py sync-organizations
   ```

3. **Implement Scraper** (if needed)
   ```python
   # scrapers/new_org/scraper.py
   from scrapers.base_scraper import BaseScraper
   
   class NewOrgScraper(BaseScraper):
       def collect_data(self):
           # Implementation here
           pass
   ```

### Management Commands

```bash
# List all organizations
python manage.py list-organizations

# Show specific organization details  
python manage.py show-organization pets-in-turkey

# Validate all config files
python manage.py validate-configs

# Sync configs to database (dry run)
python manage.py sync-organizations --dry-run
```

## 🔒 Security Configuration

### CORS Setup
The API implements strict CORS policies for production security:

- **Development**: Defaults to `http://localhost:3000` if not configured
- **Production**: Requires explicit `ALLOWED_ORIGINS` configuration
- Configure via environment variables in `.env`
- Multiple origins supported (comma-separated)

### Environment Variables
See `.env.sample` for all configuration options including:
- Database credentials
- CORS allowed origins
- Cloudinary API keys
- Environment mode (development/production)

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
pytest

# Run specific test suites
pytest tests/config/ -v          # Config system tests
pytest tests/integration/ -v     # Integration tests
pytest tests/security/ -v        # Security tests
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Data Standardization

The system automatically standardizes:

- **Breeds**: Maps variants to standard names + breed groups
- **Ages**: Converts text to month ranges + categories (Puppy/Young/Adult/Senior)  
- **Sizes**: Normalizes to consistent categories (Tiny/Small/Medium/Large/XL)

See [docs/data_standardization.md](docs/data_standardization.md) for details.

## 🚀 Production Deployment

See [docs/production_deployment.md](docs/production_deployment.md) for comprehensive production setup including:

- Environment configuration
- Security hardening
- Monitoring setup
- Performance optimization

---

**Built with ❤️ to help rescue dogs find their forever homes** 🐕