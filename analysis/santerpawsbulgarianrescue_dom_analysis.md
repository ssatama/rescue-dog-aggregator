# Santer Paws Bulgarian Rescue - DOM Analysis

## Website Information
- **Base URL**: https://santerpawsbulgarianrescue.com/
- **Adoption Listing URL**: https://santerpawsbulgarianrescue.com/adopt/
- **Available Dogs Filter URL**: https://santerpawsbulgarianrescue.com/adopt/?_adoption_status_adopt=available
- **Technology**: WordPress with WP Grid Builder plugin and Breakdance builder

## 1. Listing Page Structure

### Page Loading Behavior
- **Framework**: WP Grid Builder (wpgb) for listing and filtering
- **JavaScript Loading**: Heavy JavaScript usage, page loads slowly
- **Pagination**: None - all dogs load on single page
- **Lazy Loading**: No lazy loading detected in images
- **Total Available Dogs**: ~110 dogs in available status

### Data Access Methods

#### Method 1: Direct AJAX Request (RECOMMENDED)
- **Endpoint**: `https://santerpawsbulgarianrescue.com/adopt/`
- **Method**: POST
- **Data**: `{'wpgb-ajax': 'render', '_adoption_status_adopt': 'available'}`
- **Response**: Complete HTML with all available dogs
- **Advantages**: 
  - Single request gets all data
  - No need for Selenium
  - Faster and more reliable
  - Returns clean HTML structure

#### Method 2: Regular Page Load
- **URL**: `https://santerpawsbulgarianrescue.com/adopt/?_adoption_status_adopt=available`
- **Issues**: Very large page (~1MB+), slow loading
- **Not Recommended**: AJAX method is superior

### CSS Selectors for Listing Page

```css
/* Dog card container */
article.bde-loop-item.ee-post

/* Link to detail page (contains URL) */
article a[href*="/adoption/"]

/* Dog name extraction */
/* Note: Name must be extracted from URL or link text */
/* URL pattern: /adoption/[dog-name]/ */

/* Dog thumbnail image */
article img
/* Image is within nested divs with background-image style */
article .bde-div-2556-128-* /* Dynamic class with background-image */
```

### Sample HTML Structure (Dog Card)
```html
<article class="bde-loop-item ee-post">
  <div class="breakdance">
    <a class="bde-container-link-2556-127-* breakdance-link" 
       href="https://santerpawsbulgarianrescue.com/adoption/[dog-name]/">
      <div class="bde-div-2556-126-*">
        <div class="bde-div-2556-128-*" 
             style="background-image: url('[image-url]')">
        </div>
        <div class="bde-div-2556-136-*">
          <h3 class="bde-text-2556-137-*">[Dog Name]</h3>
        </div>
      </div>
    </a>
  </div>
</article>
```

## 2. Detail Page Structure

### URL Pattern
- **Format**: `https://santerpawsbulgarianrescue.com/adoption/[dog-name]/`
- **Example**: `https://santerpawsbulgarianrescue.com/adoption/pepper/`

### Page Elements and Selectors

#### Dog Name
```css
h1  /* Main heading contains dog name */
```

#### Hero Images (Carousel)
```css
/* Image carousel container */
.swiper-wrapper figure img
/* Or more generally */
figure img

/* Individual slide images */
figure[class*="swiper-slide"] img
```
- **Note**: Carousel contains multiple images (typically 8-11 images)
- **First image**: Can be used as primary image

#### About Section
```css
/* About heading */
h2:contains("About")

/* About content - paragraph(s) following the heading */
/* Use find_next_sibling() in BeautifulSoup after finding h2 */
```

#### Information Section Structure
```css
/* Information heading */
h2:contains("Information")

/* Information container follows the heading */
/* Data is in a structured grid layout */
```

##### Individual Fields
- **Date of Birth**: Text "D.O.B" followed by sibling with date
- **Sex**: Text "Sex" followed by sibling with value (Male/Female)
- **Breed**: Text "Breed" followed by sibling with value
- **Size**: Text "Size" followed by sibling with value (Small/Medium/Large)
- **Location**: Text "Location" followed by sibling with value
- **Status**: Text "Status" followed by sibling with value (Available/Reserved)

### Sample Detail Page Data Structure
```python
{
    "name": "Pepper",
    "url": "https://santerpawsbulgarianrescue.com/adoption/pepper/",
    "images": [
        # Multiple images from carousel
    ],
    "about": "He was born in the neuter centre here in Pleven...",
    "date_of_birth": "22/06/2024",
    "sex": "Male",
    "breed": "Mixed",
    "size": "Medium",
    "location": "Northamptonshire, UK",
    "status": "Available"
}
```

## 3. Recommended Scraping Approach

### Technology Choice: **requests + BeautifulSoup**
- **Selenium NOT required** - AJAX endpoint provides all data
- **Simpler and faster** than browser automation
- **More reliable** - no JavaScript timing issues

### Implementation Strategy

1. **Fetch Listing Data**:
   ```python
   response = requests.post(
       "https://santerpawsbulgarianrescue.com/adopt/",
       data={'wpgb-ajax': 'render', '_adoption_status_adopt': 'available'},
       headers={'X-Requested-With': 'XMLHttpRequest'}
   )
   ```

2. **Parse Dog Cards**:
   - Extract URL from `article a[href]`
   - Extract name from URL (last segment)
   - Extract thumbnail if needed

3. **Fetch Detail Pages**:
   - Use extracted URLs
   - Parse with BeautifulSoup
   - Extract all required fields

4. **Rate Limiting**:
   - Implement 2.5 second delay between requests (as per config)
   - Consider batch processing

## 4. Data Mapping

### Fields Available on Website → Database Fields

| Website Field | Database Field | Notes |
|--------------|---------------|-------|
| Name (from h1) | name | Direct mapping |
| URL | adoption_url | Direct mapping |
| About section | description | Full text |
| D.O.B | date_of_birth | Parse date format DD/MM/YYYY |
| Sex | sex | Male/Female |
| Breed | breed | Usually "Mixed" or specific |
| Size | size | Small/Medium/Large |
| Location | location | City, Country format |
| Status | status | Available/Reserved |
| Carousel images | images | Array of image URLs |

### Missing/Unavailable Fields
- `external_id`: Generate from URL slug
- `animal_type`: Always "dog"
- `age_years`: Calculate from date_of_birth
- `good_with_cats`: Not directly available
- `good_with_dogs`: Not directly available
- `good_with_kids`: Not directly available
- `housetrained`: Not directly available
- `spayed_neutered`: Not directly available
- `color`: Not available
- `weight_kg`: Not available

### Fields to Extract from Description
Some behavioral traits might be mentioned in the "About" text and could be parsed:
- References to other dogs → good_with_dogs
- References to cats → good_with_cats
- References to children → good_with_kids

## 5. Technical Considerations

### Performance
- Initial page load is slow (~5-10 seconds)
- AJAX endpoint is faster (~2-3 seconds)
- Images hosted on S3 (s3.fr-par.scw.cloud/santerpaws/)

### Error Handling
- Check for 200 status codes
- Handle missing fields gracefully
- Implement retry logic for failed requests

### Image Processing
- Images are high quality JPEGs
- Multiple images per dog (8-11 typically)
- Consider selecting primary image (first in carousel)

## 6. Testing Results

### AJAX Endpoint Test
- ✅ Successfully returns all 110 available dogs
- ✅ HTML response, not JSON
- ✅ Clean article structure for each dog
- ✅ No pagination required

### Detail Page Test
- ✅ All required fields accessible
- ✅ Consistent structure across different dogs
- ✅ Images in carousel format
- ✅ No JavaScript rendering required

## 7. Implementation Recommendations

1. **Use requests library** - No need for Selenium
2. **Implement AJAX fetching** for listing page
3. **Parse detail pages individually** for complete data
4. **Cache responses** during development
5. **Implement robust error handling** for network issues
6. **Use rate limiting** as configured (2.5s delay)

## Conclusion

The Santer Paws Bulgarian Rescue website is scrapeable using simple HTTP requests without requiring browser automation. The WP Grid Builder AJAX endpoint provides efficient access to all available dogs in a single request, making the scraping process straightforward and reliable.