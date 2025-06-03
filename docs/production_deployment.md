# Production Deployment Guide

## Prerequisites

### Environment Variables

**Backend:**
```bash
# Database
DB_HOST=your-postgres-host
DB_NAME=rescue_dogs_production
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Cloudinary (Required for image processing)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
TESTING=false  # Critical: Must be false in production
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

## Pre-Deployment Checklist

### 1. Run Critical Tests

```bash
# Backend critical tests
pytest tests/integration/ tests/security/ tests/resilience/ tests/data_consistency/ -v

# Frontend tests
cd frontend && npm test

# All tests must pass before deployment
```

### 2. Security Verification

```bash
# Run security-specific tests
pytest tests/security/ -v

# Verify no sensitive data in environment
echo $CLOUDINARY_API_SECRET  # Should not be visible in logs
```

### 3. Database Setup

```bash
# Create production database
createdb rescue_dogs_production

# Run schema
psql rescue_dogs_production < database/schema.sql

# Verify tables created
psql rescue_dogs_production -c "\dt"
```

### 4. Image Processing Test

```bash
# Test Cloudinary integration
python -c "
from utils.cloudinary_service import CloudinaryService
service = CloudinaryService()
print('Cloudinary configured:', service.cloudinary_service is not None)
"
```
## CORS Configuration

### Production CORS Setup

1. **Set Allowed Origins**
   ```bash
   # Only include your actual frontend domains
   ALLOWED_ORIGINS=https://rescuedogs.com,https://www.rescuedogs.com```

2. **Verify CORS Headers**

# Test from your frontend domain
 ```bash
    curl -H "Origin: https://rescuedogs.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.rescuedogs.com/api/animals```

2. **Common CORS Issues**

- Missing origin in ALLOWED_ORIGINS
- Using http:// instead of https:// in production
- Trailing slashes in origins (remove them)
- Frontend and API on different subdomains not configured

# Should return proper CORS headers

## Deployment Steps

### Backend (FastAPI)

1. **Deploy to your platform** (Heroku, AWS, DigitalOcean, etc.)
2. **Set environment variables** (see above)
3. **Verify health endpoint**: `GET /health`
4. **Test API endpoints**: `GET /api/animals?limit=5`

### Frontend (Next.js)

1. **Deploy to Vercel** (recommended) or your platform
2. **Set environment variables**
3. **Verify build**: `npm run build`
4. **Test image loading** and error handling

## Post-Deployment Verification

### 1. API Health Check

```bash
curl https://your-api-domain.com/health
# Should return: {"status": "healthy"}
```

### 2. Image Processing Test

```bash
curl "https://your-api-domain.com/api/animals?limit=1"
# Verify primary_image_url contains Cloudinary URLs
```

### 3. Frontend Functionality

- [ ] Dogs page loads with images
- [ ] Filters work correctly
- [ ] Individual dog pages display properly
- [ ] Error states show user-friendly messages
- [ ] Images load with proper fallbacks

### 4. Error Handling Test

- [ ] Invalid API requests return proper error responses
- [ ] Image load failures fall back to original URLs
- [ ] Database connection issues are handled gracefully

## Monitoring and Maintenance

### Log Monitoring

Monitor for these key events:
- Image upload failures
- Database connection errors
- API response time degradation
- Scraper execution failures

### Regular Tasks

1. **Weekly**: Review error logs and image upload success rates
2. **Monthly**: Run critical tests against production data
3. **Quarterly**: Security audit and dependency updates

## Troubleshooting

### Common Issues

**Images not loading:**
1. Check Cloudinary credentials
2. Verify CORS settings
3. Test fallback to original URLs

**API errors:**
1. Check database connection
2. Verify environment variables
3. Review application logs

**Performance issues:**
1. Monitor database query performance
2. Check Cloudinary bandwidth usage
3. Verify frontend bundle size

**CORS errors:**
1. Check ALLOWED_ORIGINS includes your frontend URL
2. Verify no trailing slashes in origin URLs
3. Ensure ENVIRONMENT is set to 'production'
4. Check browser console for specific CORS error messages
5. Verify API returns correct headers with curl test

### Emergency Procedures

**Image CDN failure:**
- Images automatically fall back to original URLs
- No action needed, system continues functioning

**Database failure:**
- API returns cached responses where possible
- Frontend displays appropriate error messages
- Restore from backup when available

**Critical security issue:**
- Run security tests: `pytest tests/security/ -v`
- Review recent deployments
- Update dependencies if needed