# Operations Documentation

This section contains guides for production deployment, monitoring, maintenance, and operational procedures for the Rescue Dog Aggregator platform.

## 📋 Documents in this Section

### 🚀 Deployment & Operations
- **[Production Deployment](production-deployment.md)** - Production setup and deployment procedures
- **[Weekly Scraping](weekly-scraping.md)** - Automated scraping operations and monitoring
- **[Troubleshooting](troubleshooting.md)** - Common issues and resolution procedures
- **[Monitoring](monitoring.md)** - System monitoring and alerting setup

## 🔗 Related Documentation
- **[Configuration Guide](../getting-started/configuration.md)** - Environment configuration
- **[Architecture Overview](../architecture/system-overview.md)** - System architecture for operators
- **[API Reference](../api/reference.md)** - API monitoring and health checks
- **[Development Workflow](../development/workflow.md)** - Development practices and testing

## 🏭 Production Environment

### Current Platform Scale
- **Organizations**: 8 active rescue organizations across multiple countries
- **Backend**: 99+ test files covering API, scrapers, services, and integrations
- **Frontend**: 384+ test files ensuring UI reliability and performance
- **Architecture**: Modern service-oriented design with dependency injection

### System Requirements
- **Infrastructure**: Linux server with 16GB RAM, 4+ CPU cores
- **Database**: PostgreSQL 14+ with automated backups and session isolation
- **CDN**: R2 + Cloudflare Images for image optimization and delivery
- **Browser Automation**: Selenium WebDriver for advanced scraping
- **Monitoring**: Application performance monitoring with health checks

### Quality Standards
- **Code Quality**: <750 flake8 violations (actively maintained)
- **Test Coverage**: 99+ backend tests, 384+ frontend tests
- **Performance**: 95+ Core Web Vitals score
- **Security**: Zero security incidents with automated input sanitization
- **Data Quality**: 95%+ data standardization accuracy with quality scoring

## 🔄 Operational Procedures

### Modern Architecture Features
- **BaseScraper Refactoring**: Service injection with Null Object Pattern, Context Manager, and Template Method
- **Database Isolation**: Global test protection via `conftest.py` prevents production contamination
- **Session Management**: Advanced tracking for availability confidence and stale data detection
- **Quality Scoring**: Automated data quality assessment with configurable thresholds

### Regular Operations
1. **Weekly Scraping**: Automated data collection from 8 rescue organizations
2. **Health Monitoring**: Continuous system health checks with `/health` endpoint
3. **Performance Monitoring**: Core Web Vitals and API performance tracking
4. **Security Monitoring**: Threat detection with input sanitization and XSS prevention
5. **Availability Management**: Dynamic confidence scoring (high/medium/low) for animal status

### Maintenance Tasks
- **Database Maintenance**: Weekly optimization and cleanup with schema migrations
- **Test Suite Maintenance**: 99+ backend tests, 384+ frontend tests with markers optimization
- **Log Management**: Automated log rotation and archival
- **Backup Verification**: Regular backup testing and validation
- **Security Updates**: Automated dependency updates with vulnerability scanning
- **Code Quality**: Maintain <750 flake8 violations through automated tooling

## 📊 Monitoring & Alerting

### Real-Time Monitoring
- **System Health**: CPU, memory, disk usage with health check endpoints
- **Application Metrics**: Request rates, response times, error rates
- **Database Performance**: Query performance, connection health, and isolation verification
- **Scraper Performance**: Success rates, data quality scores, and failure detection
- **User Experience**: Core Web Vitals and user journey tracking
- **Availability System**: Confidence transitions and stale data detection

### Modern Monitoring Features
- **Quality Scoring**: Real-time data quality assessment and trending
- **Session Tracking**: Animal availability confidence and scraping session management
- **Failure Detection**: Automated partial failure detection with configurable thresholds
- **Service Health**: Dependency injection and null object pattern monitoring

### Alert Categories
- **Critical**: System down, security breach, data corruption, test suite failures
- **Warning**: Performance degradation, error rate increase, quality score decline
- **Info**: Successful deployments, maintenance completions, scraper status updates

## 🆘 Emergency Procedures

### Incident Response
1. **Assessment**: Determine impact and severity using monitoring dashboards
2. **Communication**: Notify stakeholders and users through established channels
3. **Resolution**: Follow troubleshooting procedures and run emergency tests
4. **Recovery**: Restore service, verify functionality with test suite
5. **Post-Mortem**: Document lessons learned and update procedures

### Emergency Diagnostic Commands
```bash
# ALWAYS activate virtual environment first
source venv/bin/activate

# Quick system health check
python -m pytest tests/ -m "not slow" --tb=no -q  # 99+ tests
cd frontend && npm test --passWithNoTests         # 384+ tests

# Database and availability system check  
python database/check_db_status.py
python -c "from tests.conftest import isolate_database_writes; print('DB isolation active')"

# Configuration and scraper validation
python management/config_commands.py validate
python management/config_commands.py list  # 8 organizations
```

### Emergency Contacts
- **Technical Lead**: Primary technical escalation and architecture decisions
- **DevOps Team**: Infrastructure, deployment, and monitoring issues
- **Security Team**: Security incident response and vulnerability management
- **QA Team**: Test suite failures and quality assurance issues

---

*Navigate back to [Documentation Home](../README.md)*