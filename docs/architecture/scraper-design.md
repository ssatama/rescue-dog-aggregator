# Scraper System Design - Comprehensive Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration-Driven Development](#configuration-driven-development)
4. [BaseScraper Foundation](#basescraper-foundation)
5. [Implementation Guide](#implementation-guide)
6. [Advanced Patterns](#advanced-patterns)
7. [Testing Strategy](#testing-strategy)
8. [Operations & Monitoring](#operations--monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

The Rescue Dog Aggregator uses a sophisticated, production-ready scraper system that aggregates rescue dogs from multiple organizations worldwide. The system is built with modern software engineering principles including Test-Driven Development (TDD), configuration-driven architecture, and comprehensive error handling.

### Key Features

- **Configuration-Driven**: Organizations defined via YAML configs, no code changes needed
- **Production-Ready**: Comprehensive error handling, retry logic, and monitoring
- **TDD-First**: Test-driven development with comprehensive test coverage
- **Scalable**: Modular architecture supporting diverse website structures
- **Resilient**: Partial failure detection, stale data management, and graceful degradation
- **Observable**: Detailed metrics, logging, and monitoring capabilities

### Current Scale

- **7 Active Organizations**: Operating across multiple countries and languages
- **Multiple Scraper Types**: From simple HTML parsers to complex Selenium-based scrapers
- **Comprehensive Testing**: 259 backend tests, extensive scraper test coverage
- **Production Monitoring**: Real-time failure detection and alerting

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Scraper System                           │
├─────────────────────────────────────────────────────────────┤
│  Configuration Layer                                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   YAML Configs  │  │  JSON Schemas   │                  │
│  │   (7 orgs)      │  │  (Validation)   │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  BaseScraper Framework (Refactored)                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Template Method│  │  Context Manager│                  │
│  │  Pattern        │  │  Pattern        │                  │
│  │  (5 phases)     │  │  (Auto cleanup) │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Extracted)                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Metrics        │  │  Session        │                  │
│  │  Collector      │  │  Manager        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Database       │  │  Null Objects   │                  │
│  │  Service        │  │  (No-op impls)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│  Organization-Specific Scrapers                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │  Simple    │ │  Complex   │ │  Selenium  │             │
│  │  HTML      │ │  Multi-page│ │  Dynamic   │             │
│  │  Parsing   │ │  Scraping  │ │  Content   │             │
│  └────────────┘ └────────────┘ └────────────┘             │
├─────────────────────────────────────────────────────────────┤
│  Data Processing Pipeline                                   │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Standardization│  │  Image Processing│                  │
│  │  Validation     │  │  R2 + Cloudflare│                  │
│  │  Language Det.  │  │  Images Upload  │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Configuration Loading**: YAML configs loaded and validated against JSON schemas
2. **Organization Sync**: Configs synchronized to database with organization management
3. **Scraper Initialization**: BaseScraper instantiated with config-driven parameters
4. **Data Collection**: Organization-specific `collect_data()` method extracts animals
5. **Data Processing**: Standardization, validation, and image processing
6. **Database Operations**: CRUD operations with availability tracking
7. **Monitoring**: Metrics collection and failure detection

## Configuration-Driven Development

### Philosophy

The system uses configuration over code, enabling:
- **Rapid Deployment**: Add new organizations without code changes
- **Flexible Configuration**: Per-organization settings for rate limiting, timeouts, etc.
- **Automatic Synchronization**: Organizations sync from configs to database
- **Validation**: JSON schema validation ensures config integrity

### Configuration Structure

```yaml
# configs/organizations/example-org.yaml
schema_version: "1.0"
id: "example-org"
name: "Example Rescue Organization"
enabled: true
scraper:
  class_name: "ExampleOrgScraper"
  module: "scrapers.example_org.scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
    skip_existing_animals: true
    retry_backoff_factor: 2.0
    batch_size: 6
metadata:
  website_url: "https://example.org"
  description: "Organization description"
  location:
    country: "US"
    city: "San Francisco"
  service_regions: ["CA", "NV"]
  ships_to: ["US", "CA"]
  social_media:
    website: "https://example.org"
    facebook: "https://facebook.com/example"
    instagram: "https://instagram.com/example"
  established_year: 2020
  logo_url: "https://example.org/logo.png"
```

### Configuration Management

```bash
# Configuration Commands
python management/config_commands.py validate    # Validate all configs
python management/config_commands.py sync       # Sync to database
python management/config_commands.py list       # List all organizations
python management/config_commands.py show org-id # Show specific organization
python management/config_commands.py run org-id  # Run specific scraper
```

## BaseScraper Foundation

### Recent Architectural Refactoring

**BaseScraper has been completely refactored with modern design patterns:**

#### 🏗️ **Null Object Pattern**
- **Services default to null objects** instead of None
- **Eliminates conditional checks** throughout the codebase
- **Automatic fallback**: `metrics_collector` defaults to `NullMetricsCollector()`
- **Cleaner code**: No more `if service:` checks needed

#### 🔄 **Context Manager Pattern**
- **Automatic resource management** with `with scraper:` syntax
- **Database connections** automatically opened/closed
- **Exception-safe cleanup** ensures resources are freed
- **Backward compatible** with existing manual connection handling

#### 📋 **Template Method Pattern**
- **`run()` method decomposed** into focused phases:
  - `_setup_scrape()` - Initialize logging and sessions
  - `_collect_and_time_data()` - Data collection with timing
  - `_process_animals_data()` - Database operations
  - `_finalize_scrape()` - Stale data detection
  - `_log_completion_metrics()` - Comprehensive metrics
- **Separation of concerns** - each phase has single responsibility
- **Extensible** - phases can be overridden for custom behavior

#### 💉 **Enhanced Dependency Injection**
- **Constructor-level service injection** for clean architecture
- **Testing-friendly** with mock service support
- **Null object defaults** prevent conditional logic
- **Backward compatible** with existing usage patterns

#### 🎯 **Modern Usage Examples**

```python
# Context manager pattern (recommended)
with MyScraper(config_id="org-name") as scraper:
    success = scraper.run()  # Automatic connection handling

# Service injection for testing
scraper = MyScraper(
    config_id="org-name",
    metrics_collector=CustomMetricsCollector(),
    session_manager=MockSessionManager()
)

# Legacy support (still works)
scraper = MyScraper(config_id="org-name")
success = scraper.run()  # Handles connections internally
```

### Core Features

The `BaseScraper` class provides a comprehensive foundation for all organization-specific scrapers:

#### Database Operations

```python
# CRUD Operations
def get_existing_animal(self, external_id, organization_id) -> Optional[Tuple[int, str, datetime]]
def create_animal(self, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]
def update_animal(self, animal_id: int, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]
```

#### Session Tracking & Availability Management

```python
# Session Management
def start_scrape_session(self) -> bool
def mark_animal_as_seen(self, animal_id: int) -> bool
def update_stale_data_detection(self) -> bool
def mark_animals_unavailable(self, threshold: int = 4) -> int
def restore_available_animal(self, animal_id: int) -> bool
```

#### Error Handling & Monitoring

```python
# Error Detection
def detect_partial_failure(self, animals_found: int, threshold_percentage: float = 0.5) -> bool
def detect_catastrophic_failure(self, animals_found: int, absolute_minimum: int = 3) -> bool
def handle_scraper_failure(self, error_message: str) -> bool

# Monitoring
def log_detailed_metrics(self, metrics: Dict[str, Any]) -> bool
def assess_data_quality(self, animals_data: List[Dict[str, Any]]) -> float
def calculate_scrape_duration(self, start_time: datetime, end_time: datetime) -> float
```

### Availability Confidence System

The system uses a sophisticated confidence scoring mechanism:

```python
# Confidence Levels
"high"    # Animal seen in current scrape
"medium"  # Animal missed 1 scrape
"low"     # Animal missed 2+ scrapes
```

```python
# Automatic Status Updates
consecutive_scrapes_missing = 0  # → availability_confidence = "high"
consecutive_scrapes_missing = 1  # → availability_confidence = "medium"
consecutive_scrapes_missing = 2  # → availability_confidence = "low"
consecutive_scrapes_missing = 4  # → status = "unavailable"
```

### Image Processing Pipeline

```python
# R2 + Cloudflare Images Integration
def save_animal(self, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Handles primary image upload with fallback."""
    
def save_animal_images(self, animal_id: int, image_urls: List[str]) -> Tuple[int, int]:
    """Handles multiple image uploads with change detection."""
```

**Features:**
- **Smart Caching**: Only uploads changed images
- **Fallback Handling**: Uses original URLs if upload fails
- **Change Detection**: Compares original URLs to avoid duplicate uploads
- **Batch Processing**: Efficiently handles multiple images per animal

## Implementation Guide

### 1. Creating a New Scraper

#### Step 1: Configuration File

```yaml
# configs/organizations/new-org.yaml
schema_version: "1.0"
id: "new-org"
name: "New Rescue Organization"
enabled: true
scraper:
  class_name: "NewOrgScraper"
  module: "scrapers.new_org.scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
    skip_existing_animals: true
metadata:
  website_url: "https://neworg.com"
  description: "Organization description"
  location:
    country: "US"
    city: "City Name"
  service_regions: ["US"]
```

#### Step 2: Scraper Implementation

```python
# scrapers/new_org/__init__.py
from .scraper import NewOrgScraper

# scrapers/new_org/scraper.py
from scrapers.base_scraper import BaseScraper
from typing import Any, Dict, List

class NewOrgScraper(BaseScraper):
    """Scraper for New Rescue Organization."""
    
    def __init__(self, config_id: str = "new-org", organization_id=None):
        """Initialize with config-based or legacy mode."""
        if organization_id is not None:
            super().__init__(organization_id=organization_id)
        else:
            super().__init__(config_id=config_id)
        
        self.base_url = "https://neworg.com"
        self.listing_url = "https://neworg.com/dogs"
    
    def collect_data(self) -> List[Dict[str, Any]]:
        """Extract animal data from organization website.
        
        The BaseScraper handles all database operations, availability
        management, and error handling automatically.
        
        Returns:
            List of dictionaries containing animal data
        """
        animals = []
        
        # 1. Get listing page
        listing_data = self._fetch_listing_page()
        
        # 2. Extract animal URLs
        animal_urls = self._extract_animal_urls(listing_data)
        
        # 3. Filter existing animals if enabled
        if self.skip_existing_animals:
            filtered_urls = self._filter_existing_urls(animal_urls)
            total_skipped = len(animal_urls) - len(filtered_urls)
            self.set_filtering_stats(len(animal_urls), total_skipped)
            animal_urls = filtered_urls
        
        # 4. Process each animal
        for url in animal_urls:
            # Respect rate limiting
            self.respect_rate_limit()
            
            try:
                # Use retry mechanism for robust scraping
                animal_data = self._scrape_with_retry(self._scrape_animal_detail, url)
                
                if animal_data and self._validate_animal_data(animal_data):
                    animals.append(animal_data)
                    
            except Exception as e:
                self.logger.error(f"Error processing {url}: {e}")
                continue
        
        return animals
    
    def _fetch_listing_page(self) -> str:
        """Fetch and return listing page content."""
        # Implementation specific to website
        pass
    
    def _extract_animal_urls(self, content: str) -> List[str]:
        """Extract animal URLs from listing page."""
        # Implementation specific to website
        pass
    
    def _scrape_animal_detail(self, url: str) -> Dict[str, Any]:
        """Scrape individual animal details."""
        # Implementation specific to website
        return {
            'name': 'Animal Name',
            'breed': 'Breed',
            'age_text': 'Age description',
            'sex': 'Male/Female',
            'size': 'Small/Medium/Large',
            'external_id': 'unique-id',
            'primary_image_url': 'https://...',
            'adoption_url': url,
            'status': 'available',
            'properties': {
                'description': 'Additional info',
                'special_needs': 'Any special requirements'
            }
        }
```

#### Step 3: Testing Implementation

```python
# tests/scrapers/test_new_org.py
import pytest
from scrapers.new_org.scraper import NewOrgScraper

class TestNewOrgScraper:
    """Test suite for NewOrgScraper."""
    
    def test_extract_animal_urls(self):
        """Test URL extraction from listing page."""
        scraper = NewOrgScraper()
        html_content = """
        <html>
            <div class="dog-card">
                <a href="/dog/1">Dog 1</a>
            </div>
        </html>
        """
        
        urls = scraper._extract_animal_urls(html_content)
        assert len(urls) == 1
        assert "/dog/1" in urls[0]
    
    def test_scrape_animal_detail(self):
        """Test individual animal detail scraping."""
        scraper = NewOrgScraper()
        # Mock response or use fixture
        
        animal_data = scraper._scrape_animal_detail("https://neworg.com/dog/1")
        
        # Validate required fields
        assert animal_data['name']
        assert animal_data['external_id']
        assert animal_data['adoption_url']
        
        # Validate data structure
        assert isinstance(animal_data, dict)
        assert 'properties' in animal_data
```

#### Step 4: Configuration Sync & Testing

```bash
# 1. Validate configuration
python management/config_commands.py validate

# 2. Sync to database
python management/config_commands.py sync

# 3. Test scraper
python management/config_commands.py run new-org

# 4. Verify results
python management/config_commands.py show new-org
```

### 2. Required Data Format

Every scraper must return animals in this standardized format:

```python
{
    # Required fields
    'name': str,                    # Animal name
    'external_id': str,             # Unique identifier from source
    'adoption_url': str,            # URL to adoption page
    
    # Recommended fields
    'breed': str,                   # Breed (will be standardized)
    'age_text': str,                # Age description
    'sex': str,                     # 'Male', 'Female', or 'Unknown'
    'size': str,                    # 'Small', 'Medium', 'Large'
    'primary_image_url': str,       # Main image URL
    'status': str,                  # 'available', 'pending', 'adopted'
    
    # Optional fields
    'image_urls': List[str],        # Additional images
    'properties': Dict[str, Any],   # Additional data (stored as JSONB)
    'standardized_breed': str,      # Pre-standardized breed
    'standardized_size': str,       # Pre-standardized size
}
```

### 3. BaseScraper Methods Available

#### Configuration Methods

```python
self.get_organization_name() -> str        # Get organization display name
self.get_rate_limit_delay() -> float      # Get rate limit delay
self.respect_rate_limit()                 # Sleep for rate limit
```

#### Data Validation Methods

```python
self._validate_animal_data(data: Dict) -> bool        # Validate animal data
self._is_invalid_name(name: str) -> bool             # Check for error names
self._filter_existing_urls(urls: List[str]) -> List[str]  # Filter existing animals
```

#### Retry & Error Handling

```python
self._scrape_with_retry(method, *args, **kwargs)     # Retry wrapper
self.set_filtering_stats(total: int, skipped: int)   # Track filtering stats
```

## Advanced Patterns

### 1. Unified DOM-Based Extraction

For complex websites with dynamic content and lazy loading:

```python
class AdvancedScraper(BaseScraper):
    """Scraper with unified DOM-based extraction."""
    
    def extract_dogs_with_images_unified(self, url: str) -> List[Dict[str, Any]]:
        """Extract dogs and images in unified DOM approach.
        
        Eliminates "off by one" association issues by processing
        each dog container as a complete unit.
        """
        try:
            # Configure browser for dynamic content
            driver = self._setup_browser()
            driver.get(url)
            
            # Trigger comprehensive lazy loading
            self._trigger_comprehensive_lazy_loading(driver)
            
            # Find dog containers using robust selectors
            containers = self._find_dog_containers(driver)
            
            # Extract complete data from each container
            dogs_data = []
            for container in containers:
                dog_data = self._extract_single_dog_from_container(container)
                if dog_data:
                    dogs_data.append(dog_data)
            
            return dogs_data
            
        except Exception as e:
            # Graceful fallback to legacy method
            return self._extract_dogs_legacy_fallback(url)
    
    def _find_dog_containers(self, driver) -> List:
        """Find dog containers using robust selector strategies."""
        # Primary selectors (tried in order)
        selectors = [
            "div.x-el-article",           # Primary container class
            "div.x.c1-5",                 # Alternative container class
            "div[class*='x-el-article']", # Partial class matching
            "div[class*='c1-5']",         # Fallback partial matching
        ]
        
        for selector in selectors:
            containers = driver.find_elements(By.CSS_SELECTOR, selector)
            if containers:
                self.logger.info(f"Found {len(containers)} containers with selector: {selector}")
                return containers
        
        # Fallback: H3-based detection
        return self._find_containers_by_headers(driver)
    
    def _trigger_comprehensive_lazy_loading(self, driver):
        """Comprehensive scrolling pattern for lazy loading."""
        # 1. Initial scroll to bottom
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        
        # 2. Return to top
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)
        
        # 3. Progressive scroll in increments
        total_height = driver.execute_script("return document.body.scrollHeight")
        for i in range(0, total_height, 300):
            driver.execute_script(f"window.scrollTo(0, {i});")
            time.sleep(0.5)
        
        # 4. Final verification scroll
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
```

### 2. Squarespace-Specific Patterns

For Squarespace-based rescue sites:

```python
class SquarespaceScraper(BaseScraper):
    """Scraper optimized for Squarespace websites."""
    
    def _extract_hero_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract images from Squarespace lazy loading system."""
        # PRIORITY 1: Extract from data-src attributes (working URLs)
        gallery_imgs = soup.select('.ProductItem-gallery img[data-src]')
        for img in gallery_imgs:
            data_src = img.get('data-src', '')
            if data_src.startswith('http'):
                # Add format parameter for optimization
                if '?format=' not in data_src:
                    data_src += '?format=1500w'
                return data_src
        
        # PRIORITY 2: Alt-based URL construction
        alt_imgs = soup.select('.ProductItem-gallery img[alt]')
        for img in alt_imgs:
            alt_text = img.get('alt', '')
            if alt_text and not alt_text.startswith('http'):
                # Construct URL from alt text
                constructed_url = f"https://images.squarespace-cdn.com/{alt_text}?format=1500w"
                return constructed_url
        
        # PRIORITY 3: Traditional src extraction
        src_imgs = soup.select('.ProductItem-gallery img[src]')
        for img in src_imgs:
            src = img.get('src', '')
            if src.startswith('http') and 'squarespace' in src:
                return src
        
        return None
    
    def _extract_country_from_name(self, name: str) -> Optional[str]:
        """Extract country from flag emoji in name."""
        flag_country_map = {
            "🇬🇧": "GB", "🇨🇾": "CY", "🇧🇦": "BA", 
            "🇫🇷": "FR", "🇷🇴": "RO"
        }
        
        for flag, country_code in flag_country_map.items():
            if flag in name:
                return country_code
        return None
    
    def _parse_flexible_properties(self, text: str) -> Dict[str, str]:
        """Parse properties from flexible Q&A format."""
        properties = {}
        lines = text.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Handle Q&A on separate lines
            if line.endswith("?") and self._is_property_question(line):
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and not next_line.endswith("?"):
                        properties[line] = next_line
                        i += 2
                        continue
            
            # Handle Q&A on same line
            property_match = re.match(r"^(.+?)\?\s*(.+)$", line)
            if property_match and self._is_property_question(property_match.group(1)):
                properties[property_match.group(1) + "?"] = property_match.group(2)
            
            i += 1
        
        return properties
    
    def _is_property_question(self, text: str) -> bool:
        """Check if text is a property question."""
        property_keywords = ["how big", "how old", "good with", "house trained", "location"]
        return any(keyword in text.lower() for keyword in property_keywords)
```

### 3. Multi-Language Support

```python
class MultiLanguageScraper(BaseScraper):
    """Scraper with multi-language support."""
    
    def __init__(self, config_id: str, organization_id=None):
        super().__init__(config_id=config_id, organization_id=organization_id)
        self.translations = self._load_translations()
    
    def _load_translations(self) -> Dict[str, Dict[str, str]]:
        """Load translation mappings."""
        return {
            'de': {
                'männlich': 'Male',
                'weiblich': 'Female',
                'klein': 'Small',
                'mittel': 'Medium',
                'groß': 'Large',
            },
            'fr': {
                'mâle': 'Male',
                'femelle': 'Female',
                'petit': 'Small',
                'moyen': 'Medium',
                'grand': 'Large',
            }
        }
    
    def _normalize_field(self, field_value: str, field_type: str, language: str = 'en') -> str:
        """Normalize field value using translations."""
        if not field_value or language == 'en':
            return field_value
        
        field_lower = field_value.lower().strip()
        
        # Get translation mapping for language
        lang_map = self.translations.get(language, {})
        
        # Find translation
        for foreign_term, english_term in lang_map.items():
            if foreign_term in field_lower:
                return english_term
        
        # Return original if no translation found
        return field_value
    
    def _detect_and_normalize_sex(self, sex_text: str) -> str:
        """Detect language and normalize sex field."""
        if not sex_text:
            return 'Unknown'
        
        # Detect language
        detected_lang = self.detect_language(sex_text)
        
        # Normalize using detected language
        normalized = self._normalize_field(sex_text, 'sex', detected_lang)
        
        # Standardize to expected values
        normalized_lower = normalized.lower()
        if 'male' in normalized_lower or 'männlich' in normalized_lower:
            return 'Male'
        elif 'female' in normalized_lower or 'weiblich' in normalized_lower:
            return 'Female'
        
        return 'Unknown'
```

### 4. Batch Processing with Retry Logic

```python
class BatchProcessingScraper(BaseScraper):
    """Scraper with advanced batch processing."""
    
    def _process_animals_in_batches(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Process animals in batches with retry logic."""
        all_animals = []
        batch_size = getattr(self, 'batch_size', 6)
        
        for i in range(0, len(urls), batch_size):
            batch_urls = urls[i:i + batch_size]
            batch_start = i + 1
            batch_end = min(i + batch_size, len(urls))
            
            self.logger.info(f"Processing batch {batch_start}-{batch_end}/{len(urls)}")
            
            batch_animals = []
            for url in batch_urls:
                try:
                    # Use retry mechanism
                    animal_data = self._scrape_with_retry(self._scrape_animal_detail, url)
                    
                    if animal_data and self._validate_animal_data(animal_data):
                        batch_animals.append(animal_data)
                        self.logger.debug(f"✅ Successfully processed: {animal_data.get('name', 'Unknown')}")
                    else:
                        self.logger.warning(f"❌ Invalid data for URL: {url}")
                        
                except Exception as e:
                    self.logger.error(f"❌ Error processing {url}: {e}")
                    continue
                
                # Respect rate limiting between individual requests
                self.respect_rate_limit()
            
            all_animals.extend(batch_animals)
            
            # Progress logging
            success_rate = len(batch_animals) / len(batch_urls) * 100
            self.logger.info(f"Batch {batch_start}-{batch_end} completed: {len(batch_animals)}/{len(batch_urls)} successful ({success_rate:.1f}%)")
            
            # Longer pause between batches
            if i + batch_size < len(urls):
                time.sleep(self.get_rate_limit_delay() * 2)
        
        return all_animals
```

## Testing Strategy

### TDD Approach

Following the project's TDD philosophy:

1. **Write failing test first**
2. **Write minimal code to pass**
3. **Refactor with confidence**

### Test Structure

```python
# tests/scrapers/test_new_org.py
import pytest
from unittest.mock import Mock, patch
from scrapers.new_org.scraper import NewOrgScraper

class TestNewOrgScraper:
    """Comprehensive test suite for NewOrgScraper."""
    
    @pytest.fixture
    def scraper(self):
        """Create scraper instance for testing."""
        return NewOrgScraper(config_id="new-org")
    
    @pytest.fixture
    def sample_html(self):
        """Sample HTML for testing."""
        return """
        <html>
            <div class="dog-listing">
                <div class="dog-card">
                    <h3>Buddy</h3>
                    <p>Age: 3 years</p>
                    <p>Breed: Golden Retriever</p>
                    <a href="/dog/123">View Details</a>
                </div>
            </div>
        </html>
        """
    
    def test_extract_animal_urls(self, scraper, sample_html):
        """Test URL extraction from listing page."""
        urls = scraper._extract_animal_urls(sample_html)
        
        assert len(urls) == 1
        assert "/dog/123" in urls[0]
    
    def test_scrape_animal_detail_success(self, scraper):
        """Test successful animal detail scraping."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.content = """
            <html>
                <h1>Buddy</h1>
                <p>Age: 3 years</p>
                <p>Breed: Golden Retriever</p>
                <img src="https://example.com/buddy.jpg" />
            </html>
            """
            
            result = scraper._scrape_animal_detail("https://example.com/dog/123")
            
            assert result['name'] == 'Buddy'
            assert result['age_text'] == '3 years'
            assert result['breed'] == 'Golden Retriever'
            assert result['external_id'] == '123'
    
    def test_scrape_animal_detail_with_retry(self, scraper):
        """Test retry mechanism on failure."""
        with patch('requests.get') as mock_get:
            # First call fails, second succeeds
            mock_get.side_effect = [
                Exception("Network error"),
                Mock(content="<html><h1>Buddy</h1></html>")
            ]
            
            result = scraper._scrape_with_retry(scraper._scrape_animal_detail, "https://example.com/dog/123")
            
            assert result is not None
            assert mock_get.call_count == 2
    
    def test_validate_animal_data(self, scraper):
        """Test animal data validation."""
        # Valid data
        valid_data = {
            'name': 'Buddy',
            'external_id': '123',
            'adoption_url': 'https://example.com/dog/123'
        }
        assert scraper._validate_animal_data(valid_data) is True
        
        # Invalid data - missing name
        invalid_data = {
            'external_id': '123',
            'adoption_url': 'https://example.com/dog/123'
        }
        assert scraper._validate_animal_data(invalid_data) is False
        
        # Invalid data - connection error name
        error_data = {
            'name': 'This site cant be reached',
            'external_id': '123',
            'adoption_url': 'https://example.com/dog/123'
        }
        assert scraper._validate_animal_data(error_data) is False
    
    def test_skip_existing_animals(self, scraper):
        """Test skip existing animals functionality."""
        all_urls = [
            "https://example.com/dog/1",
            "https://example.com/dog/2",
            "https://example.com/dog/3"
        ]
        
        # Mock existing animals in database
        with patch.object(scraper, '_get_existing_animal_urls') as mock_existing:
            mock_existing.return_value = {"https://example.com/dog/2"}
            
            filtered_urls = scraper._filter_existing_urls(all_urls)
            
            assert len(filtered_urls) == 2
            assert "https://example.com/dog/1" in filtered_urls
            assert "https://example.com/dog/3" in filtered_urls
            assert "https://example.com/dog/2" not in filtered_urls
    
    @patch('scrapers.new_org.scraper.requests.get')
    def test_collect_data_integration(self, mock_get, scraper):
        """Integration test for full data collection."""
        # Mock listing page response
        mock_get.return_value.content = """
        <html>
            <div class="dog-card">
                <a href="/dog/123">Dog 1</a>
            </div>
            <div class="dog-card">
                <a href="/dog/456">Dog 2</a>
            </div>
        </html>
        """
        
        # Mock detail page responses
        with patch.object(scraper, '_scrape_animal_detail') as mock_detail:
            mock_detail.side_effect = [
                {
                    'name': 'Buddy',
                    'external_id': '123',
                    'adoption_url': 'https://example.com/dog/123',
                    'breed': 'Golden Retriever',
                    'age_text': '3 years'
                },
                {
                    'name': 'Max',
                    'external_id': '456',
                    'adoption_url': 'https://example.com/dog/456',
                    'breed': 'Labrador',
                    'age_text': '2 years'
                }
            ]
            
            results = scraper.collect_data()
            
            assert len(results) == 2
            assert results[0]['name'] == 'Buddy'
            assert results[1]['name'] == 'Max'
```

### Running Tests

```bash
# Run specific scraper tests
pytest tests/scrapers/test_new_org.py -v

# Run all scraper tests
pytest tests/scrapers/ -v

# Run with coverage
pytest tests/scrapers/ --cov=scrapers --cov-report=html

# Run integration tests
pytest tests/scrapers/ -m integration -v
```

## Operations & Monitoring

### Comprehensive Metrics

The system collects detailed metrics for monitoring and optimization:

```python
# Example metrics output
{
    "animals_found": 25,
    "animals_added": 3,
    "animals_updated": 12,
    "animals_unchanged": 10,
    "images_uploaded": 15,
    "images_failed": 1,
    "duration_seconds": 45.2,
    "data_quality_score": 0.87,
    "potential_failure_detected": false,
    "retry_attempts": 2,
    "retry_successes": 1,
    "retry_failure_rate": 0.5,
    "phase_timings": {
        "data_collection": 30.1,
        "database_operations": 12.3,
        "stale_data_detection": 2.8
    },
    "skip_existing_animals": true,
    "batch_size": 6,
    "rate_limit_delay": 2.0
}
```

### Quality Assessment

Automatic quality scoring based on field completeness:

```python
def assess_data_quality(self, animals_data: List[Dict[str, Any]]) -> float:
    """Calculate quality score (0-1) based on field completeness."""
    required_fields = ["name", "breed", "age_text", "external_id"]  # 70% weight
    optional_fields = ["sex", "size", "primary_image_url", "adoption_url"]  # 30% weight
    
    # Score calculation logic
    total_score = 0.0
    for animal in animals_data:
        animal_score = 0.0
        
        # Required fields contribute 70% of score
        required_present = sum(1 for field in required_fields if animal.get(field))
        animal_score += (required_present / len(required_fields)) * 0.7
        
        # Optional fields contribute 30% of score
        optional_present = sum(1 for field in optional_fields if animal.get(field))
        animal_score += (optional_present / len(optional_fields)) * 0.3
        
        total_score += animal_score
    
    return total_score / len(animals_data) if animals_data else 0.0
```

### Failure Detection

Multi-level failure detection system:

```python
# Catastrophic Failure Detection
def detect_catastrophic_failure(self, animals_found: int, absolute_minimum: int = 3) -> bool:
    """Detect complete scraper failures."""
    if animals_found == 0:
        return True
    if animals_found < absolute_minimum:
        return True
    return False

# Partial Failure Detection
def detect_partial_failure(self, animals_found: int, threshold_percentage: float = 0.5) -> bool:
    """Detect partial failures by comparing against historical averages."""
    historical_average = self._get_historical_average()
    if historical_average is None:
        return animals_found < 3  # Fallback to absolute minimum
    
    threshold = historical_average * threshold_percentage
    return animals_found < max(threshold, 3)  # Use higher of percentage or absolute minimum
```

### Monitoring Commands

```bash
# View organization status
python management/config_commands.py show pets-in-turkey

# Check recent scrape logs
python management/config_commands.py logs pets-in-turkey

# Run health checks
python management/config_commands.py health

# Generate metrics report
python management/config_commands.py metrics --days 7
```

## Troubleshooting

### Common Issues

#### 1. Zero Animals Found

```python
# Check if this is a filtering issue
if self.skip_existing_animals and self.total_animals_before_filter > 0:
    # Normal behavior - all animals were filtered out
    return False  # Not a failure
else:
    # Actual scraper failure
    return True
```

**Solutions:**
- Check website availability
- Verify selectors haven't changed
- Review rate limiting settings
- Check for IP blocking

#### 2. Image Upload Failures

```python
# Image upload with fallback
r2_url, success = self.r2_service.upload_image_from_url(
    original_url, animal_name, self.organization_name
)

if success:
    animal_data["primary_image_url"] = r2_url
    animal_data["original_image_url"] = original_url
else:
    # Fallback: keep original URL
    animal_data["primary_image_url"] = original_url
    animal_data["original_image_url"] = original_url
```

**Solutions:**
- Check R2 configuration (credentials, bucket name, custom domain)
- Verify image URLs are accessible
- Check for CORS issues
- Review image size limits
- Validate R2 bucket permissions

#### 3. Rate Limiting Issues

```python
# Implement exponential backoff
def _scrape_with_retry(self, scrape_method, *args, **kwargs):
    for attempt in range(self.max_retries):
        try:
            return scrape_method(*args, **kwargs)
        except Exception as e:
            if attempt < self.max_retries - 1:
                delay = self.rate_limit_delay * (self.retry_backoff_factor ** attempt)
                time.sleep(delay)
            else:
                raise e
```

**Solutions:**
- Increase `rate_limit_delay` in config
- Implement request headers to appear more browser-like
- Use proxies if necessary
- Check for IP-based blocking

#### 4. Data Quality Issues

```python
# Enhanced validation
def _validate_animal_data(self, animal_data: Dict[str, Any]) -> bool:
    # Check for error indicators in name
    if self._is_invalid_name(animal_data.get('name', '')):
        return False
    
    # Check required fields
    required_fields = ['name', 'external_id', 'adoption_url']
    for field in required_fields:
        if not animal_data.get(field):
            return False
    
    return True
```

**Solutions:**
- Review extraction selectors
- Add more robust error detection
- Implement data cleaning utilities
- Add field validation rules

### Debug Mode

Enable debug logging for troubleshooting:

```python
# Set logging level
logging.basicConfig(level=logging.DEBUG)

# Or in scraper
self.logger.setLevel(logging.DEBUG)
```

### Performance Optimization

#### 1. Batch Processing

```python
# Process animals in batches
batch_size = getattr(self, 'batch_size', 6)
for i in range(0, len(urls), batch_size):
    batch_urls = urls[i:i + batch_size]
    # Process batch
```

#### 2. Selective Processing

```python
# Skip existing animals
if self.skip_existing_animals:
    filtered_urls = self._filter_existing_urls(all_urls)
    # Process only new animals
```

#### 3. Caching

```python
# Cache frequently accessed data
@lru_cache(maxsize=128)
def _get_breed_standardization(self, breed: str) -> str:
    return standardize_breed(breed)
```

## Best Practices

### 1. Code Organization

```python
# Organize scraper methods logically
class WellOrganizedScraper(BaseScraper):
    # 1. Initialization
    def __init__(self, config_id: str, organization_id=None):
        pass
    
    # 2. Main entry point
    def collect_data(self) -> List[Dict[str, Any]]:
        pass
    
    # 3. High-level processing methods
    def _get_animal_listings(self) -> List[Dict]:
        pass
    
    def _process_animals_batch(self, urls: List[str]) -> List[Dict]:
        pass
    
    # 4. Individual extraction methods
    def _scrape_animal_detail(self, url: str) -> Dict[str, Any]:
        pass
    
    # 5. Helper methods
    def _extract_name(self, element) -> str:
        pass
    
    def _extract_breed(self, element) -> str:
        pass
    
    # 6. Utility methods
    def _safe_extract(self, element, selector: str) -> str:
        pass
    
    def _normalize_text(self, text: str) -> str:
        pass
```

### 2. Error Handling

```python
# Comprehensive error handling
def _scrape_animal_detail(self, url: str) -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract data with error handling
        animal_data = self._extract_animal_data(soup)
        
        # Validate before returning
        if self._validate_animal_data(animal_data):
            return animal_data
        else:
            self.logger.warning(f"Invalid data extracted from {url}")
            return None
            
    except requests.RequestException as e:
        self.logger.error(f"Request failed for {url}: {e}")
        return None
    except Exception as e:
        self.logger.error(f"Unexpected error processing {url}: {e}")
        return None
```

### 3. Rate Limiting

```python
# Proper rate limiting
def collect_data(self) -> List[Dict[str, Any]]:
    animals = []
    
    for url in animal_urls:
        # Always respect rate limits
        self.respect_rate_limit()
        
        try:
            animal_data = self._scrape_animal_detail(url)
            if animal_data:
                animals.append(animal_data)
        except Exception as e:
            self.logger.error(f"Error processing {url}: {e}")
            continue
    
    return animals
```

### 4. Data Validation

```python
# Robust data validation
def _validate_animal_data(self, animal_data: Dict[str, Any]) -> bool:
    # Check required fields
    required_fields = ['name', 'external_id', 'adoption_url']
    for field in required_fields:
        if not animal_data.get(field):
            self.logger.warning(f"Missing required field: {field}")
            return False
    
    # Check for error indicators
    if self._is_invalid_name(animal_data['name']):
        return False
    
    # Check URL format
    if not animal_data['adoption_url'].startswith('http'):
        self.logger.warning(f"Invalid adoption URL: {animal_data['adoption_url']}")
        return False
    
    return True
```

### 5. Testing Strategy

```python
# Comprehensive testing
class TestScraper:
    def test_basic_extraction(self):
        """Test basic data extraction."""
        pass
    
    def test_error_handling(self):
        """Test error handling scenarios."""
        pass
    
    def test_rate_limiting(self):
        """Test rate limiting behavior."""
        pass
    
    def test_data_validation(self):
        """Test data validation logic."""
        pass
    
    def test_integration(self):
        """Test full integration flow."""
        pass
```

### 6. Configuration Management

```python
# Use configuration-driven approach
class ConfigDrivenScraper(BaseScraper):
    def __init__(self, config_id: str, organization_id=None):
        super().__init__(config_id=config_id, organization_id=organization_id)
        
        # Get config values
        self.base_url = self.org_config.metadata.get('website_url')
        self.custom_setting = self.org_config.scraper.config.get('custom_setting', 'default')
    
    def collect_data(self) -> List[Dict[str, Any]]:
        # Use config-driven parameters
        delay = self.get_rate_limit_delay()
        max_retries = self.max_retries
        
        # Implementation using config values
        pass
```

## Conclusion

The Rescue Dog Aggregator scraper system represents a mature, production-ready solution for aggregating animal data from diverse sources. The combination of configuration-driven architecture, comprehensive error handling, and thorough testing ensures reliable operation at scale.

Key strengths of the system:

1. **Flexibility**: Supports diverse website structures and scraping patterns
2. **Reliability**: Comprehensive error handling and failure detection
3. **Scalability**: Modular architecture supporting easy addition of new organizations
4. **Maintainability**: Clean code structure with extensive documentation
5. **Observability**: Detailed metrics and monitoring capabilities

The system continues to evolve with new patterns and best practices, making it a robust foundation for rescue animal data aggregation.

For additional support and examples, refer to the existing scraper implementations in the codebase, particularly the advanced patterns demonstrated in the MISI's Rescue, The Underdog, and Pets in Turkey scrapers.