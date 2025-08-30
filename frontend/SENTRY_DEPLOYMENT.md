# Sentry Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Rescue Dog Aggregator with comprehensive Sentry monitoring to production environments (Vercel for frontend, Railway for PostgreSQL backend).

## Current Implementation Status ✅

### Completed Features
- ✅ **Environment-based configuration** - Automatic environment detection and appropriate sampling rates
- ✅ **Comprehensive breadcrumb tracking** - All user journeys tracked with detailed context
- ✅ **Security & PII protection** - Sensitive data scrubbing and header redaction
- ✅ **Performance monitoring** - Page load metrics and trace sampling
- ✅ **Session replay** - User session recording for debugging (with privacy controls)
- ✅ **Test pages** - `/dev/breadcrumb-test` and `/dev/sentry-test` for verification
- ✅ **Release tracking** - Automatic version tracking using git commit SHA
- ✅ **Tunnel configuration** - Bypass ad-blockers with `/monitoring` route

### Breadcrumb Coverage
All critical user journeys are tracked:
- Page loads (home, catalog, dog detail, organization, favorites, about)
- Dog interactions (view, card click, image gallery, favorite toggle)
- Search & filters (queries, filter changes, sort changes)
- Navigation (header, footer, pagination, external links)
- Special features (compare dogs, share content, empty states)
- Performance metrics (page load times, data fetch times)

## Environment Variables Required

### For Vercel (Frontend)

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required - Your Sentry DSN (get from Sentry project settings)
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN@o4509932462800896.ingest.de.sentry.io/4509932479250512

# Required - For source map uploads (get from Sentry → Settings → Auth Tokens)
SENTRY_AUTH_TOKEN=sntrys_YOUR_AUTH_TOKEN

# Required - Your Sentry organization slug
SENTRY_ORG=sampo-cr

# Required - Your Sentry project name
SENTRY_PROJECT=javascript-nextjs

# Optional - Custom release name (Vercel provides VERCEL_GIT_COMMIT_SHA automatically)
# SENTRY_RELEASE=v1.0.0

# These are automatically provided by Vercel:
# VERCEL_ENV (production, preview, development)
# VERCEL_GIT_COMMIT_SHA (used for release tracking)
# VERCEL_REGION (deployment region)
```

### For Railway (Backend - if needed)

Currently, the backend doesn't require Sentry configuration as it's a simple FastAPI server. If you want to add Python Sentry support later:

```bash
# Optional - Add Python Sentry SDK to requirements.txt
sentry-sdk[fastapi]==1.40.0

# Then add these environment variables in Railway:
SENTRY_DSN=https://YOUR_BACKEND_DSN@o4509932462800896.ingest.de.sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
```

## Pre-Deployment Checklist

### 1. Local Testing ✅
- [ ] Run `npm run build` in frontend directory - builds successfully
- [ ] Test `/dev/sentry-test` page locally - breadcrumbs display correctly
- [ ] Simulate user journey and throw test error - appears in Sentry dashboard
- [ ] Verify environment shows "development" locally

### 2. Sentry Project Setup ✅
- [ ] Create or verify Sentry project exists at sentry.io
- [ ] Note your DSN from Project Settings → Client Keys (DSN)
- [ ] Create Auth Token: Settings → Auth Tokens → Create New Token
  - Scopes needed: `project:releases`, `org:read`, `project:write`
- [ ] Verify project is in correct region (DE for European data residency)

### 3. Environment Variables ✅
- [ ] Have NEXT_PUBLIC_SENTRY_DSN ready
- [ ] Have SENTRY_AUTH_TOKEN ready
- [ ] Know your SENTRY_ORG slug
- [ ] Know your SENTRY_PROJECT name

## Deployment Steps

### Step 1: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable for Production environment:
   ```
   NEXT_PUBLIC_SENTRY_DSN = [your DSN]
   SENTRY_AUTH_TOKEN = [your auth token]
   SENTRY_ORG = sampo-cr
   SENTRY_PROJECT = javascript-nextjs
   ```
5. Ensure "Production" checkbox is selected for each

### Step 2: Deploy to Vercel

```bash
# From frontend directory
cd frontend

# Ensure you're on main branch with latest changes
git checkout main
git pull

# Deploy to production
vercel --prod

# Or push to main branch if you have automatic deployments
git push origin main
```

### Step 3: Verify Deployment

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Check "Building" logs for:
     ```
     ✓ Created release [commit SHA]
     ✓ Uploaded source maps
     ```

2. **Test Production Monitoring**
   - Visit your production site
   - Navigate through several pages to generate breadcrumbs
   - In browser console, run:
     ```javascript
     throw new Error("Production test error - please ignore")
     ```
   
3. **Verify in Sentry Dashboard**
   - Go to [Sentry Dashboard](https://sampo-cr.sentry.io)
   - Check Issues → Should see your test error
   - Click on the error → Verify breadcrumb trail shows user journey
   - Check release is tagged with git commit SHA

### Step 4: Configure Production Alerts (Optional)

In Sentry Dashboard:
1. Go to Alerts → Create Alert Rule
2. Suggested alerts:
   - **High Error Rate**: When error rate > 1% of sessions
   - **Performance**: When P95 transaction duration > 3 seconds
   - **Crash Free Rate**: When crash free rate < 99%
   - **New Issue**: When a new issue is created

### Step 5: Hide Test Pages in Production

The test pages (`/dev/sentry-test` and `/dev/breadcrumb-test`) automatically show "Development Only" message in production. No action needed.

## Post-Deployment Verification

### Immediate Checks (5 minutes)
- [ ] Production site loads without errors
- [ ] Check browser console - no Sentry initialization errors
- [ ] Perform a user journey (search, view dog, add favorite)
- [ ] Verify in Sentry that environment shows "production"

### First Hour Checks
- [ ] Monitor Sentry dashboard for any unexpected errors
- [ ] Check Performance tab for transaction data
- [ ] Verify Session Replay is capturing sessions (if enabled)
- [ ] Confirm release tracking shows correct git SHA

### First Day Checks
- [ ] Review error grouping - ensure similar errors are grouped
- [ ] Check data scrubbing - no PII in error details
- [ ] Verify sampling rates - not too high (check quota usage)
- [ ] Review breadcrumb quality - are they helpful for debugging?

## Environment-Specific Behavior

### Development (localhost)
- 100% error sampling
- 100% trace sampling
- 100% session replay
- Debug mode enabled
- Test pages accessible
- Verbose breadcrumbs

### Production (Vercel)
- 10% trace sampling (adjustable)
- 10% session replay sampling
- 100% error sampling
- Debug mode disabled
- Test pages show "Development Only"
- Filtered breadcrumbs (no debug level)
- PII scrubbing active

## Troubleshooting

### Issue: No errors appearing in Sentry
**Solution:**
1. Check browser console for Sentry initialization errors
2. Verify NEXT_PUBLIC_SENTRY_DSN is set in Vercel
3. Check Network tab for requests to ingest.sentry.io
4. Try tunnel endpoint: check for requests to /monitoring

### Issue: Source maps not working
**Solution:**
1. Verify SENTRY_AUTH_TOKEN is set correctly
2. Check build logs for source map upload confirmation
3. Ensure release name matches between config and Sentry

### Issue: High quota usage
**Solution:**
1. Reduce sampling rates in `sentry.client.config.ts`:
   ```typescript
   tracesSampleRate: isProduction ? 0.05 : 1.0,  // 5% in prod
   replaysSessionSampleRate: isProduction ? 0.01 : 1.0,  // 1% in prod
   ```
2. Redeploy with updated configuration

### Issue: Missing breadcrumbs
**Solution:**
1. Check that breadcrumb functions are imported and called
2. Verify breadcrumbs aren't filtered out by beforeBreadcrumb
3. Test with a fresh error after generating breadcrumbs

## Monitoring Best Practices

1. **Regular Reviews**
   - Weekly: Review new issues and error trends
   - Monthly: Analyze performance metrics and user journeys
   - Quarterly: Adjust sampling rates based on quota usage

2. **Issue Management**
   - Resolve false positives quickly
   - Archive issues from old releases
   - Set up ignore rules for known third-party errors

3. **Performance Optimization**
   - Monitor Web Vitals (LCP, FID, CLS)
   - Track slow transactions
   - Identify and fix N+1 queries

## Rollback Procedure

If Sentry causes issues in production:

1. **Quick Disable** (without redeploy):
   - Remove NEXT_PUBLIC_SENTRY_DSN from Vercel environment variables
   - Trigger redeploy from Vercel dashboard

2. **Full Removal** (with code changes):
   ```bash
   git revert [commit with Sentry changes]
   git push origin main
   ```

## Support & Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Railway Documentation](https://docs.railway.app/)
- Project Repository: [GitHub](https://github.com/yourusername/rescue-dog-aggregator)

## Contact

For issues or questions about this deployment:
- Check Sentry status: https://status.sentry.io/
- Sentry support: https://sentry.io/support/
- Project maintainer: [your contact]

---

Last updated: December 2024
Next review: January 2025