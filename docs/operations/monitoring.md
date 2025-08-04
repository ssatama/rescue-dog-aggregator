# System Monitoring & Operations

This document describes the built-in monitoring capabilities of the Rescue Dog Aggregator platform, including health checks, scraper monitoring, performance metrics, and failure detection.

## Monitoring Overview

The platform includes comprehensive monitoring functionality implemented directly in the FastAPI backend with modern architecture patterns. All monitoring data is stored in the PostgreSQL database and accessed through dedicated API endpoints.

### Current Platform Scale
- **Organizations**: 8 active rescue organizations across multiple countries
- **Backend Tests**: 99+ test files with speed-optimized markers (unit/fast/slow)
- **Frontend Tests**: 384+ test files ensuring UI reliability
- **Architecture**: Modern BaseScraper with service injection and dependency patterns

## Architecture

The monitoring system is database-driven and consists of:

- **Health Check Endpoints**: Basic system health and database connectivity with isolation verification
- **Scraper Monitoring**: Performance tracking and failure detection for 8 rescue organizations  
- **Performance Metrics**: System and scraper performance analysis with quality scoring
- **Alert System**: Failure detection and notification configuration
- **Modern Architecture Monitoring**: Service injection patterns, availability confidence tracking
- **Database Isolation Monitoring**: Test protection and production data safety

## Health Check Endpoint

### `/health` - System Health Check

The main health check endpoint tests database connectivity and returns overall system status.

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T12:00:00",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "response_time_ms": 45.2
  }
}
```

**Status Determination:**
- `healthy`: Database responds in <1000ms
- `degraded`: Database responds in >1000ms  
- `unhealthy`: Database connection fails

**Usage**: Load balancer health checks, monitoring systems

## Scraper Monitoring

The core monitoring functionality focuses on tracking rescue organization scrapers through the `scrape_logs` database table.

### `/monitoring/scrapers` - All Scrapers Status

Returns comprehensive status for all registered organizations.

**Query Parameters:**
- `organization_id`: Filter by specific organization
- `status_filter`: Filter by status (success, warning, error, never_run)
- `time_range_hours`: Analysis window (default: 24 hours)

**Response Format:**
```json
{
  "scrapers": [
    {
      "organization_id": 1,
      "organization_name": "Big Paws Rescue",
      "last_scrape": "2024-01-01T12:00:00",
      "status": "success",
      "animals_found": 45,
      "failure_detection": {
        "last_failure_type": null,
        "consecutive_failures": 0,
        "threshold_info": {
          "absolute_minimum": 3,
          "percentage_threshold": 0.5
        }
      },
      "performance_metrics": {
        "scrapes_24h": 2,
        "success_rate": 100.0,
        "avg_animals_found": 43.5,
        "avg_duration_seconds": 45.2,
        "avg_data_quality": 0.95
      }
    }
  ],
  "summary": {
    "total_organizations": 8,
    "last_24h_scrapes": 16,
    "failure_rate": 6.3,
    "active_scrapers": 8,
    "healthy_scrapers": 7,
    "unhealthy_scrapers": 1
  }
}
```

### `/monitoring/scrapers/{organization_id}` - Individual Scraper Details

Provides detailed analysis for a specific organization including:
- Recent scrape history (last 10 runs)
- 30-day performance metrics  
- Failure pattern analysis

**Performance Metrics:**
- Total scrapes in 30 days
- Success rate percentage
- Average animals found per scrape
- Average scrape duration
- Average data quality score
- Min/max animals found ranges

## Failure Detection & Analysis

### `/monitoring/failures` - Failure Metrics

Analyzes failure patterns and provides categorized failure counts.

**Failure Categories:**
- **Catastrophic Failures**: Complete scraper breakdown
- **Partial Failures**: Reduced data extraction
- **Database Errors**: Database connectivity or query issues
- **Other Failures**: Miscellaneous errors

**Response Format:**
```json
{
  "failure_summary": {
    "catastrophic_failures_24h": 2,
    "partial_failures_24h": 1,
    "database_errors_24h": 0,
    "total_scrapes_24h": 14,
    "failure_rate": 21.4
  },
  "recent_failures": [
    {
      "timestamp": "2024-01-01T11:30:00",
      "organization_name": "Example Rescue",
      "status": "error",
      "animals_found": null,
      "failure_type": "catastrophic",
      "error_message": "Connection timeout",
      "threshold_info": {
        "default_absolute_minimum": 3,
        "default_percentage_threshold": 0.5
      }
    }
  ],
  "thresholds": {
    "default_absolute_minimum": 3,
    "default_percentage_threshold": 0.5,
    "minimum_historical_scrapes": 3,
    "alert_after_consecutive_failures": 2
  }
}
```

### Failure Detection Logic

The system categorizes failures based on error message content:
- **Catastrophic**: Contains "catastrophic failure"
- **Partial**: Contains "partial failure"  
- **Database**: Contains "database" or "connection"
- **Other**: All other error types

## Performance Monitoring

### `/monitoring/performance` - System Performance

Provides system-wide performance metrics and resource utilization.

**Response Format:**
```json
{
  "scraper_performance": {
    "average_duration_seconds": 42.5,
    "average_data_quality_score": 0.92,
    "success_rate": 85.7,
    "total_animals_7d": 1250,
    "avg_animals_per_scrape": 38.5,
    "animals_per_hour": 7.4
  },
  "system_performance": {
    "database_connection_pool": {
      "active": 3,
      "idle": 12,
      "idle in transaction": 0
    },
    "active_scrapers": 0,
    "memory_usage": null,
    "disk_usage": null
  }
}
```

**Metrics Timeframes:**
- Scraper performance: Last 7 days
- Database connections: Current state
- Active scrapers: Last 2 hours (approximate)

## Alert Management

### `/monitoring/alerts/config` - Alert Configuration

Returns current alerting thresholds and notification settings.

**Response Format:**
```json
{
  "failure_thresholds": {
    "catastrophic_absolute_minimum": 3,
    "partial_failure_percentage": 0.5,
    "minimum_historical_scrapes": 3,
    "alert_after_consecutive_failures": 2,
    "database_timeout_seconds": 30
  },
  "notification_settings": {
    "email_enabled": false,
    "slack_enabled": false,
    "webhook_enabled": false,
    "alert_frequency_minutes": 60
  },
  "monitoring_intervals": {
    "health_check_seconds": 30,
    "scraper_status_minutes": 5,
    "performance_metrics_minutes": 15
  }
}
```

### `/monitoring/alerts/active` - Active Alerts

Returns currently active alerts requiring attention.

**Alert Types:**
- **Consecutive Failures**: Organization with 2+ consecutive failures
- **No Recent Scrapes**: Organization not scraped in 48+ hours

**Alert Severity:**
- `critical`: 3+ consecutive failures
- `warning`: 2 consecutive failures or stale scrapes
- `info`: Informational notifications

**Response Format:**
```json
{
  "active_alerts": [
    {
      "id": "consecutive_failures_1",
      "severity": "critical",
      "type": "consecutive_failures",
      "organization_id": 1,
      "organization_name": "Example Rescue",
      "message": "Example Rescue has 3 consecutive failures",
      "last_occurrence": "2024-01-01T12:00:00",
      "metadata": {
        "failure_count": 3
      }
    }
  ],
  "alert_summary": {
    "critical": 1,
    "warning": 2,
    "info": 0
  },
  "total_alerts": 3
}
```

## Data Storage & Analysis

### Database Tables

All monitoring data is stored in PostgreSQL tables:

**`scrape_logs` Table:**
- `organization_id`: Links to organizations table
- `started_at`, `completed_at`: Scrape timing with session tracking
- `status`: success, warning, error, running
- `dogs_found`, `dogs_added`, `dogs_updated`: Data metrics
- `error_message`: Failure details
- `duration_seconds`: Performance timing
- `data_quality_score`: Quality assessment (0-1)
- `detailed_metrics`: JSONB field for modern architecture data (service injection, failure detection)

**`animals` Table:**
- Modern availability confidence tracking (`availability_confidence`, `consecutive_scrapes_missing`)
- Session management (`last_session_start`, `last_seen_at`)
- Enhanced data fields for quality scoring

**`organizations` Table:**
- Basic organization metadata (8 organizations)
- Enhanced metadata fields for modern configuration
- Used for joining with scrape_logs and animals

### Query Patterns

The monitoring endpoints use standard SQL queries with PostgreSQL-specific features:

- **Window functions** for failure pattern analysis and availability confidence tracking
- **FILTER clauses** for conditional aggregation
- **Date/time arithmetic** for time-based filtering and session management
- **JSONB operations** for detailed metrics analysis and modern architecture data
- **Availability confidence queries** for dynamic status management
- **Service injection monitoring** through detailed_metrics JSONB field

## Usage Examples

### Monitoring Scraper Health

```bash
# Check all scrapers status
curl http://localhost:8000/monitoring/scrapers

# Check specific organization
curl http://localhost:8000/monitoring/scrapers/1

# Filter by status
curl "http://localhost:8000/monitoring/scrapers?status_filter=error"

# Custom time range
curl "http://localhost:8000/monitoring/scrapers?time_range_hours=168"
```

### Checking System Health

```bash
# Basic health check
curl http://localhost:8000/health

# Performance metrics
curl http://localhost:8000/monitoring/performance

# Active alerts
curl http://localhost:8000/monitoring/alerts/active
```

### Failure Analysis

```bash
# Recent failures
curl http://localhost:8000/monitoring/failures

# Alert configuration
curl http://localhost:8000/monitoring/alerts/config
```

## Implementation Notes

The monitoring system is implemented in `api/routes/monitoring.py` and provides:

- **Real-time status** based on current database state with availability confidence
- **Historical analysis** using time-based queries and session tracking
- **Failure categorization** through error message parsing and quality scoring
- **Performance tracking** via aggregation queries with modern metrics
- **Alert generation** using configurable thresholds and service health
- **Modern Architecture Monitoring**: Service injection patterns, database isolation verification
- **Quality Score Tracking**: Data quality assessment and trending analysis

All endpoints return JSON responses with consistent error handling and detailed metadata for operational visibility. The system supports 8 active organizations with 99+ backend tests and 384+ frontend tests for comprehensive monitoring coverage.