# Scraper Design - Architecture Documentation

## Overview

The Rescue Dog Aggregator scraper system is a **production-grade web scraping engine** designed for reliability, scalability, and maintainability. Built with modern software engineering patterns, it efficiently collects animal data from multiple rescue organizations while ensuring data quality and respectful scraping practices.

## 🏗️ Core Architecture

### Modern Design Patterns (Post-Refactoring)

The scraper system implements enterprise-grade design patterns:

#### 1. Template Method Pattern
```python
class BaseScraper(ABC):
    def run(self) -> Dict[str, Any]:
        # Orchestration method with defined phases
        return self._execute_scrape_phases()
    
    @abstractmethod  
    def collect_data(self) -> List[Dict[str, Any]]:
        # Subclasses implement organization-specific logic
        pass
```

**Benefits**:
- **Consistency**: All scrapers follow same execution flow
- **Maintainability**: Core logic centralized in BaseScraper
- **Extensibility**: Easy to add new phases or hooks

#### 2. Dependency Injection Pattern
```python
def __init__(self, config_id: str, metrics_collector=None, 
             session_manager=None, database_service=None):
    # Clean service injection without conditional logic
    self.metrics_collector = metrics_collector or NullMetricsCollector()
    self.session_manager = session_manager or NullSessionManager() 
    self.database_service = database_service or NullDatabaseService()
```

**Advantages**:
- **Testability**: Mock services for isolated testing
- **Flexibility**: Swap implementations without code changes
- **Separation of Concerns**: Business logic separate from infrastructure

#### 3. Null Object Pattern
```python
class NullMetricsCollector:
    def increment(self, metric: str) -> None:
        pass  # No-op implementation
    
    def timing(self, metric: str, duration: float) -> None:
        pass  # No conditional checks needed in scraper code
```

**Impact**:
- **Eliminates null checks**: No `if metrics_collector:` scattered throughout code
- **Simplifies logic**: Same interface whether service is present or not
- **Reduces bugs**: No NoneType errors

#### 4. Context Manager Pattern
```python
with MyScraper(config_id="org-name") as scraper:
    result = scraper.run()
    # Automatic connection management, cleanup, and resource disposal
```

**Benefits**:
- **Automatic cleanup**: Database connections, sessions closed automatically
- **Exception safety**: Resources cleaned up even on failures
- **Simplified usage**: No manual resource management

## 🔄 Scraper Execution Flow

### High-Level Process Flow

```mermaid
graph TD
    A[Scraper Initialization] --> B[Load Configuration]
    B --> C[Service Injection]
    C --> D[Context Manager Entry]
    D --> E[Template Method: run()]
    E --> F[collect_data() - Subclass Implementation]
    F --> G[Data Standardization]
    G --> H[Image Processing]
    H --> I[Database Storage]
    I --> J[Metrics Collection]
    J --> K[Context Manager Exit]
    K --> L[Resource Cleanup]
```

### Detailed Execution Phases

#### Phase 1: Initialization & Configuration
```python
# 1. Configuration loading from YAML
config = ConfigLoader().load_config("santerpawsbulgarianrescue")

# 2. Organization sync (production) or mock (testing)  
if not testing:
    sync_result = sync_manager.sync_single_organization(config)
    organization_id = sync_result.organization_id

# 3. Service injection with null object defaults
metrics_collector = provided_metrics or NullMetricsCollector()
```

#### Phase 2: Data Collection (Organization-Specific)
```python
def collect_data(self) -> List[Dict[str, Any]]:
    # Subclass implements organization-specific scraping logic
    # Example: Santer Paws Bulgarian Rescue
    animals = self.get_animal_list()  # Bulk AJAX endpoint
    for animal in animals:
        details = self._scrape_animal_details(animal["url"])
        animal.update(details)
    return animals
```

#### Phase 3: Data Processing & Storage
```python
# Standardization pipeline
for animal in collected_data:
    standardized = apply_standardization(animal)
    
# Image processing
if animal.get("image_urls"):
    uploaded_urls = self.process_images(animal["image_urls"])
    
# Database persistence  
self.save_animals(processed_data)
```

## 📊 Configuration-Driven Architecture

### YAML Configuration System

Each organization is defined by a comprehensive YAML configuration:

```yaml
# configs/organizations/santerpawsbulgarianrescue.yaml
schema_version: "1.0"
id: "santerpawsbulgarianrescue"
name: "Santer Paws Bulgarian Rescue"
enabled: true

scraper:
  class_name: "SanterPawsBulgarianRescueScraper"
  module: "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper"
  config:
    rate_limit_delay: 2.5      # Site-specific rate limiting
    max_retries: 3             # Error resilience
    timeout: 240               # Network timeout
    batch_size: 6              # Processing batch size
    skip_existing_animals: false

metadata:
  website_url: "https://santerpawsbulgarianrescue.com/"
  description: "Rescue organization description..."
  location:
    country: "BG"
    city: "Pleven"
  service_regions: ["BG"]
  ships_to: ["UK"]
  social_media:
    facebook: "https://www.facebook.com/SanterpawsBulgarianRescue"
    instagram: "https://www.instagram.com/santerpaws_bulgarian_rescue/"
  adoption_fees:
    usual_fee: 500
    currency: "GBP"
```

**Configuration Benefits**:
- **Zero-Code Onboarding**: Add new organizations without coding
- **Environment Flexibility**: Different settings per deployment
- **Schema Validation**: Prevents configuration errors
- **Hot Reloading**: Configuration changes without restarts

### Configuration Validation Pipeline

```python
# 1. Schema validation
validator.validate_config_structure(yaml_content)

# 2. Required field validation  
validator.check_required_fields(config)

# 3. Data type validation
validator.validate_field_types(config)

# 4. Business rule validation
validator.check_business_constraints(config)
```

## 🎯 Reference Implementation: Santer Paws Bulgarian Rescue

### Why This Is Our Gold Standard

The **Santer Paws Bulgarian Rescue scraper** (`scrapers/santerpawsbulgarianrescue/`) exemplifies best practices:

#### 1. Efficient Data Collection Strategy

**Traditional Approach (Inefficient)**:
```python
# O(n) page requests - slow and resource intensive
for page in range(1, total_pages):
    animals.extend(scrape_page(page))
```

**Our Approach (Optimal)**:
```python  
# O(1) AJAX request - 10x+ performance improvement
def get_animal_list(self) -> List[Dict[str, Any]]:
    data = {"wpgb-ajax": "render", "_adoption_status_adopt": "available"}
    response = requests.post(ajax_endpoint, data=data)
    return self.parse_all_animals(response.text)
```

#### 2. Robust Error Handling Strategy

```python
def collect_data(self) -> List[Dict[str, Any]]:
    all_dogs_data = []
    seen_urls = set()  # Deduplication
    
    try:
        animals = self.get_animal_list()
        for animal in animals:
            try:
                # Individual processing with resilience
                if animal["url"] not in seen_urls:
                    time.sleep(3)  # Respectful rate limiting
                    detail_data = self._scrape_animal_details(animal["url"])
                    if detail_data:
                        animal.update(detail_data)
                    all_dogs_data.append(animal)
                    seen_urls.add(animal["url"])
            except Exception as e:
                # Log error but continue processing other animals
                self.logger.error(f"Failed to process {animal.get('name')}: {e}")
                continue
                
    except Exception as e:
        self.logger.error(f"Critical error in data collection: {e}")
        
    return all_dogs_data
```

#### 3. Advanced Data Extraction

**Dynamic Property Extraction**:
```python
def _extract_properties(self, soup: BeautifulSoup) -> Dict[str, Any]:
    # Robust field-value pairing that handles:
    # - Missing values (assigns defaults)
    # - Inconsistent field ordering  
    # - Multiple data formats
    # - Edge cases in HTML structure
    
    text_elements = self._extract_text_elements(soup)
    properties = {}
    
    i = 0
    while i < len(text_elements):
        label = text_elements[i].strip()
        
        # Intelligent value detection
        if i + 1 < len(text_elements):
            potential_value = text_elements[i + 1].strip()
            is_next_label = self._is_label(potential_value)
            
            if not is_next_label:
                value = potential_value
                i += 2  # Skip both label and value
            else:
                value = ""  # Label with no value
                i += 1
        else:
            value = ""  # End of elements
            i += 1
            
        # Apply field-specific processing with defaults
        properties.update(self._process_field(label, value))
        
    return properties
```

#### 4. Comprehensive Standardization Integration

```python
# Age standardization with complex parsing
if raw_age_text and raw_age_text != "Unknown":
    age_info = standardize_age(raw_age_text)
    if age_info.get("age_min_months") is not None:
        properties["age_min_months"] = age_info["age_min_months"] 
        properties["age_max_months"] = age_info["age_max_months"]
        properties["age_category"] = age_info.get("age_category", "Unknown")

# Breed normalization following established patterns        
raw_breed = value or "Mixed Breed"
properties["breed"] = normalize_breed_case(raw_breed) if raw_breed != "Mixed Breed" else raw_breed
```

## 🛡️ Data Quality Assurance

### Zero NULLs Compliance

**Problem**: Database constraints require non-NULL values for critical fields.

**Solution**: Comprehensive default value strategy:

```python
# Zero NULLs compliance - production database requirements
result = {
    "name": self._clean_dog_name(name) or "Unknown",
    "external_id": external_id or self._generate_fallback_id(),
    "animal_type": "dog",  # Always known for our use case
    "status": extracted_status or "available",  # Default assumption
    "breed": extracted_breed or "Mixed Breed",  # Safe default
    "size": extracted_size or "Medium",  # Statistical most common
}

# Leave optional fields as None when truly unknown (age_text, sex)
# Tests expect some fields to be None when not found
if "breed" not in result:
    result["breed"] = "Mixed Breed"  # Required field
if "size" not in result:
    result["size"] = "Medium"  # Required field
# age_text and sex can remain None for test compatibility
```

### Data Standardization Pipeline

#### Age Processing
```python
# Input: "Born 15/03/2020", "2 years old", "Adult", "Young"
age_info = standardize_age(raw_age_text)

# Output: Structured age data
{
    "age_min_months": 24,
    "age_max_months": 36, 
    "age_category": "Adult",
    "confidence": "high"
}
```

#### Breed Normalization
```python
# Input: "GERMAN SHEPHERD", "german shepherd", "German Shepherd Mix"
normalized_breed = normalize_breed_case(raw_breed)

# Output: Consistent formatting
"German Shepherd"
"German Shepherd Mix" 
```

#### Status Mapping
```python
# Organization-specific status mapping
status_mapping = {
    "reserved": "reserved",
    "on hold": "reserved", 
    "available": "available",
    "adopted": "adopted"
}
```

## 🔧 Service Architecture

### Metrics Collection Service

```python
class MetricsCollector:
    def record_scrape_start(self, organization: str) -> None:
        self.increment(f"scraper.{organization}.started")
        
    def record_animals_processed(self, organization: str, count: int) -> None:
        self.gauge(f"scraper.{organization}.animals_processed", count)
        
    def record_scrape_duration(self, organization: str, duration: float) -> None:
        self.timing(f"scraper.{organization}.duration", duration)

# Usage in scraper (injected dependency)
self.metrics_collector.record_scrape_start(self.org_config.id)
```

### Session Management Service

```python  
class SessionManager:
    def create_database_connection(self) -> psycopg2.Connection:
        return psycopg2.connect(**DB_CONFIG)
        
    def create_http_session(self) -> requests.Session:
        session = requests.Session()
        session.headers.update(self.default_headers)
        return session

# Automatic session lifecycle management via context manager
with scraper:
    # Sessions created automatically
    result = scraper.run()  
    # Sessions cleaned up automatically
```

### Image Processing Service

```python
class ImageProcessingService:
    def upload_to_r2(self, image_urls: List[str], animal_id: str) -> List[str]:
        uploaded_urls = []
        for url in image_urls:
            try:
                # Download, validate, resize, upload to Cloudflare R2
                processed_url = self.r2_service.upload_image(url, animal_id)
                uploaded_urls.append(processed_url)
            except Exception as e:
                self.logger.error(f"Failed to process image {url}: {e}")
        return uploaded_urls
```

## 🚀 Performance Characteristics

### Benchmark Results

| Organization | Animals | Traditional Scraping | AJAX Scraping | Performance Gain |
|-------------|---------|-------------------|---------------|-----------------|
| Santer Paws | 45 dogs | 12 requests + 45 details | 1 request + 45 details | 12x fewer requests |
| REAN | 120 dogs | 24 requests + 120 details | 1 request + 120 details | 24x fewer requests |
| Galgo del Sol | 200 dogs | 40 requests + 200 details | 1 request + 200 details | 40x fewer requests |

### Resource Usage Optimization

```python
# Memory efficiency: Stream processing instead of loading all data
def collect_data(self) -> List[Dict[str, Any]]:
    for animal_batch in self.get_animals_in_batches(batch_size=6):
        # Process batch and yield results
        processed_batch = self.process_batch(animal_batch)
        yield from processed_batch  # Memory-efficient streaming
```

### Rate Limiting Strategy

```python
# Site-specific rate limiting based on performance characteristics
RATE_LIMITS = {
    "fast_sites": 0.5,      # 2 requests/second
    "medium_sites": 1.0,    # 1 request/second  
    "slow_sites": 3.0,      # 1 request/3 seconds
    "very_slow_sites": 5.0  # 1 request/5 seconds
}

# Dynamic adjustment based on response times
def adaptive_rate_limit(self, response_time: float) -> None:
    if response_time > 10.0:
        self.rate_limit_delay = min(self.rate_limit_delay * 1.5, 10.0)
    elif response_time < 2.0:
        self.rate_limit_delay = max(self.rate_limit_delay * 0.8, 0.5)
```

## 🧪 Testing Strategy

### Multi-Layer Testing Approach

#### 1. Unit Tests
```python
def test_extract_dog_name_from_url():
    scraper = SanterPawsBulgarianRescueScraper()
    
    # Test normal case
    assert scraper._extract_dog_name_from_url("/adoption/pepper/") == "Pepper"
    
    # Test hyphenated names  
    assert scraper._extract_dog_name_from_url("/adoption/summer-breeze/") == "Summer Breeze"
    
    # Test edge cases
    assert scraper._extract_dog_name_from_url("/adoption//") == ""
```

#### 2. Integration Tests
```python  
@patch('requests.post')
def test_get_animal_list_integration(mock_post):
    # Mock AJAX response with real HTML structure
    mock_post.return_value.text = load_test_html("ajax_response.html")
    
    scraper = SanterPawsBulgarianRescueScraper()
    animals = scraper.get_animal_list()
    
    assert len(animals) == 3
    assert animals[0]["name"] == "Melody"
    assert animals[0]["external_id"] == "melody"
```

#### 3. Validation Scripts  
```python
# Real-world data validation
def validate_real_data():
    scraper = SanterPawsBulgarianRescueScraper()
    
    # Test with live site (rate-limited)
    sample_urls = [
        "https://santerpawsbulgarianrescue.com/adoption/melody/",
        "https://santerpawsbulgarianrescue.com/adoption/pepper/"
    ]
    
    for url in sample_urls:
        time.sleep(5)  # Respectful testing
        data = scraper._scrape_animal_details(url)
        
        # Validate data quality
        assert data["name"]
        assert data["breed"] != "Unknown" 
        assert "description" in data
        validate_data_structure(data)
```

#### 4. Performance Tests
```python
def test_scraper_performance():
    with Timer() as timer:
        scraper = SanterPawsBulgarianRescueScraper()
        animals = scraper.collect_data()
    
    # Performance assertions
    assert timer.duration < 300  # Max 5 minutes total
    assert len(animals) > 0
    assert all(animal.get("name") for animal in animals)
```

## 🛠️ Development Workflow

### 1. Organization Research Phase
```bash
# Study the target website
curl -s "https://org-website.com/dogs" | grep -E "(pagination|ajax|api)"
curl -s "https://org-website.com/dogs/dog-1" | head -50

# Identify patterns
# - Pagination vs infinite scroll vs AJAX
# - Data structure and field locations
# - Rate limiting requirements
# - Error handling needs
```

### 2. Configuration Setup
```yaml
# Create configs/organizations/new-org.yaml
schema_version: "1.0"
id: "new-org"
name: "New Organization"
enabled: true
scraper:
  class_name: "NewOrgScraper"
  module: "scrapers.new_org.scraper"
  config:
    rate_limit_delay: 1.0  # Start conservative
    max_retries: 3
    timeout: 30
```

### 3. TDD Implementation
```python
# 1. Write failing test
def test_collect_data_returns_animals():
    scraper = NewOrgScraper(config_id="new-org")
    animals = scraper.collect_data()
    assert len(animals) > 0

# 2. Run test (should fail)
pytest tests/scrapers/test_new_org.py::test_collect_data_returns_animals -v

# 3. Implement minimal functionality
class NewOrgScraper(BaseScraper):
    def collect_data(self) -> List[Dict[str, Any]]:
        return [{"name": "Test Dog"}]  # Minimal implementation

# 4. Test passes, refactor and add real functionality
```

### 4. Integration & Validation
```bash
# Test configuration validation
python management/config_commands.py validate new-org

# Test scraper initialization  
python management/config_commands.py run new-org --dry-run

# Full integration test
python management/config_commands.py run new-org --limit 3
```

## 📈 Monitoring & Observability

### Metrics Dashboard

**Key Metrics Tracked**:
- Scrape success/failure rates per organization
- Average scrape duration and throughput  
- Data quality metrics (missing fields, validation failures)
- Network error rates and retry patterns
- Resource utilization (memory, CPU during scraping)

### Error Monitoring

```python
class ScraperErrorMonitor:
    def track_error(self, organization: str, error_type: str, error: Exception):
        # Send to monitoring service (DataDog, New Relic, etc.)
        self.metrics_service.increment(
            f"scraper.{organization}.error.{error_type}",
            tags={"error_class": error.__class__.__name__}
        )
        
        # Critical errors trigger alerts
        if error_type in ["network_timeout", "parsing_failure"]:
            self.alert_service.send_alert(
                f"Critical scraper error for {organization}: {error}"
            )
```

### Health Checks

```python
def health_check_scrapers():
    """Validate all scrapers can initialize and basic functionality works."""
    results = {}
    
    for org_config in ConfigLoader().get_all_configs():
        try:
            # Test scraper initialization
            scraper_class = load_scraper_class(org_config)
            scraper = scraper_class(config_id=org_config.id)
            
            # Test basic functionality (mocked)
            with patch('requests.get') as mock_get:
                mock_get.return_value.text = "<html>test</html>"
                test_data = scraper.collect_data()
                
            results[org_config.id] = {
                "status": "healthy",
                "last_check": datetime.now(),
                "test_data_count": len(test_data)
            }
        except Exception as e:
            results[org_config.id] = {
                "status": "unhealthy", 
                "error": str(e),
                "last_check": datetime.now()
            }
    
    return results
```

## 🔮 Future Architecture Evolution

### Planned Enhancements

#### 1. Asynchronous Scraping
```python
async def collect_data_async(self) -> List[Dict[str, Any]]:
    # Concurrent detail page scraping with semaphore limiting
    animals = await self.get_animal_list_async()
    
    semaphore = asyncio.Semaphore(3)  # Max 3 concurrent requests
    tasks = [
        self._scrape_details_with_semaphore(semaphore, animal)
        for animal in animals
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]
```

#### 2. Smart Caching Layer
```python
class ScrapingCache:
    def should_refresh(self, url: str) -> bool:
        # Intelligent cache invalidation based on:
        # - Content change frequency patterns
        # - Organization update schedules  
        # - Data staleness tolerance
        cached_data = self.cache.get(url)
        
        if not cached_data:
            return True
            
        # Use ML model to predict update likelihood
        update_probability = self.ml_predictor.predict_update_probability(
            url=url,
            last_update=cached_data.timestamp,
            organization_patterns=self.get_org_patterns(url)
        )
        
        return update_probability > 0.7
```

#### 3. Advanced Data Quality Assurance
```python
class DataQualityValidator:
    def validate_animal_data(self, data: Dict[str, Any]) -> ValidationResult:
        # Multi-layer validation
        structural_validation = self.validate_structure(data)
        semantic_validation = self.validate_semantics(data)  # AI-powered
        business_validation = self.validate_business_rules(data)
        
        return ValidationResult(
            is_valid=all([structural_validation, semantic_validation, business_validation]),
            confidence_score=self.calculate_confidence_score(data),
            suggested_corrections=self.suggest_corrections(data)
        )
```

## 📚 Best Practices Summary

### ✅ DO

1. **Follow Template Method Pattern**: Always inherit from BaseScraper and implement collect_data()
2. **Use Configuration-Driven Design**: Never hardcode URLs or settings  
3. **Implement Comprehensive Error Handling**: Continue scraping on individual failures
4. **Apply Data Standardization**: Use utils/standardization for all data normalization
5. **Respect Rate Limits**: Implement appropriate delays for target site performance
6. **Ensure Zero NULLs Compliance**: Provide defaults for all required database fields
7. **Use Service Injection**: Accept optional services for testing and flexibility
8. **Write Comprehensive Tests**: Unit, integration, and validation scripts
9. **Log Appropriately**: Debug for details, Info for progress, Error for failures
10. **Study Reference Implementation**: Learn from santerpawsbulgarianrescue patterns

### ❌ AVOID

1. **Hardcoded Values**: URLs, delays, retry counts should be in configuration
2. **Ignoring Errors**: Always handle exceptions gracefully and continue processing
3. **Poor Rate Limiting**: Respect target site performance and loading capabilities  
4. **Skipping Standardization**: Always normalize breeds, ages, and other fields
5. **NULL Value Insertion**: Provide defaults for required fields to prevent database errors
6. **Monolithic Methods**: Keep functions focused and single-purpose
7. **Missing Documentation**: All public methods need comprehensive docstrings
8. **Inadequate Testing**: Test both happy path and error conditions thoroughly

The scraper system represents the **foundation of data quality** in the Rescue Dog Aggregator platform. Poor scraping leads directly to poor user experience, making this architecture critical for the platform's success.