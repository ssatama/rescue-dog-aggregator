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
2. **Data Storage Layer**: PostgreSQL database with a flexible schema and standardization support (using `animals` table for future extensibility, currently dogs only)
3. **API Layer**: Backend services to expose the data with filtering capabilities
4. **Presentation Layer**: React frontend for users to browse and search

## Data Flow

1. **Data Collection**: Scrapers collect data from rescue organization websites with session tracking
2. **Data Processing**: Data is cleaned, standardized, and stored in the database
   - Breed standardization is applied
   - Age text is parsed into standardized month ranges
   - Size descriptions are mapped to standard categories
   - Language detection and automatic tagging
3. **Availability Management**: Production-ready lifecycle tracking
   - Session-based stale data detection across scraping cycles
   - Automatic confidence scoring (high → medium → low → unavailable)
   - Partial failure detection prevents false positives
4. **Quality Assessment**: Automatic data quality scoring (0-1 scale) based on field completeness
5. **API Exposure**: RESTful endpoints with smart default filtering
   - Only reliable animals (available + high/medium confidence) shown by default
   - Override parameters available for comprehensive views
6. **Frontend Display**: User-friendly interface focused on adoptable animals
7. **Adoption Flow**: Users click through to original rescue sites for adoption

## Standardization Process

A key feature of this platform is data standardization:

1. **Breed Standardization**
   - Maps various breed descriptions to consistent names
   - Groups breeds into categories (Sporting, Hound, Working, etc.)
   - Handles mixed breeds consistently

2. **Age Standardization**
   - Converts text descriptions ("2 years old", "6 months", etc.) to month ranges
   - Categorizes into Puppy (<12 months), Young (1-3 years), Adult (3-8 years), Senior (8+ years)

3. **Size Standardization**
   - Normalizes size descriptions to consistent categories:
     - Tiny, Small, Medium, Large, Extra Large

4. **Multilingual Support**
   - Detects original content language
   - Preserves original text while adding standardized fields

## Image Processing and CDN

The system now includes comprehensive image processing via Cloudinary:

1. **Automated Image Upload**: Scrapers automatically upload images to Cloudinary during data collection
2. **Intelligent Transformations**: 
   - Thumbnail generation with smart cropping (`c_fill` with `g_auto`)
   - Detail page optimization (`c_fit` for full image display)
   - Automatic format optimization (`f_auto`) and quality adjustment (`q_auto`)
3. **Fallback Handling**: Original URLs preserved for error recovery
4. **Performance**: Optimized loading with progressive enhancement

## Production Readiness

### Weekly Scraping Architecture

The system is designed for production deployment with weekly scraping schedules:

- **Stale Data Detection**: Animals are tracked across scraping sessions with automatic lifecycle management
- **Availability Confidence Levels**: 
  - `high`: Recently seen in scrape (0 missed scrapes)
  - `medium`: 1 missed scrape  
  - `low`: 2-3 missed scrapes
  - `unavailable`: 4+ missed scrapes
- **Error Recovery**: Partial failure detection prevents false positives when scrapers encounter issues
- **User Experience**: API defaults ensure users only see reliable, recently-seen animals

### Enhanced Monitoring & Metrics

Production-ready monitoring with comprehensive tracking:

- **JSONB Metrics**: Detailed scrape statistics stored as structured data
- **Quality Scoring**: Automatic assessment of data completeness (0-1 scale)
- **Performance Tracking**: Duration monitoring and optimization insights
- **Failure Detection**: Smart algorithms distinguish between website changes and scraper issues

### Critical Test Coverage

Beyond standard unit tests, the system includes critical production-readiness testing:

- **Security Testing**: SQL injection prevention, input validation, sensitive data exposure checks
- **Resilience Testing**: Database failures, network timeouts, malformed data handling
- **Integration Testing**: End-to-end Cloudinary upload, complete data workflows  
- **Data Consistency Testing**: Standardization reliability, edge cases, idempotency
- **Availability Management Testing**: Stale data detection, confidence scoring, error handling
- **Test-Driven Development**: All production features implemented with comprehensive test coverage

### Error Handling

Comprehensive error handling ensures graceful degradation:
- Image upload failures fall back to original URLs
- Database connection issues are logged and retried
- API errors return consistent error responses
- Frontend displays user-friendly error messages with retry options
- Scraper failures don't affect existing animal availability status
- Partial failure detection prevents false unavailable status

### Performance Optimization

- Cloudinary CDN for global image delivery
- Database query optimization with proper indexing
- Frontend lazy loading and progressive enhancement
- API response caching and pagination
- Smart default filtering reduces unnecessary data transfer
- JSONB metrics storage for efficient monitoring queries