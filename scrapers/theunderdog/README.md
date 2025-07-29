# The Underdog Scraper

## Overview

The Underdog scraper extracts dog adoption data from [The Underdog](https://www.theunderdog.org), an international rescue organization based in the UK that focuses on rescuing dogs from Bosnia, Cyprus, Romania, and France. The scraper handles their Squarespace-based website and provides rich data including detailed dog descriptions, Q&A properties, and country information.

## Key Features

- **Squarespace Integration**: Handles lazy-loaded images with `data-src` extraction
- **Multi-Country Support**: Extracts country information from flag emojis (🇬🇧🇨🇾🇧🇦🇫🇷🇷🇴)
- **Rich Descriptions**: Preserves detailed dog stories and personalities
- **Q&A Data**: Captures structured property data (age, size, gender, living requirements)
- **Status Filtering**: Automatically excludes ADOPTED/RESERVED dogs
- **Data Quality**: Provides standardized age formats and comprehensive normalization

## Data Structure

### Input Data (Website)
```html
<!-- Listing Page -->
<article class="ProductList-item">
  <h2 class="ProductList-title">Vicky 🇬🇧</h2>
  <a href="/adopt/vicky">...</a>
</article>

<!-- Detail Page -->
<h1 class="ProductItem-details-title">Vicky 🇬🇧</h1>
<div class="ProductItem-details-excerpt">
  How big?<br>Large (around 30kg)<br><br>
  How old?<br>Young adult (around two years)<br><br>
  About Vicky<br><br>
  Vicky is currently in a foster home...
</div>
```

### Output Data Structure
```json
{
  "name": "Vicky",
  "external_id": "vicky", 
  "adoption_url": "https://www.theunderdog.org/adopt/vicky",
  "primary_image_url": "https://images.squarespace-cdn.com/content/v1/.../image.jpeg?format=1500w",
  "animal_type": "dog",
  "status": "available",
  "country": "United Kingdom",
  "country_code": "GB",
  "properties": {
    "raw_qa_data": {
      "How big?": "Large (around 30kg)",
      "How old?": "Young adult (around two years)",
      "Male or female?": "Female",
      "Living with kids?": "I can live with children (8+)",
      "Living with dogs?": "I can live with other dogs"
    },
    "raw_name": "Vicky",
    "raw_description": "Vicky is currently in a foster home...",
    "page_url": "https://www.theunderdog.org/adopt/vicky"
  },
  "age_text": "2 years",
  "age_years": 2.0,
  "age_min_months": 12,
  "age_max_months": 36,
  "breed": "Mixed Breed",
  "sex": "F",
  "size": "Large",
  "weight_kg": 30.0
}
```

## Scraper Flow

### 1. Data Collection (`collect_data()`)
```python
1. Fetch listing page: https://www.theunderdog.org/adopt
2. Extract available dogs (exclude ADOPTED/RESERVED)
3. For each dog:
   - Fetch detail page
   - Extract all data points
   - Apply normalization
   - Return structured data
```

### 2. Listing Page Processing (`get_animal_list()`)
- Finds all `.ProductList-item` elements
- Extracts basic info: name, URL, thumbnail
- **Critical**: Filters by availability using original name (before cleaning)
- Cleans names (removes flags/status) for final output

### 3. Detail Page Processing (`scrape_animal_details()`)
- **Name Processing**: Extract raw name → check availability → extract country → clean name
- **Image Extraction**: Priority system for Squarespace images
- **Properties Extraction**: Q&A parsing with HTML structure handling
- **Normalization**: Age, breed, size, weight standardization

### 4. Data Normalization (`normalize_animal_data()`)
- **Age Standardization**: Converts to decimal years and month ranges
- **Breed Extraction**: From description text (not properties)
- **Size/Weight**: Extracts from "How big?" property
- **Gender Mapping**: Maps "Male or female?" to M/F

## Special Handling & Quirks

### 1. Squarespace Image Extraction
**Challenge**: Squarespace uses lazy loading with `src="No src"` and actual URLs in `data-src`

**Solution**: Priority-based extraction:
```python
# PRIORITY 1: data-src attributes (working URLs)
gallery_imgs = soup.select('.ProductItem-gallery img[data-src]')
for img in gallery_imgs:
    data_src = img.get('data-src', '')
    if data_src.startswith('http'):
        return data_src + '?format=1500w'

# PRIORITY 2: Alt-based URL construction (fallback)
# PRIORITY 3: Traditional src extraction (final fallback)
```

### 2. Country Flag Processing
**Challenge**: Names contain flag emojis that need country extraction before cleaning

**Solution**: Two-step process:
```python
# 1. Extract country from raw name with flag
raw_name = "Vicky 🇬🇧"  
country = extract_country_from_name(raw_name)  # {"name": "UK", "iso_code": "GB"}

# 2. Clean name for final output
clean_name = clean_name(raw_name)  # "Vicky"
```

**Flag Mapping**:
- 🇬🇧 → United Kingdom (GB)
- 🇨🇾 → Cyprus (CY) 
- 🇧🇦 → Bosnia and Herzegovina (BA)
- 🇫🇷 → France (FR)
- 🇷🇴 → Romania (RO)

### 3. Properties Parsing
**Challenge**: HTML structure has Q&A on separate lines vs combined lines

**Solution**: Flexible parser handles both:
```python
# Separate lines: "How big?" → "Large (around 30kg)"
# Combined lines: "How big? Large (around 30kg)"
```

### 4. Availability Detection
**Critical**: Must check availability BEFORE name cleaning:
```python
# ✅ Correct order
raw_name = "Max RESERVED"
if not is_available_dog(raw_name):  # Detects "RESERVED"
    return None
clean_name = clean_name(raw_name)  # "Max"

# ❌ Wrong order would miss status
```

### 5. Age Format Consistency
**Standardization**: Converts various formats to clean output:
- "Young adult (around two years)" → "2 years" (integer when possible)
- "Puppy (18 months)" → "1.5 years" (decimal when needed)
- Calculates age ranges: 2 years → 12-36 months

## Configuration

### YAML Config (`configs/organizations/theunderdog.yaml`)
```yaml
name: "The Underdog"
scraper_class: "TheUnderdogScraper"
base_url: "https://www.theunderdog.org"
active: true
countries_operated:
  - "GB"  # United Kingdom
  - "CY"  # Cyprus  
  - "BA"  # Bosnia and Herzegovina
  - "FR"  # France
  - "RO"  # Romania
```

## Testing

### Unit Tests
```bash
# Run all The Underdog tests
pytest tests/scrapers/test_theunderdog* -v

# Test categories:
# - Integration tests (full pipeline)
# - Scraper functionality 
# - Normalizer functions
# - Image extraction
# - Property parsing
```

### Manual Testing
```bash
# Test scraper with config
python management/config_commands.py run theunderdog --test

# Database verification
psql -h localhost -U samposatama -d rescue_dogs -c "
SELECT name, properties->'raw_description' as description 
FROM animals WHERE organization_id = 14 LIMIT 5;"
```

## Performance Characteristics

- **Rate Limiting**: 1-second delay between requests
- **Memory Usage**: ~50MB for full scrape (50+ dogs)
- **Execution Time**: ~2-3 minutes for full collection
- **Success Rate**: 95%+ (robust error handling)
- **Data Quality**: 100% properties preservation, 85% successful normalization

## Maintenance Notes

### Common Issues
1. **Images not loading**: Check if Squarespace changed lazy loading structure
2. **Properties missing**: Verify HTML structure hasn't changed in `.ProductItem-details-excerpt`
3. **Country detection failing**: Check if new flag emojis added or flag mapping needs update

### Monitoring
- Watch for changes in CSS selectors (`.ProductList-item`, `.ProductItem-gallery`)
- Monitor availability detection logic for new status keywords
- Check image URL patterns if CDN changes

### Future Enhancements
- Support for additional countries/flags
- Enhanced breed detection from properties
- Automatic retry logic for failed image extractions
- Real-time status updates

## Dependencies

- `requests`: HTTP requests
- `beautifulsoup4`: HTML parsing  
- `re`: Regular expressions for text processing
- `scrapers.base_scraper`: Inheritance and common functionality

## Contribution Guidelines

When modifying this scraper:

1. **Preserve data structure**: Maintain `raw_qa_data` format for frontend compatibility
2. **Test thoroughly**: Run integration tests after changes
3. **Follow TDD**: Write tests before implementation
4. **Document changes**: Update this README for significant modifications
5. **Maintain rate limiting**: Respect website resources

## Related Documentation

- [Base Scraper Documentation](../base_scraper.py)
- [Scraper Design Patterns](../../docs/scraper_design.md)
- [Testing Guide](../../TESTING.md)
- [Configuration Guide](../../docs/getting-started/configuration.md)