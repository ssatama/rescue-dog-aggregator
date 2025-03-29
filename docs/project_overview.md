# Rescue Dog Aggregator - Project Overview

## Purpose and Goals

The Rescue Dog Aggregator is an open-source web platform designed to:

1. Aggregate rescue dogs from multiple organizations worldwide
2. Standardize the information in a consistent format
3. Present it in a user-friendly interface that enhances discovery
4. Support multiple languages to bridge barriers
5. Link back to original rescue organizations for adoption

The project aims to increase visibility for rescue dogs and help them find homes faster, while supporting the original rescue organizations by directing qualified adopters to them.

## System Architecture

The system consists of four main components:

1. **Data Collection Layer**: Web scrapers to gather dog listings from various sources
2. **Data Storage Layer**: PostgreSQL database with a flexible schema
3. **API Layer**: Backend services to expose the data
4. **Presentation Layer**: React frontend for users to browse and search

## Data Flow

1. Scrapers collect data from rescue organization websites
2. Data is cleaned, standardized, and stored in the database
3. API endpoints expose the data to the frontend
4. Frontend presents the data in a user-friendly interface
5. Users can click through to the original rescue sites for adoption

## Scraping Strategy

The project uses a modular scraping architecture with:

1. A base scraper class (`BaseScraper`) that handles common functionality
2. Organization-specific scrapers that extend the base class
3. Each scraper is responsible for:
   - Navigating to the organization's website
   - Extracting dog listings
   - Standardizing the data
   - Handling language detection
   - Saving to the database

## Code Patterns and Conventions

- All scrapers inherit from the `BaseScraper` abstract base class
- Organization-specific scrapers implement the `collect_data` method
- Python naming conventions: snake_case for variables and functions
- Clear error handling and logging
- Database operations are encapsulated
- Configuration via environment variables