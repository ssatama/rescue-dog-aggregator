# Animal Rescue Bosnia DOM Analysis

## Website Structure Analysis

### Overview
- **Website URL**: https://www.animal-rescue-bosnia.org/our-dogs/
- **Example Detail URL**: https://www.animal-rescue-bosnia.org/ksenon/
- **Technology Stack**: WordPress-based website with responsive design
- **JavaScript Requirements**: Minimal - standard requests library should work

## Listing Page Analysis (https://www.animal-rescue-bosnia.org/our-dogs/)

### Page Structure
Based on screenshots and DOM analysis, the listing page contains:

1. **"We are already in Germany" section** - First 3 dogs
2. **"Our Dogs waiting for you in Bosnia" section** - Remaining dogs

### Dog Card Structure
From the analysis, each dog card appears to follow this pattern:

```html
<h2>Dog Name</h2>
<img src="https://www.animal-rescue-bosnia.org/wp-content/uploads/[year]/[month]/[dog-name]-[number].jpg" alt="">
<p>
  Breed: [breed]<br>
  Gender: [gender]<br>
  Date of birth: [date]<br>
  Height: [height] cm<br>
  Weight: [weight] kg<br>
  In a shelter from: [date]
</p>
```

### Key DOM Patterns
- **126 total headings** found on the page
- **123 images** detected
- **Section headers**: 
  - "We are already in Germany and waiting for a Happy End:"
  - "Our Dogs waiting for you in Bosnia"

### CSS Selectors for Listing Page
- **Dog names**: `h2` tags containing dog names
- **Dog images**: `img` tags with src containing dog photos
- **Section identification**: Look for h2 with specific text content

### Filtering Logic
To identify dogs in Bosnia vs Germany:
1. Parse page content sequentially
2. Track current section based on heading text
3. Skip dogs in "Germany" section
4. Process only dogs in "Bosnia" section

## Detail Page Analysis (https://www.animal-rescue-bosnia.org/ksenon/)

### Page Structure
Each detail page contains:
- **Page title**: "Dog Name - Animal Rescue Bosnia"
- **H1 heading**: Dog name
- **Hero image**: First significant image
- **Short description section**: Structured data
- **Image gallery**: Multiple photos of the dog

### Data Extraction Patterns

#### Dog Name
- **Selector**: `h1` (primary heading)
- **Example**: "Ksenon"

#### Hero Image
- **Selector**: First `img` tag with meaningful src
- **Pattern**: `https://www.animal-rescue-bosnia.org/wp-content/uploads/[year]/[month]/[dog-name]-[number].jpg`
- **Example**: `https://www.animal-rescue-bosnia.org/wp-content/uploads/2025/06/Ksenon-2.jpg`

#### Short Description Section
The structured data appears in plain text format:
```
Breed: Mix
Gender: Male
Date of birth: January 2022
Height: 56 cm
Weight: 25 kg
In a shelter from: May 2025
```

#### Data Field Patterns
- **Breed**: `Breed: [value]`
- **Gender**: `Gender: [Male|Female]`
- **Date of birth**: `Date of birth: [Month Year]`
- **Height**: `Height: [number] cm`
- **Weight**: `Weight: [number] kg`
- **Shelter entry**: `In a shelter from: [Month Year]`

## Recommended Scraping Approach

### Technology Stack
- **HTTP Library**: `requests` (sufficient - no JavaScript rendering needed)
- **HTML Parser**: `BeautifulSoup4`
- **No Selenium required**: Content is server-rendered

### Implementation Strategy

1. **Listing Page Processing**:
   ```python
   # Fetch listing page
   response = requests.get("https://www.animal-rescue-bosnia.org/our-dogs/")
   soup = BeautifulSoup(response.content, 'html.parser')
   
   # Find section headers to identify Bosnia vs Germany
   headings = soup.find_all(['h1', 'h2', 'h3'])
   
   # Track current section and process dogs accordingly
   ```

2. **Detail Page Processing**:
   ```python
   # Extract dog name from h1
   name = soup.find('h1').get_text().strip()
   
   # Extract hero image
   hero_img = soup.find('img')['src']
   
   # Extract structured data from text content
   text_content = soup.get_text()
   breed = extract_field(text_content, "Breed:")
   gender = extract_field(text_content, "Gender:")
   ```

### Rate Limiting
- **Current config**: 2.5 second delay between requests
- **Recommended**: Maintain current rate limiting to respect server resources

## Data Mapping

### Required Fields Mapping
- **name**: Extract from h1 tag
- **external_id**: Generate from dog name (lowercase, spaces to hyphens)
- **adoption_url**: Detail page URL
- **primary_image_url**: Hero image URL
- **breed**: Extract from "Breed:" field
- **sex**: Map "Male" → "M", "Female" → "F"
- **age_text**: Parse from "Date of birth:" field
- **properties**: Store raw structured data

### Sample Data Structure
```python
{
    "name": "Ksenon",
    "external_id": "ksenon",
    "adoption_url": "https://www.animal-rescue-bosnia.org/ksenon/",
    "primary_image_url": "https://www.animal-rescue-bosnia.org/wp-content/uploads/2025/06/Ksenon-2.jpg",
    "breed": "Mix",
    "sex": "M",
    "age_text": "3 years",
    "properties": {
        "raw_breed": "Mix",
        "raw_gender": "Male",
        "date_of_birth": "January 2022",
        "height_cm": 56,
        "weight_kg": 25,
        "shelter_entry": "May 2025"
    }
}
```

## Potential Challenges

### 1. Section Identification
- **Challenge**: Distinguishing Germany vs Bosnia dogs
- **Solution**: Parse headings sequentially and track current section

### 2. Data Field Extraction
- **Challenge**: Plain text format for structured data
- **Solution**: Use regex patterns to extract field values

### 3. Image URL Consistency
- **Challenge**: Multiple images per dog
- **Solution**: Use first significant image as hero image

### 4. Date Parsing
- **Challenge**: Various date formats ("January 2022", "May 2025")
- **Solution**: Implement flexible date parsing

## Verification Against Screenshots

### Screenshot 1 (Detail Page - Ksenon)
- ✅ Shows hero image at top
- ✅ Shows "Short description" section with structured data
- ✅ Shows image gallery below
- ✅ Confirms data field patterns

### Screenshot 2 (Listing Page - Top)
- ✅ Shows "We are already in Germany" section with 3 dogs
- ✅ Shows structured data for each dog
- ✅ Shows "I AM INTERESTED" buttons (CTA links)

### Screenshot 3 (Listing Page - Bottom)
- ✅ Shows "Our Dogs waiting for you in Bosnia" section
- ✅ Shows multiple dogs with consistent data structure
- ✅ Shows "More info" links for each dog

## Next Steps

1. **Implement scraper class** inheriting from `BaseScraper`
2. **Create extraction methods** for listing and detail pages
3. **Add data normalization** for age, breed, and other fields
4. **Implement filtering logic** to exclude Germany dogs
5. **Add error handling** for missing data fields
6. **Create comprehensive tests** using the patterns identified

## Configuration Notes

Current `animalrescuebosnia.yaml` config is appropriate:
- **Rate limit**: 2.5 seconds (conservative)
- **Timeout**: 240 seconds (adequate for large pages)
- **Max retries**: 3 (reasonable for network issues)

No configuration changes needed for the scraping approach.