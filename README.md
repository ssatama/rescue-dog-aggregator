# Rescue Dog Aggregator

An open-source web platform that aggregates rescue dogs from multiple organizations, starting with "Pets in Turkey" from Izmir and expanding to other rescue organizations worldwide. The platform standardizes information, supports multiple languages, and presents it in a user-friendly interface that links back to the original rescue organizations.

## Project Overview

This project aims to:
- Create a single, well-designed destination for people to find rescue dogs
- Enhance the discovery experience by providing a unified, user-friendly interface for multiple rescue organizations
- Help more dogs find homes by increasing their visibility
- Support rescue organizations by directing qualified adopters to them
- Bridge language barriers with multilingual support to connect dogs with potential adopters worldwide
- Standardize varied data formats into a consistent, searchable structure
- Provide rich filtering options that may not be available on the original rescue sites
- Track adoption metrics to measure impact and improve the platform over time
- Build an open-source solution that allows the community to add support for more rescue organizations

## Current Status

⚠️ **Work In Progress** ⚠️

This project is in the early development stage. The foundation is set up, but many features are still being implemented.

## Project Structure

- `scrapers/`: Web scraping modules for different rescue organizations
  - `base_scraper.py`: Abstract base class for all organization-specific scrapers
  - `pets_in_turkey/`: Specific scraper for Pets in Turkey organization
- `database/`: Database schema and operations
  - `schema.sql`: Flexible database schema with multilingual support
  - `db_setup.py`: Initial database setup script
  - `db_update.py`: Script for updating existing database with schema changes
- `api/`: Backend API for frontend consumption (coming soon)
- `frontend/`: React frontend (to be added later)
- `notebooks/`: Jupyter notebooks for exploration and testing
- `data/`: Local data storage
- `config.py`: Configuration settings with environment variable support

## Features

- **Flexible Database Schema**: Supports varied data fields from different organizations
- **Multilingual Support**: Automatically detects and stores the original language of listings
- **Extensible Scraper Architecture**: Makes it easy to add support for new rescue organizations
- **Environment-based Configuration**: Secure credential management for database connections

## Usage

### Setting Up the Database

```bash
python main.py --setup

## Getting Started

*Coming soon*

## Roadmap

- ✅ Flexible database schema with multilingual support
- ✅ Base scraper architecture
- 🔄 Organization-specific scraper for Pets in Turkey (in progress)
- 🔄 Data collection and storage (in progress)
- ⏳ API development
- ⏳ Frontend development
- ⏳ Deployment and hosting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.