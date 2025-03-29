# Scraper Design

## Scraper Architecture

The Rescue Dog Aggregator uses a modular scraper architecture to collect data from different rescue organizations.

### Base Scraper Class

The `BaseScraper` is an abstract base class that provides common functionality:

- Database connection
- Scrape logging
- Language detection
- Data saving
- Error handling

### Organization-Specific Scrapers

Each rescue organization has its own scraper that extends the `BaseScraper`:

- Implements the `collect_data` method to extract data from the specific website
- Handles the specific HTML structure and navigation of that organization's website
- Extracts and standardizes the dog data

## Data Collection Flow

1. The scraper navigates to the organization's website
2. It extracts the list of available dogs
3. For each dog, it collects:
   - Name
   - Breed
   - Age
   - Sex
   - Size
   - Status
   - Images
   - Adoption URL
4. The data is saved to the database
5. Scrape logs are maintained for tracking and debugging

## Adding a New Scraper

To add a new rescue organization:

1. Create a new directory under `scrapers/`
2. Create a new scraper class that extends `BaseScraper`
3. Implement the `collect_data` method
4. Add the organization to the database
5. Add the scraper to the main runner

## Handling Different Website Structures

Each organization's website is unique, so the scrapers use various techniques:

- HTML parsing with BeautifulSoup
- JavaScript execution with Selenium
- Regular expressions for text extraction
- Flexible matching for inconsistent data