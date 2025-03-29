# config.py

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'rescue_dogs',
    'user': 'postgres',
    'password': 'password'  
}

# Scraper configuration
SCRAPER_CONFIG = {
    'pets_in_turkey': {
        'base_url': 'https://www.petsinturkey.org',
        'dogs_url': 'https://www.petsinturkey.org/dogs',
        'scrape_interval_hours': 24,  # Scrape once per day
    }
}