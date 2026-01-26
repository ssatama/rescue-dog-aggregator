# Analytics Self-Exclusion

Exclude your own traffic from Vercel Analytics to keep metrics accurate.

## Quick Setup

Run this once in your browser console on rescuedogs.me:

```javascript
localStorage.setItem('va-disable', 'true');
```

## How It Works

The `Analytics` component checks for `va-disable` in localStorage before sending events:

```jsx
function handleBeforeSend(event) {
  if (typeof window !== "undefined" && localStorage.getItem("va-disable")) {
    return null;  // Blocks the event
  }
  return event;
}
```

When `va-disable` is set, the `beforeSend` callback returns `null`, which tells Vercel Analytics to discard the event.

## Commands

| Action | Command |
|--------|---------|
| Disable analytics | `localStorage.setItem('va-disable', 'true')` |
| Re-enable analytics | `localStorage.removeItem('va-disable')` |
| Check status | `localStorage.getItem('va-disable')` |

## Notes

- Works per-browser (set on each device you use)
- Persists until manually removed
- Affects only Vercel Analytics, not Speed Insights
- No IP filtering needed - Vercel Analytics doesn't store IPs
