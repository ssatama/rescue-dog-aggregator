# The Underdog Website DOM Analysis

## Executive Summary

The Underdog website (theunderdog.org) uses Squarespace's e-commerce platform to display rescue dogs as "products". The site renders all content server-side, making it accessible via simple HTTP requests without requiring Selenium for JavaScript execution.

## Listing Page Structure (https://www.theunderdog.org/adopt)

### Dog Card Containers
- **Primary selector**: `.ProductList-item`
- **Alternative selector**: `.hentry`
- Each dog is displayed as a product card in a grid layout
- 78 dogs found on the listing page (all loaded at once, no lazy loading needed)

### Status Badge Detection
- **Available dogs**: No status badge present
- **Adopted/Reserved dogs**: Status appears in the title text (e.g., "VIKA 🇧🇦 RESERVED")
- **Detection method**: Check if title contains "ADOPTED" or "RESERVED" keywords

### Dog Information on Listing
```css
.ProductList-item .ProductList-title  /* Dog name with flag */
.ProductList-item .ProductList-image  /* Dog thumbnail image */
.ProductList-item a[href^="/adopt/"]  /* Link to detail page */
```

### Flag Icons
- Flags are embedded as emoji characters directly in the dog name
- Examples: 🇬🇧 (UK), 🇨🇾 (Cyprus), 🇧🇦 (Bosnia), 🇫🇷 (France)
- **Country mapping needed**:
  - 🇬🇧 → United Kingdom
  - 🇨🇾 → Cyprus
  - 🇧🇦 → Bosnia and Herzegovina
  - 🇫🇷 → France
  - 🇷🇴 → Romania

### Sample HTML Structure (Listing Card)
```html
<article class="ProductList-item hentry">
  <a href="/adopt/vicky" class="ProductList-item-link">
    <div class="ProductList-image">
      <img src="..." alt="VICKY 🇬🇧">
    </div>
    <h2 class="ProductList-title">VICKY 🇬🇧</h2>
  </a>
</article>
```

## Detail Page Structure (e.g., /adopt/vicky)

### Hero Image Selector
- **Primary selector**: `.ProductItem-gallery-slides img`
- This targets the main large image at the top of the page
- Thumbnails are in `.ProductItem-gallery-thumbnails` (should be ignored)

### Dog Name and Flag
- **Selector**: `h1.ProductItem-details-title`
- Contains dog name with flag emoji (e.g., "Vicky 🇬🇧")

### Key Information Sections
- **Description container**: `.ProductItem-details-excerpt`
- Information is formatted with bold labels followed by values:
  - `**How big?**` → Size information
  - `**How old?**` → Age information
  - `**Male or female?**` → Sex information
  - `**Living with kids?**` → Kid-friendly status
  - `**Living with dogs?**` → Dog-friendly status
  - `**Living with cats?**` → Cat-friendly status
  - `**Where can I live?**` → Location/shipping information

### About Section
- Detailed description paragraph starts with "About [DogName]"
- Contains personality, behavior, and background information
- Located within the same `.ProductItem-details-excerpt` container

### Sample Detail Page Structure
```html
<div class="ProductItem">
  <section class="ProductItem-gallery">
    <div class="ProductItem-gallery-slides">
      <img src="hero-image.jpg" alt="Vicky">
    </div>
  </section>
  
  <section class="ProductItem-details">
    <h1 class="ProductItem-details-title">Vicky 🇬🇧</h1>
    <div class="ProductItem-details-excerpt">
      <p>
        <strong>How big?</strong> Large (around 30kg)<br>
        <strong>How old?</strong> Young adult (around two years)<br>
        <strong>About Vicky</strong><br>
        Vicky is currently in a foster home in North Devon...
      </p>
    </div>
  </section>
</div>
```

## JavaScript Loading Behavior

### Findings
- The site uses Squarespace's server-side rendering
- All dog data is available in the initial HTML response
- No AJAX calls needed for pagination (all dogs on one page)
- Images use standard `src` attributes (no lazy loading on detail pages)
- Product filtering is handled client-side but all data is present

### Evidence
- `requests` library successfully retrieved all 78 dogs
- Both listing and detail pages return complete data without JavaScript
- No dynamic content loading observed that affects data extraction

## Recommended Scraping Approach

### Use `requests` + BeautifulSoup (Recommended)
**Rationale:**
- All data is available in the initial HTML response
- No JavaScript execution required
- Faster and more reliable than Selenium
- Lower resource consumption
- Simpler error handling

### Implementation Strategy
1. Fetch listing page with `requests.get()`
2. Parse HTML with BeautifulSoup
3. Extract all dog cards using `.ProductList-item` selector
4. For each dog:
   - Extract name and flag from `.ProductList-title`
   - Extract detail URL from the card's link
   - Check for "ADOPTED"/"RESERVED" in title
   - Skip if not available
5. For available dogs:
   - Fetch detail page
   - Extract hero image, description, and attributes
   - Parse structured data fields

### Key Considerations
- **Rate limiting**: Implement delays between requests (2.5s as per config)
- **Status filtering**: Only process dogs without "ADOPTED"/"RESERVED" in title
- **Flag parsing**: Extract country from emoji and map to ISO codes
- **Data parsing**: Use regex or string parsing for structured fields like size, age

## Pagination

The website displays all dogs on a single page without pagination. The test found 78 dogs all loaded at once, matching what's visible in the screenshots. No pagination handling is required.

## Verification Against Screenshots

✅ **Listing page**: Confirmed grid layout with dog cards showing names with flags
✅ **Status badges**: "RESERVED" and "ADOPTED" appear in card titles as shown
✅ **Detail page**: Hero image at top, structured information sections below
✅ **Flag icons**: Country flags displayed as emoji characters next to names
✅ **Available dogs**: No special marking (absence of status badge indicates availability)