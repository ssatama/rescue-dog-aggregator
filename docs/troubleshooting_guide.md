# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the Rescue Dog Aggregator platform, covering common issues across backend scrapers, frontend application, database operations, and production deployments.

## 🚨 CRITICAL: Recent Issue Resolution (December 2024)

### Backend Test Infrastructure Failures

**Error**: Multiple pytest failures in configuration and filesystem validation tests
**Impact**: 7 out of 7 backend validation tests failing, preventing development workflow
**Root Cause**: Schema detection patterns, path handling inconsistencies, requirements file validation

**SYSTEMATIC SOLUTION** (Proven Fix):
```bash
# 1. Apply comprehensive test infrastructure fixes
source venv/bin/activate

# 2. Verify all 7 previously failing tests now pass
python -m pytest tests/config/test_configuration_validation.py -v
python -m pytest tests/filesystem/test_file_integrity.py -v

# 3. Run speed-optimized complete test suite
python -m pytest tests/ -m "not slow" -v  # 217 tests in ~45s

# 4. Verify test performance improvements
python -m pytest tests/ -m "unit" -v      # 60+ tests in ~1s
```

**Key Fixes Applied**:
- **Database Schema Detection**: Enhanced to handle "CREATE TABLE IF NOT EXISTS" patterns
- **Requirements File Validation**: Added support for pip includes (`-r requirements.txt`) and options
- **Path Handling**: Fixed cross-platform compatibility using consistent pathlib.Path methods
- **Directory Filtering**: Added comprehensive exclusion for __pycache__ and development artifacts
- **Sensitive File Detection**: Refined to allow development .env files while maintaining security
- **Module Conflict Logic**: Improved to check conflicts only within same namespace

**Prevention**: Use the new speed-optimized testing workflow for development:
```bash
# Fast development cycle (recommended)
python -m pytest tests/ -m "unit" -v                 # Core logic validation (~1s)
python -m pytest tests/ -m "not slow" -v             # Complete fast suite (~45s)
```

### Next.js 15 TypeScript Build Failures

**Error**: `Type '{} | undefined' does not satisfy the constraint 'PageProps'`
**Impact**: Complete frontend build failure, prevents deployment
**Root Cause**: Next.js 15 async params requirement conflicts with Jest testing

**IMMEDIATE SOLUTION** (Proven Fix):
```bash
# 1. Apply environment-aware component pattern to dynamic routes
# Files to update: src/app/dogs/[id]/page.jsx, src/app/organizations/[id]/page.jsx

# 2. Test the fix
cd frontend
npm test && npm run build

# 3. Verify no TypeScript errors
npm run lint
```

**Prevention**: ALWAYS use environment-aware pattern for dynamic routes (see CLAUDE.md)

### Mass Python Linting Violations

**Error**: 1000+ linting errors (E501, F401, W291, E402, F541)
**Impact**: Inconsistent code quality, development friction
**Root Cause**: Accumulated technical debt from inconsistent formatting

**SYSTEMATIC SOLUTION** (Proven Effective):
```bash
# 1. Install automated tools
source venv/bin/activate && pip install autopep8 unimport

# 2. Automated cleanup (fixes 90%+ of violations)
autopep8 --in-place --select=W291,W292,W293,E302,E261,E203 --recursive --exclude=venv .
unimport --remove --exclude venv .
autopep8 --in-place --aggressive --exclude=venv --recursive .

# 3. Verify improvement
flake8 --exclude=venv . | wc -l  # Should be <750

# 4. Test functionality
python -m pytest tests/ -m "not slow" -v
```

**Current Standards** (ENFORCED):
- E501 (line too long): ≤750 violations (acceptable for SQL/URLs)
- F401 (unused imports): 0 violations (MANDATORY)
- W291/W293 (whitespace): ≤5 violations
- E402 (import ordering): 0 violations (MANDATORY)

## Quick Diagnosis Commands

### System Health Check

```bash
# Backend health check
source venv/bin/activate
python database/check_db_status.py

# Frontend health check
cd frontend
npm test && npm run build

# Database connectivity
psql -h localhost -d rescue_dogs -c "SELECT COUNT(*) FROM animals WHERE status='available';"

# Configuration validation
python management/config_commands.py validate
```

## Scraper Issues

### Unified DOM Extraction Problems

#### Issue: Images not associating correctly with dogs
**Symptoms**: Dogs getting wrong images, "off by one" association errors

**Diagnosis**:
```bash
# Check if unified extraction is being used
python management/config_commands.py run rean --verbose

# Look for these log messages:
# "Starting unified browser extraction"
# "Found X dog containers in DOM"
# "Successfully extracted dog: [name]"
```

**Solutions**:
1. **Verify container detection**:
   ```python
   # Check CSS selectors are working
   # Look for: div.x-el-article, div.x.c1-5
   ```

2. **Test with real data**:
   ```bash
   # Run unified extraction test
   python -m pytest tests/scrapers/test_rean_unified_extraction.py::test_unified_extraction_end_to_end_realistic -v
   ```

3. **Fallback verification**:
   ```bash
   # Check if fallback to legacy method is working
   # Should see: "Falling back to legacy extraction method..."
   ```

#### Issue: Lazy loading not triggering properly
**Symptoms**: Missing images, placeholder images in results

**Diagnosis**:
```bash
# Check browser automation logs
grep "lazy loading" logs/scraper.log

# Verify scrolling pattern
grep "scrollTo" logs/scraper.log
```

**Solutions**:
1. **Increase scroll delays**:
   ```python
   # In _trigger_comprehensive_lazy_loading()
   time.sleep(3)  # Increase from default 2s
   ```

2. **Add more scroll cycles**:
   ```python
   # Multiple scroll patterns
   for _ in range(3):  # Increase cycles
       self._trigger_comprehensive_lazy_loading(driver)
   ```

### Traditional Scraper Issues

#### Issue: "No animals found" when website has content
**Symptoms**: Scraper returns empty results despite visible dogs on website

**Diagnosis Steps**:
1. **Check website accessibility**:
   ```bash
   curl -I https://organization-website.com
   ```

2. **Verify scraper configuration**:
   ```bash
   python management/config_commands.py show organization-name
   ```

3. **Test individual components**:
   ```python
   # Test HTML extraction
   scraper = OrgScraper()
   html = scraper.scrape_page("https://url")
   print(len(html) if html else "Failed to get HTML")
   ```

**Common Solutions**:
1. **Update CSS selectors**: Website structure may have changed
2. **Add rate limiting**: May be hitting rate limits
3. **User-Agent issues**: Try different User-Agent strings
4. **JavaScript dependency**: Website may require browser automation

#### Issue: Intermittent failures during scraping
**Symptoms**: Scraper works sometimes but fails randomly

**Diagnosis**:
```bash
# Check error patterns in logs
grep "ERROR" logs/scraper.log | tail -20

# Check network issues
python -c "
import requests
try:
    resp = requests.get('https://website.com', timeout=30)
    print(f'Status: {resp.status_code}')
except Exception as e:
    print(f'Error: {e}')
"
```

**Solutions**:
1. **Increase timeouts**:
   ```yaml
   # In config file
   scraper:
     config:
       timeout: 60  # Increase from default 30
   ```

2. **Add retry logic**:
   ```python
   # Already implemented in BaseScraper
   max_retries: 5  # Increase if needed
   ```

3. **Rate limiting**:
   ```yaml
   scraper:
     config:
       rate_limit_delay: 5.0  # Increase delay
   ```

### Database Integration Issues

#### Issue: "Animal already exists" errors
**Symptoms**: New animals not being added, only updates happening

**Diagnosis**:
```bash
# Check external_id conflicts
psql -d rescue_dogs -c "
SELECT external_id, COUNT(*) 
FROM animals 
GROUP BY external_id 
HAVING COUNT(*) > 1;
"
```

**Solutions**:
1. **Review external_id generation**: Ensure uniqueness
2. **Clean up duplicates**: Run data consistency checks
3. **Update logic**: Check if updates are working correctly

#### Issue: Stale data detection not working
**Symptoms**: Unavailable animals still showing as available

**Diagnosis**:
```bash
# Check session tracking
psql -d rescue_dogs -c "
SELECT organization_id, last_session_start, 
       COUNT(*) as animals_seen_recently
FROM animals 
WHERE last_seen_at > NOW() - INTERVAL '7 days'
GROUP BY organization_id, last_session_start;
"

# Check availability transitions
psql -d rescue_dogs -c "
SELECT availability_confidence, COUNT(*) 
FROM animals 
GROUP BY availability_confidence;
"
```

**Solutions**:
1. **Verify session initialization**:
   ```python
   # Ensure start_scrape_session() is called
   self.start_scrape_session()
   ```

2. **Check stale update timing**:
   ```python
   # In finally block
   self.update_stale_data_detection()
   ```

## Frontend Issues

### Next.js App Router Problems

#### Issue: "generateMetadata is not a function" errors
**Symptoms**: Server component errors, metadata not generating

**Diagnosis**:
```bash
# Check component separation
cd frontend
grep -r "use client" src/app/dogs/
grep -r "generateMetadata" src/app/dogs/
```

**Solutions**:
1. **Ensure proper separation**:
   ```javascript
   // page.jsx (Server Component) - NO 'use client'
   export async function generateMetadata({ params }) { ... }
   export default function DogPage({ params }) {
     return <DogDetailClient dogId={params.id} />;
   }
   
   // DogDetailClient.jsx (Client Component)
   'use client';
   export default function DogDetailClient({ dogId }) { ... }
   ```

#### Issue: Hydration errors in production
**Symptoms**: Client/server content mismatch warnings

**Diagnosis**:
```bash
# Check for dynamic content
npm run build
npm start

# Look for hydration warnings in browser console
```

**Solutions**:
1. **Use dynamic imports for client-only content**:
   ```javascript
   import dynamic from 'next/dynamic';
   const ClientOnlyComponent = dynamic(() => import('./ClientComponent'), { ssr: false });
   ```

2. **Ensure consistent server/client rendering**:
   ```javascript
   // Use useEffect for client-only state
   useEffect(() => {
     setClientState(someValue);
   }, []);
   ```

### Security Issues

#### Issue: XSS vulnerabilities in user content
**Symptoms**: Unescaped HTML content, script injection

**Diagnosis**:
```bash
# Run security tests
cd frontend
npm test -- src/__tests__/security/content-sanitization.test.js
```

**Solutions**:
1. **Verify sanitization is applied**:
   ```javascript
   import { sanitizeText, sanitizeHtml } from '@/utils/security';
   
   // For plain text
   const safeName = sanitizeText(dog.name);
   
   // For HTML content
   const safeDescription = sanitizeHtml(dog.about);
   ```

2. **Update sanitization rules**:
   ```javascript
   // In security.js
   ALLOWED_TAGS: ['p', 'br', 'strong', 'em']  // Adjust as needed
   ```

### Performance Issues

#### Issue: Slow image loading
**Symptoms**: Images take long to load, poor user experience

**Diagnosis**:
```bash
# Check lazy loading implementation
cd frontend
npm test -- src/__tests__/performance/optimization.test.jsx

# Verify Cloudinary optimization
grep "getOptimizedImageUrl" src/utils/imageUtils.js
```

**Solutions**:
1. **Verify lazy loading**:
   ```javascript
   // Use LazyImage component
   import LazyImage from '@/components/ui/LazyImage';
   <LazyImage src={dog.image} alt={dog.name} />
   ```

2. **Optimize Cloudinary transforms**:
   ```javascript
   // In imageUtils.js
   const thumbnailUrl = getOptimizedImageUrl(originalUrl, {
     width: 300,
     height: 300,
     crop: 'fill',
     quality: 'auto'
   });
   ```

## Database Issues

### Migration Problems

#### Issue: Missing database columns
**Symptoms**: SQL errors about missing columns like `availability_confidence`

**Diagnosis**:
```bash
# Check current schema
psql -d rescue_dogs -c "\d animals"

# Check migration status
ls database/migrations/
```

**Solutions**:
1. **Apply missing migrations**:
   ```bash
   # Production database
   psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
   psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
   
   # Test database
   DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
   DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
   ```

#### Issue: Database connection failures
**Symptoms**: "Connection refused" or timeout errors

**Diagnosis**:
```bash
# Check PostgreSQL status
systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Test connection
psql -h localhost -d rescue_dogs -c "SELECT 1;"
```

**Solutions**:
1. **Start PostgreSQL service**:
   ```bash
   # Linux
   sudo systemctl start postgresql
   
   # macOS
   brew services start postgresql
   ```

2. **Check connection parameters**:
   ```python
   # In config.py or environment
   DATABASE_URL = "postgresql://user:pass@localhost/rescue_dogs"
   ```

### Performance Issues

#### Issue: Slow API responses
**Symptoms**: Long response times, timeouts

**Diagnosis**:
```bash
# Check database performance
psql -d rescue_dogs -c "
EXPLAIN ANALYZE 
SELECT * FROM animals 
WHERE status='available' AND availability_confidence IN ('high', 'medium')
LIMIT 20;
"
```

**Solutions**:
1. **Add database indexes**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_animals_status_confidence 
   ON animals(status, availability_confidence);
   
   CREATE INDEX IF NOT EXISTS idx_animals_organization_status 
   ON animals(organization_id, status);
   ```

2. **Optimize queries**:
   ```python
   # Use specific field selection
   SELECT name, breed, age_text, primary_image_url 
   FROM animals 
   WHERE ...
   ```

## Configuration Issues

### Config Command Import Errors

#### Issue: "ModuleNotFoundError" when running config commands
**Symptoms**: Commands fail with import errors like `No module named 'utils'` or `No module named 'management'`

**Diagnosis**:
```bash
# Check if __init__.py files exist
ls -la utils/__init__.py management/__init__.py

# Test direct execution
python management/config_commands.py list

# Test module execution
python -m management.config_commands list
```

**Solutions**:
1. **Ensure package files exist**:
   ```bash
   # Create missing __init__.py files
   touch utils/__init__.py
   touch management/__init__.py
   ```

2. **Use direct execution method (recommended)**:
   ```bash
   # This method is more reliable
   python management/config_commands.py list
   python management/config_commands.py sync --dry-run
   python management/config_commands.py validate
   ```

3. **Verify virtual environment**:
   ```bash
   # Ensure venv is activated
   source venv/bin/activate
   which python  # Should point to venv/bin/python
   ```

4. **Check Python path from project root**:
   ```bash
   # Run from project root directory
   pwd  # Should end with rescue-dog-aggregator
   python management/config_commands.py list
   ```

### YAML Configuration Problems

#### Issue: "Schema validation failed" errors
**Symptoms**: Config validation fails, scrapers won't run

**Diagnosis**:
```bash
# Validate specific config
python management/config_commands.py validate organization-name

# Check schema format
cat configs/schemas/organization.schema.json
```

**Solutions**:
1. **Fix YAML syntax**:
   ```yaml
   # Ensure proper indentation and structure
   schema_version: "1.0"
   id: "organization-id"
   name: "Organization Name"
   enabled: true
   ```

2. **Validate required fields**:
   ```yaml
   scraper:
     class_name: "ScraperClass"
     module: "scrapers.org_name"
   metadata:
     website_url: "https://website.com"
   ```

#### Issue: "Module not found" errors
**Symptoms**: Scraper class cannot be imported

**Diagnosis**:
```bash
# Check module structure
ls scrapers/organization_name/
python -c "from scrapers.organization_name import ScraperClass"
```

**Solutions**:
1. **Verify module structure**:
   ```
   scrapers/
   ├── organization_name/
   │   ├── __init__.py
   │   └── scraper.py
   ```

2. **Check import statements**:
   ```python
   # In __init__.py
   from .scraper import ScraperClass
   ```

## Production Deployment Issues

### Environment Issues

#### Issue: Environment variables not loaded
**Symptoms**: Configuration errors, missing API keys

**Diagnosis**:
```bash
# Check environment variables
echo $DATABASE_URL
echo $CLOUDINARY_URL

# Verify .env file
cat .env | grep -v PASSWORD
```

**Solutions**:
1. **Set required variables**:
   ```bash
   export DATABASE_URL="postgresql://..."
   export CLOUDINARY_URL="cloudinary://..."
   ```

2. **Use environment file**:
   ```bash
   # Create .env file
   DATABASE_URL=postgresql://...
   CLOUDINARY_URL=cloudinary://...
   ```

### Memory and Resource Issues

#### Issue: Out of memory errors
**Symptoms**: Process killed, memory exhaustion

**Diagnosis**:
```bash
# Check memory usage
free -h
ps aux | grep python | head -5

# Monitor during scraping
top -p $(pgrep -f "python.*scraper")
```

**Solutions**:
1. **Optimize browser usage**:
   ```python
   # Close browsers promptly
   try:
       driver = webdriver.Chrome()
       # ... scraping logic
   finally:
       driver.quit()
   ```

2. **Reduce concurrent operations**:
   ```python
   # Process organizations sequentially
   for org in organizations:
       process_organization(org)
       time.sleep(10)  # Cooldown period
   ```

## Monitoring and Alerting

### Log Analysis

#### Finding Issues in Logs
```bash
# Recent errors
tail -100 logs/scraper.log | grep ERROR

# Availability confidence issues
grep "availability_confidence" logs/scraper.log

# Performance metrics
grep "duration_seconds" logs/scraper.log | tail -10

# Quality scores
grep "data_quality_score" logs/scraper.log | tail -10
```

#### Setting Up Monitoring
```bash
# Create monitoring script
cat > monitor_scraper.sh << 'EOF'
#!/bin/bash
ERRORS=$(grep "ERROR" logs/scraper.log | wc -l)
if [ $ERRORS -gt 10 ]; then
    echo "High error count: $ERRORS" | mail -s "Scraper Alert" admin@domain.com
fi
EOF

# Add to crontab
crontab -e
# Add: 0 */6 * * * /path/to/monitor_scraper.sh
```

### Health Check Endpoints

#### API Health Check
```bash
# Check API status
curl -f http://localhost:8000/health || echo "API down"

# Check database connectivity
curl -f http://localhost:8000/api/organizations | jq '.[] | .name'
```

#### Frontend Health Check
```bash
# Check frontend build
cd frontend
npm run build && echo "Frontend OK" || echo "Frontend build failed"

# Check for runtime errors
npm test 2>&1 | grep -i error || echo "Tests passing"
```

## Getting Help

### Debug Information Collection

When reporting issues, collect this information:

```bash
# System info
python --version
node --version
psql --version

# Application status
python database/check_db_status.py
cd frontend && npm test -- --passWithNoTests

# Recent logs
tail -50 logs/scraper.log > debug_logs.txt

# Configuration
python management/config_commands.py list > config_status.txt
```

### Common Commands Summary

```bash
# Quick fixes
source venv/bin/activate && python database/check_db_status.py
cd frontend && npm test && npm run build
python management/config_commands.py validate
systemctl restart postgresql  # or brew services restart postgresql

# Emergency reset
python management/emergency_operations.py --reset-stale-data
python management/emergency_operations.py --fix-duplicates

# Health check everything
source venv/bin/activate && python -m pytest tests/ && cd frontend && npm test && npm run build
```

This troubleshooting guide covers the most common issues encountered in production. For specific problems not covered here, check the logs first, then run the relevant diagnostic commands to identify the root cause.