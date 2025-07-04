# Scraper Design

## Configuration-Driven Architecture

The scraper system uses a configuration-driven approach where scrapers are defined via YAML configuration files rather than hardcoded references. This provides:

- **Easy deployment**: Add new organizations without code changes
- **Flexible configuration**: Per-organization settings for rate limiting, timeouts, etc.
- **Automatic database sync**: Organizations sync from configs to database
- **Management commands**: CLI tools for validation and management

See [Configuration System Guide](getting-started/configuration.md) for detailed configuration guide.

## Legacy Note

The system maintains backward compatibility with existing scrapers while transitioning to the config-driven approach.

## Scraper Architecture

The Rescue Dog Aggregator uses a modular scraper architecture to collect data from different rescue organizations.

### Base Scraper Class

The `BaseScraper` is an abstract base class that provides comprehensive production-ready functionality:

- **Database Operations**: Complete CRUD methods for animal management
- **Session Tracking**: Scrape session management for stale data detection
- **Availability Management**: Automatic confidence scoring and lifecycle tracking
- **Error Handling**: Partial failure detection and graceful error recovery
- **Metrics & Monitoring**: Detailed JSONB metrics with quality scoring
- **Language Detection**: Automatic language tagging
- **Image Processing**: Cloudinary integration with fallback handling

### Organization-Specific Scrapers

Each rescue organization has its own scraper that extends the `BaseScraper`:

- Implements the `collect_data` method to extract data from the specific website
- Handles the specific HTML structure and navigation of that organization's website
- Extracts and standardizes the dog data

## Data Collection Flow

### Production-Ready Scraping Process

1. **Session Initialization**: Start scrape session for stale data tracking
2. **Website Navigation**: Navigate to organization's website with rate limiting
3. **Data Extraction**: Extract dog listings with comprehensive error handling
4. **Data Processing**: For each dog, collect and standardize:
   - Name, breed, age, sex, size, status
   - Images (with Cloudinary upload)
   - Adoption URL and external ID
5. **Database Operations**: Use production-ready CRUD methods:
   - `get_existing_animal()` - Check if animal exists by external_id
   - `create_animal()` - Insert new animals with standardization
   - `update_animal()` - Update existing animals with change detection
6. **Availability Tracking**: Mark animals as seen in current session
7. **Stale Data Management**: Update confidence levels for unseen animals
8. **Quality Assessment**: Calculate data quality score (0-1)
9. **Metrics Logging**: Store detailed JSONB metrics with performance data
10. **Error Recovery**: Handle partial failures without affecting existing data

### CRUD Operations

#### `get_existing_animal(external_id, organization_id)`

Checks if an animal already exists in the database by external ID.

**Returns**: `(id, name, updated_at)` tuple if found, `None` otherwise

#### `create_animal(animal_data)`

Inserts a new animal with full standardization and availability tracking.

**Features**:

- Automatic breed, age, and size standardization
- Language detection
- Sets initial availability confidence to 'high'
- Timestamps for tracking (created_at, last_seen_at)

**Returns**: `(animal_id, "added")` if successful

#### `update_animal(animal_id, animal_data)`

Updates existing animal with change detection and availability management.

**Features**:

- Compares current vs new data to detect actual changes
- Updates last_seen_at timestamp
- Resets availability confidence to 'high'
- Applies standardization to changed fields

**Returns**: `(animal_id, "updated")` or `(animal_id, "no_change")`

### Session Tracking & Availability Management

#### `start_scrape_session()`

Initializes a new scrape session timestamp for tracking which animals are seen.

#### `update_stale_data_detection()`

Updates availability for animals not seen in current session:

- 1 missed scrape → `availability_confidence = 'medium'`
- 2+ missed scrapes → `availability_confidence = 'low'`
- 4+ missed scrapes → `status = 'unavailable'`

#### `mark_animals_unavailable(threshold=4)`

Marks animals as unavailable after consecutive missed scrapes.

#### `restore_available_animal(animal_id)`

Restores an animal to available status when it reappears.

### Error Handling & Recovery

#### `detect_partial_failure(animals_found, threshold_percentage=0.5)`

Compares current scrape results against historical averages to detect scraper issues.

**Returns**: `True` if potential scraper failure detected (prevents false stale data)

#### `handle_scraper_failure(error_message)`

Handles scraper failures without affecting existing animal availability:

- Logs detailed error information
- Preserves current animal status (no false unavailable marking)
- Resets scrape session to prevent stale data updates

### Enhanced Metrics & Monitoring

#### `log_detailed_metrics(metrics)`

Stores comprehensive scrape statistics as JSONB:

```json
{
  "animals_found": 25,
  "animals_added": 3,
  "animals_updated": 12,
  "animals_unchanged": 10,
  "duration_seconds": 45.2,
  "data_quality_score": 0.87,
  "potential_failure_detected": false
}
```

#### `assess_data_quality(animals_data)`

Calculates automatic quality score (0-1) based on:

- Required fields: name, breed, age_text, external_id (70% weight)
- Optional fields: sex, size, images, adoption_url (30% weight)

#### `calculate_scrape_duration(start_time, end_time)`

Tracks performance for optimization insights.

## Adding a New Scraper

The system uses a configuration-driven approach. To add a new rescue organization:

### 1. Create Configuration File

```bash
# Create configs/organizations/new-org.yaml (follow existing pattern)
# Current organizations: pets-in-turkey, tierschutzverein-europa, rean
touch configs/organizations/new-org.yaml
```

### 2. Define Organization Config

```yaml
schema_version: "1.0"
id: "new-org"
name: "New Rescue Organization"
enabled: true
scraper:
  class_name: "NewOrgScraper"
  module: "scrapers.new_org"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
metadata:
  website_url: "https://neworg.com"
  description: "Description"
  location:
    country: "US"
    city: "City Name"
  service_regions:
    - country: "US"
      regions: ["CA", "NV"]
```

### 3. Implement Scraper Class

```python
# scrapers/new_org/__init__.py
from .scraper import NewOrgScraper

# scrapers/new_org/scraper.py
from scrapers.base_scraper import BaseScraper

class NewOrgScraper(BaseScraper):
    def collect_data(self):
        """Extract animal data from organization website.

        The BaseScraper handles all database operations, availability
        management, and error handling automatically.

        Returns:
            List of dictionaries containing animal data
        """
        animals = []

        # Your website-specific extraction logic here
        # Use self.respect_rate_limit() between requests
        # Use self.logger for logging

        for animal_element in self.extract_animal_listings():
            animal_data = {
                'name': self.extract_name(animal_element),
                'breed': self.extract_breed(animal_element),
                'age_text': self.extract_age(animal_element),
                'sex': self.extract_sex(animal_element),
                'size': self.extract_size(animal_element),
                'external_id': self.extract_id(animal_element),
                'primary_image_url': self.extract_image(animal_element),
                'adoption_url': self.extract_adoption_url(animal_element),
                'status': 'available'  # Default status
            }
            animals.append(animal_data)

        return animals
```

### 4. Sync Configuration

```bash
# Activate virtual environment (REQUIRED)
source venv/bin/activate

# Validate and sync to database
python management/config_commands.py validate
python management/config_commands.py sync

# Verify sync was successful
python management/config_commands.py list
```

### 5. Test Scraper

```bash
# Activate virtual environment (REQUIRED)
source venv/bin/activate

# Test the new scraper
python management/config_commands.py run new-org

# Check results and organization details
python management/config_commands.py show new-org

# Monitor database for new animals
psql -h localhost -d rescue_dogs -c "SELECT COUNT(*) FROM animals WHERE organization_id = (SELECT id FROM organizations WHERE config_id = 'new-org');"
```

The BaseScraper automatically handles:

- Database CRUD operations
- Availability tracking and confidence scoring
- Error handling and partial failure detection
- Metrics collection and quality assessment
- Image processing with Cloudinary
- Standardization of breed, age, and size data

## Handling Different Website Structures

Each organization's website is unique, so the scrapers use various techniques:

- HTML parsing with BeautifulSoup
- JavaScript execution with Selenium
- Regular expressions for text extraction
- Flexible matching for inconsistent data

### Advanced Extraction Techniques

#### Unified DOM-Based Extraction (2024 Enhancement)

For complex websites with dynamic content and lazy loading, the system now supports unified DOM-based extraction that maintains spatial relationships between content and images:

**Key Features:**

- **Container-Based Processing**: Extract complete dog information from individual DOM containers
- **Spatial Relationship Preservation**: Maintain association between text and images within the same container
- **Lazy Loading Handling**: Comprehensive scrolling patterns to trigger dynamic image loading
- **Robust Selector Strategies**: Multiple CSS selector fallbacks for container detection
- **Error Recovery**: Graceful fallback to legacy methods if unified approach fails

**Implementation Pattern:**

```python
class AdvancedScraper(BaseScraper):
    def extract_dogs_with_images_unified(self, url: str, page_type: str) -> List[Dict[str, Any]]:
        """
        Extract dogs and images in unified DOM approach.

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
                dog_data = self._extract_single_dog_from_container(container, page_type)
                if dog_data:
                    dogs_data.append(dog_data)

            return dogs_data

        except Exception as e:
            # Graceful fallback to legacy method
            return self._extract_dogs_legacy_fallback(url, page_type)
```

**Benefits:**

- Eliminates image association errors common with position-based matching
- Handles modern websites with lazy loading and dynamic content
- Maintains backwards compatibility through fallback mechanisms
- Provides robust error handling for production environments

#### Container Detection Strategies

**Primary Selectors** (tried in order):

```css
div.x-el-article    /* Primary container class */
div.x.c1-5          /* Alternative container class */
div[class*='x-el-article']  /* Partial class matching */
div[class*='c1-5']          /* Fallback partial matching */
```

**Fallback Detection:**

- H3-based detection for finding dog name headers
- Parent container traversal to find complete content blocks
- Content validation to ensure containers have expected dog information

#### Lazy Loading Management

**Comprehensive Scrolling Pattern:**

1. Initial scroll to bottom to trigger all lazy loading
2. Return to top for systematic processing
3. Progressive scroll in small increments (300px)
4. Multiple scroll cycles to ensure all images load
5. Final verification scroll to catch any remaining dynamic content

This approach ensures that all images are properly loaded before extraction, preventing missing images due to lazy loading delays.

#### Error Recovery & Fallbacks

**Graceful Degradation:**

- If unified extraction fails, automatically falls back to legacy methods
- Partial failure detection prevents false stale data marking
- Container validation ensures only valid dog containers are processed
- Image validation filters out placeholders and non-dog images

**Production Reliability:**

- Comprehensive error logging for debugging
- Session tracking maintains data consistency
- Quality scoring validates extraction success
- Metrics collection enables monitoring and optimization
