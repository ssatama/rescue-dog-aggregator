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

This project is in active development with basic functionality now working.

### Completed Features:
- Backend API with FastAPI
- Database setup with PostgreSQL
- Web scraper for "Pets in Turkey" organization
- Frontend UI with Next.js and Tailwind CSS including:
  - Home page with introduction
  - Dogs catalog with filtering UI
  - Detailed dog view pages
  - Organizations listing
  - About page with mission statement
  
### In Progress:
- Connecting frontend to backend API
- Additional scraper support for more organizations
- Filter functionality implementation
- Mobile optimization

## Project Structure

- `scrapers/`: Web scraping modules for different rescue organizations
  - `base_scraper.py`: Abstract base class for all organization-specific scrapers
  - `pets_in_turkey/`: Specific scraper for Pets in Turkey organization
- `database/`: Database schema and operations
  - `schema.sql`: Flexible database schema with multilingual support
  - `db_setup.py`: Initial database setup script
  - `db_update.py`: Script for updating existing database with schema changes
- `api/`: Backend API for frontend consumption
  - `routes/`: API endpoints
  - `models/`: Data schemas
  - `dependencies.py`: Shared dependencies (DB connection, etc.)
- `frontend/`: Next.js frontend application
  - `src/app/`: Page components
  - `src/components/`: Reusable UI components
  - `src/utils/`: Utility functions

## Getting Started

### Backend Setup

1. Set up your database credentials in a `.env` file (see `.env.sample`)
2. Set up the database: `python main.py --setup`
3. Run the Pets in Turkey scraper: `python main.py --pit`
4. Start the API server: `python run_api.py`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Visit http://localhost:3000 in your browser

## Technology Stack

- **Backend**: Python, FastAPI, PostgreSQL
- **Frontend**: Next.js, React, Tailwind CSS
- **Data Collection**: Web scraping with BeautifulSoup, Selenium
- **Deployment**: (Coming soon)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.