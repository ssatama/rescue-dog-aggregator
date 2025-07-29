# Woof Project Scraper

Scraper for https://woofproject.eu - A non-profit organization dedicated to rescuing and rehoming dogs.

## Technical Details

- **Website Type**: WordPress-based
- **Listings URL**: https://woofproject.eu/adoption/
- **Pagination**: Simple numbered pages (Page 1, 2, 3, 4)
- **Status Filtering**: Must exclude dogs with ADOPTED/RESERVED status
- **Data Extraction**: Name, URL, breed, age, size, description, single primary image

## Implementation Notes

1. **Status Detection**: ADOPTED/RESERVED dogs have H2 headings above the dog name
2. **Image Handling**: Extract only one primary image per dog
3. **Data Fields**: Let BaseScraper handle normalization of all fields
4. **Rate Limiting**: 3.0 seconds between requests (configured in YAML)