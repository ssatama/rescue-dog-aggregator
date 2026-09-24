# Analytics Self-Exclusion

Exclude your own traffic from analytics to keep metrics accurate. Vercel
Analytics and PostHog each have their own switch; set both on every device you
use.

## PostHog

Visit the site once with `?posthog_optout=1`, e.g.
`https://www.rescuedogs.me/?posthog_optout=1`. This stores `ph_optout=1` in
localStorage, and PostHog is not initialised on later visits from that browser.
`?posthog_optout=0` turns capture back on. See `frontend/src/lib/posthogOptOut.ts`.
The flag is only read where capture is enabled (production, or
`?debug=posthog`).

## Vercel Analytics

### Quick Setup

Run this once in your browser console on rescuedogs.me:

```javascript
localStorage.setItem('va-disable', 'true');
```

### How It Works

The `Analytics` component checks for `va-disable` in localStorage before sending events:

```jsx
import { safeStorage } from "@/utils/safeStorage";

function handleBeforeSend(event) {
  if (typeof window !== "undefined" && safeStorage.get("va-disable")) {
    return null;
  }
  return event;
}
```

When `va-disable` is set, the `beforeSend` callback returns `null`, which tells Vercel Analytics to discard the event. The `safeStorage` utility handles localStorage exceptions gracefully (e.g., Safari private browsing).

### Commands

| Action | Command |
|--------|---------|
| Disable analytics | `localStorage.setItem('va-disable', 'true')` |
| Re-enable analytics | `localStorage.removeItem('va-disable')` |
| Check status | `localStorage.getItem('va-disable')` |

### Notes

- Works per-browser (set on each device you use)
- Persists until manually removed
- Affects only Vercel Analytics, not Speed Insights
- No IP filtering needed - Vercel Analytics doesn't store IPs
- Only active in production/preview environments (not local development)
- Any non-empty value works (e.g., `'true'`, `'1'`, `'yes'`)
