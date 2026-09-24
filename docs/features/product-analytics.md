# Product Analytics (PostHog)

PostHog records how visitors move through the site and whether they reach the
goal: **clicking through to a rescue's adoption page**. Sentry remains the error
tracker; Vercel Analytics and Speed Insights still run alongside.

## Setup

| | |
| --- | --- |
| PostHog org / project | `rescuedogs.me` / `Default project` (id 283494), EU Cloud (Frankfurt) |
| App | https://eu.posthog.com/project/283494 |
| Ingest host | `https://e.rescuedogs.me`, a PostHog-managed reverse proxy. Cloudflare CNAME `e` → `2dade27d15ebaf2e295e.cf-prod-eu-proxy.europehog.com`, **DNS only** (grey cloud) |
| Token | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, a Vercel **Production** env var, type config. The token is public and write-only |
| Init | `frontend/src/instrumentation-client.ts` |
| Events | `frontend/src/lib/analytics.ts`, the only file that calls `posthog.capture` |

Capture runs only when the Vercel env is `production`. Previews and local runs
send nothing unless the URL has `?debug=posthog` (they also need the token set
locally). Add `__posthog_debug=true` to see the SDK's own logs.

## Privacy model

The privacy page promises no cookies and there is no consent banner, so:

- `persistence: "memory"`: no cookies, localStorage or sessionStorage. A full
  page reload mints a new anonymous ID, so unique-visitor counts run high.
  Client-side navigation keeps the same ID.
- Not `cookieless_mode: "always"`: it does not record session replays.
- The project discards client IPs (project setting).
- Replays mask form inputs (the SDK default).

If you change what is collected, update `frontend/src/app/privacy/page.tsx` and
the FAQ privacy answer to match.

## Events

Pageviews (including App Router navigations, via `defaults: "2026-08-30"`),
`$pageleave`, autocapture, dead clicks and rage clicks come from the SDK. Custom
events:

| Event | Fired from | Key properties |
| --- | --- | --- |
| `adoption_link_clicked` | **Conversion.** Adopt button on the detail page (click and middle-click), mobile modal, favorites comparison | dog props, `source`, `destination_domain` |
| `dog_viewed` | Detail page load, each dog shown in the mobile modal | dog props, `source` (`detail_page` / `modal`) |
| `dog_card_clicked` | Dog card in any list | `dog_id`, `position`, `list_context` |
| `dog_favorited` / `dog_unfavorited` | `FavoritesContext`, so it covers the heart button, modal and swipe-right | `dog_id` |
| `favorites_viewed` | /favorites, after favorites load | `favorites_count` |
| `search_performed` | Dog-name search box, on Enter or a picked suggestion: /dogs sidebar (`catalog`) and the filter drawer on /dogs and breed pages (`mobile`). The global header search (#492) will send `header` | `surface` (`header` / `catalog` / `mobile`), `result_group_chosen` (`breed` / `rescue` / `dog` / `filter` / `none`), `result_count` |
| `filter_applied` | /dogs, breed pages, org pages (desktop and mobile drawer) | `filter`, `value`, `result_count`, `surface` (`catalog` / `breed_page` / `org_page`) |
| `sort_changed` | Sort control in `DogFilters` (hidden on org pages today) | `sort` |
| `gallery_photo_viewed` | Dog detail page load, as photo 1 of 1 | `dog_id`, `index`, `total` |
| `location_set` | Not wired yet: the "I live in" picker (#493) | `source` (`geo` / `picker`), `country`, `only_adoptable` |
| `organization_viewed` | Organization page | `org_slug`, `dog_count` |
| `organization_website_clicked` | "Visit Original Website" on an org page | `org_slug`, `destination_domain` |

Search and filter events never carry free text. `search_performed` has no
query property at all: it records which kind of result was picked (`none`
means the typed text was submitted) and how many suggestions were shown.
`filter_applied` is sent only for values picked from a fixed list; text typed
into a breed box filters the page without an event. Typed search and sort are
not filters (`sort_changed` covers sort). `result_count` is null until the
catalog shows a result total (#494); older `search_submitted` and
`filter_changed` events (before 2026-09-24) carried the raw query and are
superseded.

"Dog props" are shared by `dog_viewed` and `adoption_link_clicked`, so a funnel
between them can be broken down by any of them: `dog_id`, `dog_slug`,
`dog_name`, `breed`, `age_category` (derived with `getAgeCategory`), `sex`,
`size`, `org_slug`, `org_name`, `org_country`.

Outbound clicks are sent with `send_instantly`: opening the rescue's site
backgrounds the tab, and mobile browsers can suspend it before PostHog's
3-second batch flushes. Tracking never throws into a click handler.

## Session replay

PostHog records every production session; the recorder starts once the page is
idle so it stays off the LCP path. Sentry keeps **error-only** replays
(`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`).
`posthog.sentryIntegration` tags each Sentry event with the PostHog person and
recording URL, so an issue links to the session. Exceptions are not copied into
PostHog.

## Testing locally

`next dev` fetches server data from `localhost:8000`, so use a production build
pointed at the live API:

```bash
cd frontend
NEXT_PUBLIC_VERCEL_ENV=development NEXT_PUBLIC_SENTRY_DSN= \
NEXT_PUBLIC_API_URL=https://api.rescuedogs.me \
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_... pnpm build
NEXT_PUBLIC_API_URL=https://api.rescuedogs.me pnpm start --port 3124
# open http://localhost:3124/dogs/<slug>?debug=posthog
```

Client-side listing fetches fail from localhost (CORS), but dog detail pages
render server-side. Automated browsers (Playwright, DevTools MCP) set
`navigator.webdriver`, and PostHog drops all events from them as bots; override
it in an init script when testing with one. Local events carry
`$host = localhost`. Filter them out with the project's test-account filter.

## Excluding your own traffic

See [analytics-self-exclusion.md](analytics-self-exclusion.md).
