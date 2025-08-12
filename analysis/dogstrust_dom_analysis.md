# Dogs Trust Website Technical Analysis

## Executive Summary

Dogs Trust (dogstrust.org.uk) is a **JavaScript-heavy website** requiring **Selenium WebDriver** for listing page scraping, similar to Many Tears Rescue. Detail pages work with standard HTTP requests. The site contains rich, well-structured data across **703 dogs on 47 pages** with comprehensive information suitable for our aggregator platform.

## Recommended Scraping Approach

**Hybrid Approach**: Selenium for listing pages + HTTP requests for detail pages
- **Listing pages**: Selenium WebDriver (JavaScript-rendered content)  
- **Detail pages**: HTTP requests with proper User-Agent (faster, more efficient)
- **Rate limiting**: 2-3 second delays (similar to Many Tears Rescue)
- **Pagination**: URL-based system `?page=0` through `?page=46`

## Listing Page Analysis

### URL Structure
- **Base URL**: `https://www.dogstrust.org.uk/rehoming/dogs`
- **Pagination**: `?page=0` to `?page=46` (47 total pages)
- **Filtering**: URL parameters for breed, age, gender, size, location
- **Current total**: 703 matching dogs

### Dog Card Structure (JavaScript-rendered)

**Key Finding**: Dog cards are **dynamically loaded via JavaScript** - not accessible via standard HTTP requests.

```html
<!-- Dog Card Pattern (from Playwright snapshot) -->
<a href="/rehoming/dogs/weimaraner/3592421" cursor="pointer">
  <img src="[dog-image-url]" cursor="pointer">
  <div cursor="pointer">
    <div cursor="pointer">Maya</div>                    <!-- Name -->
    <div cursor="pointer">Weimaraner Cross</div>        <!-- Breed -->
    <div cursor="pointer">Ilfracombe</div>              <!-- Location -->
    <div cursor="pointer">Female · 6 - 12 months · Size: Medium</div>  <!-- Age/Sex/Size -->
  </div>
</a>
```

### CSS Selectors for Listing Page

```css
/* Dog detail links */
a[href*="/rehoming/dogs/"] /* Filter for actual detail pages (avoid category links) */

/* Dog cards - need Selenium to access content */
/* Individual data extraction requires JavaScript execution */

/* Pagination info */
*:contains("of") /* e.g., "1 of 47" */

/* Dog count */
*:contains("matching dogs") /* e.g., "703 matching dogs" */
```

### Pagination Mechanism

- **URL-based**: Simple page parameter increment
- **Total pages**: 47 (determined from "1 of 47" indicator)
- **Dogs per page**: ~15 dogs per page 
- **Navigation**: Previous/Next buttons + First/Last page buttons
- **All pages accessible**: Tested pages 0, 1, 5, 10, 46 - all return 200 status

## Detail Page Analysis

### URL Pattern
`https://www.dogstrust.org.uk/rehoming/dogs/{breed-slug}/{reference-id}`

**Examples**:
- `https://www.dogstrust.org.uk/rehoming/dogs/weimaraner/3592421` (Maya)
- `https://www.dogstrust.org.uk/rehoming/dogs/italian-corso-dog/3427428` (Nala)

### Data Fields Mapping

**Core Information Section**:
```html
<h1>Maya</h1>  <!-- Name -->

<!-- Data grid with icons and values -->
<div>
  <img> <!-- Breed icon -->
  <div>
    <div>Breed</div>
    <a href="/rehoming/dogs?breed%5B0%5D=Weimaraner...">Weimaraner Cross</a>
  </div>
</div>

<div>
  <img> <!-- Reference ID icon -->
  <div>
    <div>Reference ID</div>
    <div>3592421</div>
  </div>
</div>

<div>
  <img> <!-- Age icon -->
  <div>
    <div>Age</div>
    <a href="/rehoming/dogs?age%5B0%5D=6%20-%2012%20months...">6 - 12 months</a>
  </div>
</div>

<div>
  <img> <!-- Sex icon -->
  <div>
    <div>Sex</div>
    <a href="/rehoming/dogs?gender%5B0%5D=Female...">Female</a>
  </div>
</div>

<div>
  <img> <!-- Size icon -->
  <div>
    <div>Size</div>
    <a href="/rehoming/dogs?size%5B0%5D=Medium...">Medium</a>
  </div>
</div>

<div>
  <img> <!-- Location icon -->
  <div>
    <div>Location</div>
    <a href="/rehoming/dogs?centres%5B0%5D=ILF...">Ilfracombe</a>
  </div>
</div>
```

**Additional Fields** (when present):
```html
<!-- Medical care (some dogs) -->
<div>
  <img>
  <div>
    <div>Medical care</div>
    <div>I need ongoing medical care</div>
  </div>
</div>

<!-- Living situation -->
<div>
  <img>
  <div>
    <div>Living off site</div>
    <div>Yes</div>
  </div>
</div>

<!-- Compatibility -->
<div>
  <img>
  <div>
    <div>May live with</div>
    <div>
      <a href="...">Dogs</a> and 
      <div>
        <a href="...">Secondary</a>
        <div>school age children.</div>
      </div>
    </div>
  </div>
</div>
```

### CSS Selectors for Detail Pages

```css
/* Name */
h1  /* Page title is dog name */

/* Breed */
a[href*="breed%5B0%5D="]  /* Breed filter link */

/* Reference ID */
/* Pattern: Look for 7-digit numbers in generic divs */
div:matches(^\d{7}$)

/* Age */
a[href*="age%5B0%5D="]  /* Age filter link */

/* Sex */
a[href*="gender%5B0%5D="]  /* Gender filter link */

/* Size */  
a[href*="size%5B0%5D="]  /* Size filter link */

/* Location */
a[href*="centres%5B0%5D="]  /* Centre filter link */

/* Medical care (optional) */
div:contains("I need ongoing medical care")

/* May live with */
div:contains("May live with")
```

### Description Structure

Dogs Trust uses a **two-part description pattern** that needs to be combined:

```html
<!-- Part 1: "Are you right for [Name]?" -->
<h2>Are you right for Maya?</h2>
<p>Maya is a nine-month-old Weimaraner cross Spaniel looking for a fun and loving home. She could share her home with children as young as eleven...</p>

<!-- Part 2: "Is [Name] right for you?" -->  
<h2>Is Maya right for you?</h2>
<p>Maya is an absolute sweetie! She is nervous to begin with but comes around quickly. She enjoys playing with her soft squeaky toys...</p>
```

**Extraction Strategy**:
1. Find `h2` containing "Are you right for"
2. Extract following `p` element content
3. Find `h2` containing "Is [Name] right for you"  
4. Extract following `p` element content
5. Combine with newline separator: `part1 + "\n\n" + part2`

### Image Gallery Structure

Dogs Trust uses an **image carousel system**:

```html
<!-- Main hero image -->
<img src="[main-image-url]" alt="Maya | Weimaraner Cross | Ilfracombe - 1">

<!-- Additional gallery images -->
<img src="[image-2-url]" alt="Maya | Weimaraner Cross | Ilfracombe - 3">
<img src="[image-3-url]" alt="Maya | Weimaraner Cross | Ilfracombe - 5">

<!-- Navigation indicator -->
<p>1 of 6</p>  <!-- 6 total images for Maya -->
<p>1 of 3</p>  <!-- 3 total images for Nala -->
```

**Hero Image Selection**: The first/main image is the primary display image in the carousel.

## Testing Results

### HTTP Requests vs Selenium

| Approach | Listing Pages | Detail Pages | Verdict |
|----------|---------------|--------------|---------|
| HTTP Requests | ❌ 0 dogs found | ✅ Full data extraction | Listing pages need JavaScript |
| Selenium WebDriver | ✅ 15 dogs found | ✅ Full data extraction | Required for listing pages |

### Detail Page Data Extraction (HTTP Requests)

**Maya (3592421)**:
- ✅ Name: "Maya"
- ✅ Breed: "Weimaraner Cross" 
- ✅ Reference ID: "3592421"
- ✅ Description sections: 2 parts found

**Nala (3427428)**:
- ✅ Name: "Nala"
- ✅ Breed: "Italian Corso Dog Cross"
- ✅ Reference ID: "3427428" 
- ✅ Description sections: 2 parts found

### Pagination Testing

All pagination URLs tested successfully:
- ✅ Page 0: Status 200
- ✅ Page 1: Status 200  
- ✅ Page 5: Status 200
- ✅ Page 10: Status 200
- ✅ Page 46: Status 200 (last page)

## Implementation Recommendations

### 1. Scraper Architecture

Follow **Many Tears Rescue pattern** with modifications:

```python
class DogsTrustScraper(BaseScraper):
    def __init__(self, config_id: str = "dogstrust", ...):
        super().__init__(config_id=config_id, ...)
        # Use config-driven URLs
        self.base_url = self.org_config.metadata.website_url
        self.listing_url = f"{self.base_url}/rehoming/dogs"
    
    def collect_data(self) -> List[Dict[str, Any]]:
        # Phase 1: Get all dog URLs via Selenium (47 pages)
        all_urls = self._get_all_dog_urls_selenium()
        
        # Phase 2: Extract details via HTTP requests (faster)
        all_dogs = []
        for url in all_urls:
            details = self._extract_dog_details_http(url)
            if details:
                all_dogs.append(details)
            time.sleep(2)  # Rate limiting
            
        return all_dogs
```

### 2. Configuration Template

```yaml
schema_version: "1.0"
id: "dogstrust"
name: "Dogs Trust"
enabled: true

scraper:
  class_name: "DogsTrustScraper"
  module: "scrapers.dogstrust.dogstrust_scraper"
  config:
    rate_limit_delay: 2.5    # Similar to Many Tears
    max_retries: 3
    timeout: 30
    batch_size: 10           # Parallel detail processing
    skip_existing_animals: false

metadata:
  website_url: "https://www.dogstrust.org.uk"
  description: "Dogs Trust is the UK's largest dog welfare charity..."
  location:
    country: "GB"
    city: "London"
  service_regions: ["GB"]
```

### 3. Data Field Mapping

```python
FIELD_MAPPINGS = {
    "name": "h1",
    "breed": "a[href*='breed%5B0%5D=']",
    "external_id": "div:regex(^\d{7}$)",  # 7-digit reference ID
    "age_text": "a[href*='age%5B0%5D=']", 
    "sex": "a[href*='gender%5B0%5D=']",
    "size": "a[href*='size%5B0%5D=']",
    "location": "a[href*='centres%5B0%5D=']",
    "medical_info": "div:contains('I need ongoing medical care')",
    "description": "combine_description_sections()",  # Custom function
    "primary_image_url": "main carousel image",
    "image_urls": "all carousel images"
}
```

### 4. Rate Limiting Strategy

- **Listing pages (Selenium)**: 3 seconds between pages (47 pages = ~2.5 minutes)
- **Detail pages (HTTP)**: 2 seconds between requests (703 dogs = ~25 minutes)  
- **Total scrape time**: ~30 minutes (reasonable for 703 dogs)
- **Respectful to site**: Similar to Many Tears Rescue timings

## JavaScript Dependencies

Dogs Trust **requires JavaScript** for:
- ✅ **Listing pages**: Dog cards dynamically loaded
- ❌ **Detail pages**: Static HTML content  
- ✅ **Pagination**: Navigation controls (but direct URL access works)
- ❌ **Data fields**: All accessible in initial HTML response

## Data Quality Assessment

**Excellent data quality and completeness**:

### Required Fields (Zero NULLs compliance)
- ✅ **Name**: Always present in `h1`
- ✅ **Breed**: Always present as clickable link
- ✅ **External ID**: 7-digit reference ID always present  
- ✅ **Animal type**: "dog" (known from site context)
- ✅ **Status**: "available" (assume available unless marked RESERVED)

### Rich Additional Data
- ✅ **Age**: Structured age ranges (e.g., "6 - 12 months", "2 - 5 years")
- ✅ **Sex**: "Male" or "Female"  
- ✅ **Size**: "Small", "Medium", "Large" with size guide
- ✅ **Location**: Specific centre names (e.g., "Ilfracombe", "Harefield West London")
- ✅ **Description**: Rich two-part descriptions with personality and care info
- ✅ **Images**: Multiple high-quality images in carousel
- ✅ **Compatibility**: Living situation requirements (children, other pets)
- ✅ **Medical care**: Special needs indicators when applicable

### Standardization Needs
- **Age**: Use existing `standardize_age()` utility  
- **Breed**: Use `normalize_breed_case()` utility
- **Size**: Already standardized ("Small", "Medium", "Large")
- **Location**: May need mapping to Dogs Trust centre codes

## Security & Blocking Considerations

**Low risk of blocking** with proper practices:
- ✅ Standard HTTP requests work for detail pages
- ✅ No sign of rate limiting or CAPTCHAs during testing
- ✅ Proper User-Agent required but no advanced bot detection observed
- ✅ 2-3 second delays should be sufficient (similar to Many Tears)

**Recommended headers**:
```python
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}
```

## Performance Projections

Based on 703 dogs across 47 pages:

**Listing Collection (Selenium)**:
- 47 pages × 3 seconds = 141 seconds (~2.5 minutes)
- ~15 dogs per page discovered

**Detail Extraction (HTTP)**:  
- 703 dogs × 2 seconds = 1,406 seconds (~23 minutes)
- Much faster than full Selenium approach

**Total Scraping Time**: ~25-30 minutes
**Memory Usage**: Moderate (Selenium + BeautifulSoup processing)
**Success Rate**: Expected >95% (based on site stability during testing)

## Comparison to Many Tears Rescue

| Aspect | Many Tears Rescue | Dogs Trust |
|--------|-------------------|------------|
| **JavaScript Required** | ✅ Yes (Cloudflare) | ✅ Yes (listing pages) |
| **Selenium Needed** | ✅ Full site | ✅ Listing pages only |
| **Detail Page Approach** | Selenium | HTTP requests (faster) |
| **Total Dogs** | ~100-150 | 703 |  
| **Data Quality** | Excellent | Excellent |
| **Rate Limiting** | 3s delays | 2-3s delays |
| **Complexity** | High | Medium-High |

## Next Steps for Implementation

1. **Create YAML configuration** following existing patterns
2. **Implement hybrid scraper** (Selenium + HTTP requests)  
3. **Add comprehensive tests** with mocked responses
4. **Integrate standardization utilities** for age, breed normalization
5. **Set up parallel detail processing** for performance
6. **Configure proper error handling** for individual dog failures  
7. **Add integration with image upload service** (R2/Cloudinary)

Dogs Trust represents a **high-value addition** to our platform with **excellent data quality** and **manageable technical complexity** similar to our existing Many Tears Rescue implementation.