# Sentry Setup - CRITICAL FIXES NEEDED

## 🔴 IMMEDIATE ACTION REQUIRED

### 1. Create Backend Project in Sentry
You currently only have `javascript-nextjs` project. You need:

1. Go to https://sampo-cr.sentry.io (or https://de.sentry.io)
2. Create new project:
   - Platform: **Python**
   - Framework: **FastAPI**
   - Name: `python-fastapi` or `backend-api`
3. Get the DSN from the project settings
4. Add to Railway environment variables:
   ```
   SENTRY_DSN_BACKEND=https://<key>@o<org>.ingest.de.sentry.io/<project_id>
   ```

### 2. Verify DSN is Correct
The DSN format should be:
```
https://<public_key>@o<organization_id>.ingest.de.sentry.io/<project_id>
```

Make sure:
- It's using `de.sentry.io` (your region)
- The project ID matches the new backend project
- The organization ID is correct

### 3. Test in Production
After deploying with the new DSN:
1. The backend will now verify Sentry on startup
2. If Sentry isn't working, it will log CRITICAL errors but continue running
3. To enable test messages on startup, set: `SENTRY_DEBUG=true`

### 4. Trigger Test Errors
Once deployed, test error capture:
```bash
# This should create an error in Sentry:
curl https://api.rescuedogs.me/api/dogs/available-countries -H "X-Force-Error: true"
```

## What Was Fixed

### ✅ Error Capture Added Everywhere
- `handle_database_error()` now captures to Sentry
- `handle_validation_error()` now captures to Sentry
- `handle_llm_error()` now captures to Sentry
- All errors include rich context (tags, extra data)

### ✅ Startup Verification
- Backend verifies Sentry is initialized
- Sends test message on startup
- CRASHES if Sentry fails (so you know immediately)

### ✅ Comprehensive Error Context
Every error now includes:
- Error type tag
- Operation context
- Full stack trace
- Custom metadata

## Environment Variables Needed

```bash
# Railway Production
SENTRY_DSN_BACKEND=https://...@o....ingest.de.sentry.io/...
ENVIRONMENT=production
SENTRY_RELEASE=<git_commit_hash>  # Optional but recommended
SERVER_NAME=railway-api  # Optional but helpful

# Vercel Frontend (already working)
NEXT_PUBLIC_SENTRY_DSN=<frontend_dsn>
```

## Monitoring Dashboard

Once setup, you'll see:
- Real-time error tracking
- Performance monitoring (we have 100% sampling)
- Slow query detection (>3s queries)
- User impact metrics
- Error trends and patterns

## Testing Checklist

- [ ] Backend project created in Sentry
- [ ] SENTRY_DSN_BACKEND added to Railway
- [ ] Deploy and check startup message
- [ ] Trigger test error and verify in Sentry
- [ ] Check performance transactions are visible
- [ ] Verify slow queries are tracked