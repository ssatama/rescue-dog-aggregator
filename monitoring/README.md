# Data Quality Monitor

A comprehensive tool for monitoring and analyzing data quality across rescue dog organizations in the Rescue Dog Aggregator platform.

## Purpose

This system provides two main use cases:
1. **Development Support**: Monitor data quality when implementing new scrapers or debugging existing ones
2. **Ongoing Analysis**: Regular assessment of organization data quality for gap identification and improvement prioritization

## Architecture

```
monitoring/
├── quality/
│   ├── metrics.py       # Core quality scoring algorithms
│   ├── analyzer.py      # Database analysis and data processing
│   └── reporter.py      # Markdown report generation
├── data_quality_monitor.py  # Main CLI interface
└── README.md           # This file
```

## Quality Scoring System

The system uses a weighted scoring algorithm based on frontend and SEO requirements:

- **Completeness (40%)**: Essential fields needed for basic functionality
  - Name (20 points): Required for display
  - Breed (5 points): Required for filtering
  - Age data (10 points): Age text OR numeric age ranges
  - Sex (2.5 points): Required for filtering
  - Size (2.5 points): Required for filtering

- **Standardization (30%)**: Normalized data for consistent filtering
  - Standardized breed (20 points): For accurate breed filtering
  - Standardized size (10 points): For consistent size filtering

- **Rich Content (20%)**: SEO and user engagement
  - Description (20 points): Minimum 50 characters for SEO value

- **Visual Appeal (10%)**: User engagement
  - Primary image URL (10 points): Required for listings

## Usage

### Basic Commands

```bash
# Activate the Python virtual environment
source venv/bin/activate

# Overall analysis for all organizations
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=overall --all

# Detailed analysis for specific organization  
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=26

# Help and options
PYTHONPATH=. python monitoring/data_quality_monitor.py --help
```

### Command Options

- `--mode`: Analysis mode (`overall` or `detailed`)
- `--org-id`: Specific organization ID for analysis
- `--all`: Analyze all organizations (used with overall mode)

### Example Workflows

**New Scraper Development:**
```bash
# Test data quality for new organization after initial scraping
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=<new-org-id>

# Compare with reference organization (Santer Paws Bulgarian Rescue)
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=26
```

**Regular Quality Assessment:**
```bash
# Monthly quality check for all organizations
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=overall --all
```

## Report Structure

### Overall Summary Reports
Generated in: `reports/data-quality/YYYY-MM-DD/HH-MM-SS/overall-summary.md`

Contains:
- Executive summary with key metrics
- Organization ranking by quality score
- Common issues analysis across all organizations
- Improvement recommendations

### Detailed Organization Reports
Generated in: `reports/data-quality/YYYY-MM-DD/HH-MM-SS/detailed-analysis/org-<id>-<name>.md`

Contains:
- Organization-specific quality breakdown
- Individual animal quality scores
- Specific improvement recommendations
- Examples of high-quality animals to use as templates

## Quality Benchmarks

### Reference Organization
**Santer Paws Bulgarian Rescue (ID: 26)** serves as the quality benchmark:
- Overall score: ~98.3%
- Complete standardized data
- Rich descriptions for SEO
- High-quality images
- Excellent data consistency

### Quality Tiers
- **Excellent (90%+)**: Ready for production, minimal improvements needed
- **Good (70-89%)**: Functional but needs enhancement for optimal user experience
- **Needs Improvement (<70%)**: Critical gaps affecting user experience and SEO

## Integration with Development Workflow

### For New Scrapers
1. Implement basic scraper following existing patterns
2. Run detailed quality analysis: `--mode=detailed --org-id=<new-org>`
3. Compare against benchmark (org 26) and identify gaps
4. Iterate on scraper implementation to improve quality scores
5. Target 90%+ quality score before production deployment

### For Ongoing Monitoring
1. Run monthly overall analysis: `--mode=overall --all`
2. Identify organizations with declining quality scores
3. Prioritize improvements based on animal count and quality impact
4. Use detailed analysis for specific improvement plans

### Testing Integration
All quality metrics are thoroughly unit tested:
```bash
# Run data quality tests
PYTHONPATH=. pytest tests/monitoring/test_data_quality_metrics.py -v
```

## Technical Details

### Database Integration
- Uses direct PostgreSQL connections via psycopg2
- Leverages existing `api.dependencies.get_database_connection()`
- Handles RealDictCursor for easy field access
- Proper connection management and error handling

### Performance Considerations
- Optimized SQL queries with proper JOINs
- Minimal data transfer (only required fields)
- Connection pooling via existing infrastructure
- Efficient in-memory processing of quality calculations

### Error Handling
- Graceful handling of missing organizations
- Robust JSON parsing for properties fields
- Database connection error recovery
- Comprehensive logging for debugging

## Future Enhancements

### Potential Improvements
1. **Trend Analysis**: Track quality scores over time
2. **Automated Alerts**: Email/Slack notifications for quality regressions
3. **API Integration**: REST endpoints for programmatic access
4. **Quality Forecasting**: Predict quality trends and improvement timelines
5. **Custom Scoring**: Organization-specific quality criteria

### Deployment Considerations
- Railway production database compatibility
- Environment-specific configuration
- Automated scheduling via cron jobs
- Integration with monitoring dashboards

## Troubleshooting

### Common Issues

**Import Errors:**
```bash
# Ensure PYTHONPATH is set correctly
export PYTHONPATH=.
source venv/bin/activate
```

**Database Connection Issues:**
```bash
# Check database configuration
python -c "from config import DB_CONFIG; print(DB_CONFIG)"
```

**No Animals Found:**
```bash
# Verify organization exists and has available animals
psql -d rescue_dogs -c "SELECT id, name FROM organizations WHERE id = <org-id>;"
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals WHERE organization_id = <org-id> AND status = 'available';"
```

### Support
- Check `tests/monitoring/` for usage examples
- Review generated reports for detailed diagnostics
- Examine log output for database and processing errors