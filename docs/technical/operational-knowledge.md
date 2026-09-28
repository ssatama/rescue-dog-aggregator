# Operational knowledge

Hard-won facts about production that aren't obvious from the code. Each entry
says what is true, why it matters, and what to do. Dates are when it was
verified; re-check anything old before acting on it. Add to this file (in a
PR) whenever you learn something the next session would otherwise rediscover.

## Railway

**Services** in project `jubilant-serenity`: `rescue-dog-aggregator` (API),
`thriving-appreciation` (**the scraper cron**, not the API), `Postgres`,
`Browserless`, `rescuedogs-mcp`. Cron-specific variables go on
`thriving-appreciation`.

**Cron schedule** is Mon/Thu/Sat 15:00 UTC (dashboard, 2026-07-15). Neither
the CLI nor the Railway MCP exposes `cronSchedule`; only the dashboard's Cron
Runs tab does. Repo docs once claimed "Tue/Thu/Sat 6am" and caused a false
"missed run" alarm, so never infer the schedule from docs or log timestamps.

**The API's DB pool retries a dropped new connection** (#624). A handshake
the server drops ("server closed the connection unexpectedly") on
`postgres.railway.internal` shows up a few times a week without a Postgres
restart (PYTHON-FASTAPI-2N/3K/3M, 2026-09). `api/database/connection_pool.py`
retries it against the stale-connection budget (3), connects with
`connect_timeout` 5s (`DB_POOL_CONNECT_TIMEOUT`, because `getconn` holds the
pool lock while connecting), and answers 503 if it never connects. The
scraper pool (`services/connection_pool.py`) has neither yet.

**A failed cron run usually means one org failed.** The batch reports
`overall_success: false` if *any* org fails; read `failed_orgs`. The commit
shown next to a run is just what was deployed, not the cause. Check
neighbouring runs (green neighbours mean a transient stall) and curl the
rescue's site before blaming code. Scrapers must separate failure altitude: a
*listing* failure must raise (an empty listing fires a false zero-dogs alert,
#215/#216), a *detail page* failure skips that dog. `navigate_with_retry`
returns `False` instead of raising, so check its return. Raise
`ListingIncompleteError` for a listing page that fails or lists no dogs when
the pagination says it exists, and fetch plain-HTTP listings with
`BaseScraper.get_listing_page`, which retries (#559).

**Playwright is the only browser path** (Selenium removed in #566). Tests
patch the scraper module's `get_playwright_service` with
`tests/fixtures/playwright_fakes.py` and serve saved HTML; nothing reads
`USE_PLAYWRIGHT` any more, so the Railway variable can go.

**Cron import quirk (#211/#212, reverted in #213).** New modules under
`services/` once failed with `ModuleNotFoundError` in the cron container even
though the file was on disk; the API imported them fine. `indexnow_client`
(#470) later imported without trouble, so it may be gone. Still import new
cron-side modules lazily behind `except ImportError`, and verify with a real
Run Now, not CI.

**Browserless session drops.** Dogs Trust (up to 47 SPA pages) hit
`TargetClosedError` in ~10% of runs; #259 retries the whole pagination from a
fresh browser. Retry from scratch, never salvage partial pages: partial
results let stale detection mark unseen dogs as gone. The deeper lever is a
session `timeout` param in `playwright_browser_service._build_ws_url`.

**Sequence desync after syncs.** `services/railway/sync.py` inserts explicit
ids, which doesn't advance pkey sequences. Unreset, the next insert collides
(`duplicate key ... _pkey`); on 2026-07-02 this killed every `scrape_logs`
insert and looked like a build failure. Every synced table now gets its
sequence reset; the manual remedy is
`SELECT setval('<table>_id_seq', (SELECT MAX(id) FROM <table>));`.

**Config as Code stops working 2026-12-01.** Railway stops reading
`railway.json` / `railway.api.json`, and services fall back to dashboard
values. The API's dashboard start command is `python api/main.py`, which
imports and exits, so **production goes down** unless the start command is
changed to `bash start.sh` first. Also lost: `healthcheckPath`,
`overlapSeconds`, `watchPatterns` (the deploy-race fix below). The IaC
migration was blocked on 2026-08-25: `railway config pull` emits invalid JS
and `railway config migrate` drops the healthcheck. Re-check the importer
before trying again.

**The dashboard drifts from the config files.** Config files override the
dashboard and Railway never writes back, so every service has a hidden second
set of values. #366 assumed `restartPolicyType: ON_FAILURE` was the default;
the cron's dashboard said `NEVER`, and the change flipped it (fixed in #367).
Read the live value with `railway config pull` before adding any key to
`railway*.json`. `railway.json` is shared with the cron, which serves no HTTP,
so a `healthcheckPath` there hangs cron deploys; the API has its own
`railway.api.json`.

**Migrations are manual.** `start.sh` never runs Alembic, whatever
`docs/guides/deployment.md` suggests. Apply a migration to production
**before** merging code that needs it, or the next cron fails on every
animal. From a laptop:

```bash
export RAILWAY_DATABASE_URL="$(grep -E '^RAILWAY_DATABASE_URL=' .env | cut -d= -f2- | tr -d "\"'")"
uv run alembic -c migrations/railway/alembic.ini upgrade head
```

`alembic.ini` holds a placeholder URL, so a missing variable fails loudly.

**Manual production runs from the laptop** (verified 2026-09-26). Run them
from a fresh worktree of `origin/main`, never a feature branch, with the
cron's environment. Keep clear of the cron: not in the hour before
Mon/Thu/Sat 15:00 UTC (a manual run has no timeout), and not while an
execution is still going, since the batch runs the orgs one after another
and can last well past 15:00. Check the Cron Runs tab, and that no log is
open:

```sql
SELECT o.config_id, sl.started_at::text FROM scrape_logs sl
JOIN organizations o ON o.id = sl.organization_id WHERE sl.status = 'running';
```

Then, from the main checkout (the subshell keeps the production URL out of
your shell, and `set -e` stops at the first failure, e.g. a leftover
worktree):

```bash
(
  set -e
  url="$(grep -E '^RAILWAY_DATABASE_URL=' .env | cut -d= -f2- | tr -d "\"'")"
  test -n "$url"
  git fetch origin
  git worktree add ../rda-prod-run origin/main
  trap 'git worktree remove --force ../rda-prod-run' EXIT
  cd ../rda-prod-run
  railway run -p 947b70e4-076f-4288-833a-ed1b1409a01d -e production -s thriving-appreciation -- \
    env DATABASE_URL="$url" TZ=UTC \
    uv run python management/railway_scraper_cron.py --org <config_id>
)
```

- `TZ=UTC` is required, here and in any laptop command that writes
  timestamps. The code writes naive `datetime.now()`, so a laptop run stores
  local time: its `scrape_logs` rows and `last_seen_at` land hours off the
  cron's, which can skip stale detection on either run.
- `DATABASE_URL` is overridden because the service's own points at
  `postgres.railway.internal`, which the laptop can't reach.
- A single `--org` run has no timeout (the #581 limit applies only to the
  batch). Ctrl-C and plain `kill` (SIGINT/SIGTERM) only set a shutdown flag
  that it never checks, and Ctrl-C can kill the subshell, whose trap then
  deletes the worktree under the still-running scraper. Don't Ctrl-C: stop a
  stuck run with `pkill -9 -f railway_scraper_cron`, then close its row
  (below).
- `railway run` brings the cron's `ENVIRONMENT=production` and Sentry DSN, so
  a laptop run's errors show up in Sentry as cron errors. Don't override
  `ENVIRONMENT`: the LLM config accepts only its known values.

**A hung cron run.** The CLI can't stop one cron execution. The tested way is
`railway redeploy -p 947b70e4-076f-4288-833a-ed1b1409a01d -e production -s
thriving-appreciation` (not `railway up`, which deploys your checkout): it
ends the running execution without starting a new one, and the next run
comes at the next scheduled time. The GraphQL API has `deploymentStop(id)`
(via `railway api`), not yet tried on a cron execution. Either way, and after
a `kill -9` of a laptop run, nothing closes the in-flight org's log. Close it
by hand, for that org only, with `psql "$RAILWAY_DATABASE_URL"` (the
`postgres` MCP is read-only):

```sql
UPDATE scrape_logs SET status = 'error', completed_at = now() AT TIME ZONE 'UTC',
  error_message = 'Run stopped by hand'
WHERE status = 'running'
  AND organization_id = (SELECT id FROM organizations WHERE config_id = '<config_id>');
```

Since #581 a single hung scraper times out instead of blocking the batch, so
this should be rare.

**What closes a `scrape_logs` row** (#557, 2026-09-26). A run completes once,
with its metrics; a partial failure or a failed session start is a
`warning` with a note in `error_message`. An exception or a
`KeyboardInterrupt`/`SystemExit` closes the row as `error` from the `finally`
in `BaseScraper._run_with_connection`, which also writes a failed completion
once more as it was; the cron closes a timed-out org's row after its SIGKILL. Still open: a
Railway stop or redeploy mid-run (the cron's SIGTERM handler only sets a
flag) and a `kill -9` leave the in-flight row `running`; close it as above.
On 2026-09-26 38 such rows (oldest 2025-07-30) were closed as `error` with
"closed by the #557 cleanup". Check for new ones with
`SELECT count(*) FROM scrape_logs WHERE status = 'running' AND started_at < now() - interval '1 day'`.

## Deploys and caching (Vercel)

**Vercel and Railway deploy on the same push to main.** A prerender failing
with "HTTP 502" usually means the API container was mid-swap, not a broken
dog or commit; check `railway deployment list --service
rescue-dog-aggregator` first. Fixed in #366 (fetch retry in
`frontend/src/utils/serverFetch.ts`, API healthcheck, `overlapSeconds`). The
retry budget must stay under `staticPageGenerationTimeout`.

**ISR caches failed renders.** A page that renders markup after a failed
fetch is cached as a success for the whole revalidate window (the dog page
served 84KB data-less shells for 48h, fixed in #344). In ISR routes a failed
or empty essential fetch must throw or `notFound()`. Spot this class by
comparing page sizes across live URLs.

**`serverAnimalsService` swallows errors.** Its `cache(fn, fallback)` turns
any error, including a 422, into `[]` or zero stats, so a section silently
renders empty and ISR caches it. When a server-rendered section is empty,
read the API log for 4xx first. Never export non-component values from
`"use client"` files for server use (#497); put them in `constants/`.

**ISR write fan-out.** Every dog fetch is tagged `["animal", slug]`, so
purging bare `"animal"` invalidates all detail pages. ISR writes ≈ reads is
the signature. Lengthening `revalidate` can't help against a purge (#205
tried); scope purges to changed slugs (#315).

**`revalidateTag` is stale-while-revalidate** (`"max"`), and the Vercel data
cache survives deploys. After a production data write: purge, request the
page, wait, purge again, then verify with `curl` + `grep`. Purges need
`REVALIDATION_TOKEN`, which lives only on `thriving-appreciation` (use
`railway run --service thriving-appreciation`).

**`STATIC_PARAMS_LIMIT = 500`** on `/dogs/[slug]` is tuned: prerendering all
dogs broke builds (#149, reverted by #196), and below 500 on-demand ISR costs
2.4s TTFB. `docs/SEO_ROADMAP.md` Epic 9 is stale on this.

**Soft 404s (#441).** Dynamic routes return 200 + `noindex` for unknown slugs,
because the root `app/loading.tsx` streams before `notFound()` runs. Verify
any 404 change with `curl -o /dev/null -w "%{http_code}"` on the deployed URL.

**R2 limits** writes to 1/s *per object key*; there's no bucket-wide limit, so
galleries upload in parallel (5 workers). `get_existing_external_ids` only
skips dogs that have a gallery, so galleries backfill through the normal cron.

**Installable app, no service worker.** The site installs from
`app/manifest.ts` (Chrome/Edge through their own dialog, iOS and Safari on
Mac through the steps in `components/pwa/InstallInstructions.tsx`). None of
these need a service worker, and the last one served stale API data as "No
dogs available" (#159); the root layout still unregisters it for returning
visitors. Don't add one back for install. On iOS a Home Screen app has its own
storage, so favorites saved in Safari don't appear in the app; the steps say
so. The nudge card's thresholds are in `lib/installNudge.ts`.

## Data

**Rows never self-correct on scrape.** `skip_existing_animals` drops existing
dogs before `save_animal`, and updates are never re-profiled. A scraper fix
needs an explicit backfill. Query the full population, not just
`status = 'available'`, when sizing a defect.

**Backfills go through `management/backfill_commands.py`** (#556).
- `plan --org X` re-scrapes the rescue's live site with skipping off, saves
  nothing, and diffs what `update_animal` would write
  (`services.database_service.update_columns`) against production, read-only:
  per-field counts with examples, dogs new on the site, dogs available in
  production but gone from the site, and dogs whose profile text would change.
  Images are compared by source URL, since a dry run uploads nothing. Reads use
  `PROD_RO_DATABASE_URL` on the laptop and `POST /api/admin/query` in cloud
  sessions. Building the scraper touches no database (#569).
- SQL fixes are registered steps in `management/backfill_steps.py`: a
  read-only query plus a pure planner, planned from fresh rows at apply time,
  so they are idempotent. `clear-fabricated-ages` (formerly `age_commands.py`)
  is the first; it plans 0 rows since it ran.
- `apply --orgs a,b --steps x --confirm` writes to `RAILWAY_DATABASE_URL`: it
  runs `railway_scraper_cron.py --org X --force-rescrape` per rescue, then the
  steps for every rescue, then `generate-profiles --ids` for dogs whose profile text changed,
  and prints a before/after table. Record that table here in the PR that ran it.
- `apply` runs the scrapers from the local checkout: run it from an
  up-to-date `main`, and don't switch branches until it exits.
- Epic #554 ran every backfill once, in #572 (below).

**The #572 backfill (2026-09-27, 12:5x-14:5x UTC, about 2 h).** All 11
rescues re-scraped with `--force-rescrape`, then all seven steps, then
re-profiling, from `main` at `ec47b9ab` with the cron service's env:

| rescue | available before → after | profile inputs changed |
| --- | --- | ---: |
| dogstrust | 479 → 426 | 260 |
| animalrescuebosnia | 68 → 68 | 0 |
| daisyfamilyrescue | 44 → 44 | 0 |
| misisrescue | 155 → 155 | 155 |
| pets-in-turkey | 33 → 33 | 33 |
| manytearsrescue | 105 → 89 | 37 |
| theunderdog | 32 → 31 | 32 |
| tierschutzverein-europa | 392 → 376 | 0 |
| santerpawsbulgarianrescue | 75 → 75 | 0 |
| rean | 11 → 11 | 0 |
| woof-project | 14 → 15 | 73 |

Steps: clear-fabricated-ages 0, restore-breed-raw 420, derive-birth-dates 329,
pets-in-turkey-listing-url 139, disabled-org-status-unknown 199,
one-description-key 1044, unknown-to-null 1298 rows. Re-profiling: 590 ids
queued, 487 profiled (487/487; the rest inactive or at Pets in Turkey, which
has no LLM profiles), 17 first attempts too short and fixed on retry, no
`TruncatedLLMResponseError`. Cost ≈ $4.15 (487 × $0.0085).
- "Before → after" counts drop for dogs no longer listed: they fade through
  `availability_confidence` as usual (Dogs Trust lists 363-391 a run).
- Child-issue checks after the run: Dogs Trust `breed_raw = standardized_breed`
  479 → 198 (#560); dogs listed over 6 months with `age_max_months <= 12`
  are real by their birth dates (5 Tierschutzverein, 1 Santer Paws; #561);
  MISIs nav-bullet dogs 0, stories over 200 chars 149, no age 7 (#562);
  Tierschutzverein German ages 3, all on dogs the site no longer lists and
  so not re-scraped, `size = 'Medium'` 75 → 204 (sizes now from shoulder
  height), 369 of 376 with a story (the other 7 have none on the site; #563);
  0 active dogs with a story only under an old key (#568).
- Pets in Turkey has no `description` on purpose: its "Ready to fly /
  Currently in" line is where the dog is, not a story (#564).
- Found after the run: `/breeds/with-images` grouped 52 dogs with no breed
  under a NULL `primary_breed` (a missing breed is NULL since #568), and the
  /breeds page's schema rejected the response (JAVASCRIPT-NEXTJS-88). Fixed
  in #572; every other breed grouping already skipped NULL.

**Breed registry is data.** Breeds and aliases live in
`utils/breed_registry.yaml`. `primary_breed` is the grouping key and omits the
cross (it's the `/breeds/[slug]` key); `standardized_breed` is the display
label and keeps it. `formatBreed` must show `standardized_breed`.
`breed_type` is only `purebred | crossbreed | mixed | unknown`. Breed changes
recompute on the next scrape, so no backfill; run `breed_commands.py
reconcile` against production text before trusting a resolver change.

**Dogs Trust quirks.**
- `_extract_description` uses `h2.find_next("p")`, which walks past the
  section: 385 of 512 dogs got "Everything you need to know about <breed>"
  (2026-08-20), which then poisons their AI profile. Fixing it needs a
  re-profile, not just a re-scrape.
- `properties.good_with_dogs` / `good_with_cats` are `true` for nearly every
  dog (#516). `companionAnswer` in `frontend/src/utils/dogFacts.ts` must read
  the AI profile first until #516 is fixed.

**Woof Project lists available dogs first, then the adoption archive**
(pages 2-5 on 2026-09-27). Since #565 the listing is plain HTML: an adopted or
reserved dog has a status heading above its name, in any case and sometimes in
Dutch ("GEADOPTEERD"), and the next page is read only while a page lists an
available dog (so page 2, which has none, is the last read). The archive has
badge-less old dogs (Billy on page 3), so reading every page would bring them
back. Some dog pages have a bare post id as their slug (`/adoption/9270/` is
Amlet), so `wp-9270` is a real id; if the rescue gives the post a name slug,
the dog is re-created under it and the old row goes stale.

**Many Tears' `dogs_found` swings with churn, not lost pages.** On 2026-09-26
the listing was 7 pages of 12 (79 dogs, that day's count), and pages 1 and 7
both linked every page, so no sliding window hides pages.

**REAN ids are `rean-{page}-{name}`** since #435 (the shared GoDaddy page has
no per-dog id); 39 rows were re-keyed on 2026-09-23. Any future id-scheme
change needs the same re-key before the next cron. REAN ages come from the
heading first because GoDaddy leaks a neighbour's sentence into a block.

**Pets in Turkey ids are `pit-{wix media id}`** of the card photo since #564.
The Wix repeater slots are reused for new dogs, so their ids are not per dog.
Re-keyed with `management/pets_in_turkey_rekey.py`. A photo swap for the same
dog re-creates it.

**Santer Paws and Animal Rescue Bosnia ids are WordPress post ids** since
#570: `spbr-{post id}` and `arb-{page id}`. Names and slugs change and repeat;
post ids don't. Listing pages show only links, so each run asks the site's
REST API for the listed slugs (`/wp-json/wp/v2/dog`, `/wp-json/wp/v2/pages`,
50 slugs a request). A listed link the answer lacks (a renamed page WordPress
redirects) is resolved from its page's `<body class>` (`postid-N`,
`page-id-N`); only a page that 404s is skipped, with a warning and no failure
count. Bosnia's listing links to a few such dead pages (Lexis, Avelina on
2026-09-27). A failed REST request fails the listing (ListingIncompleteError).
Rows were re-keyed with `management/wordpress_rekey.py` (path first, then a
unique slug, since Santer Paws moved its pages from `/adoption/` to `/dog/`),
which also rewrites `adoption_url`: updates never refresh it.

**daisyfamilyrescue `age_text`** once held gender text and future dates.
`age_backfill.py` deliberately doesn't clear these, and a test pins that, so
the scraper bug stays visible. Scraper and parser fixed in #433.

**Name and location backfills (#505).** Most rescues skip dogs they already
have, so name cleaning and `display_location` reach stored rows only through
a backfill. Both are dry runs unless given `--apply`, cover active dogs only,
and merge just the keys they set into `properties`. Both ran on production on
2026-09-26 (930 of 1,411 available dogs got a `display_location`). Rerun
after a cleaner change, outside the cron window (Mon/Thu/Sat 3pm UTC):
```bash
export $(grep -E '^RAILWAY_DATABASE_URL=' .env | xargs)
railway run --service thriving-appreciation -- env RAILWAY_DATABASE_URL="$RAILWAY_DATABASE_URL" TZ=UTC \
  uv run python management/name_commands.py clean-names --apply
railway run --service thriving-appreciation -- env RAILWAY_DATABASE_URL="$RAILWAY_DATABASE_URL" TZ=UTC \
  uv run python management/location_commands.py display-locations --apply
```
Known gaps: Pets in Turkey writes "Currently in Amsterdam" in free text
(not parsed), and Tierschutzverein's "bald in Leipzig" (soon in Leipzig)
shows as "Leipzig" with "(ab 12.9.26)" dates dropped.

**Quality scores.** Profiles before #320 carry a hardcoded `quality_score` of
80. `llm_commands backfill-quality-scores` rescores them without LLM calls,
but moves ~1.3% of dogs below `MIN_SWIPE_QUALITY_SCORE = 70`, out of the
swipe stack. That's a product decision: confirm before running it. It had not
been run as of 2026-08-19.

## LLM profiling

Model and cost details are in AGENTS.md. Operational points:

- Run backfills **per organization** (the Railway proxy drops a long-lived
  connection) with `--confidence all` (the default `high` silently skips
  others):
  ```bash
  export $(grep -E '^RAILWAY_DATABASE_URL=' .env | xargs)
  railway run --service thriving-appreciation -- \
    env DATABASE_URL="$RAILWAY_DATABASE_URL" TZ=UTC \
    uv run python management/llm_commands.py generate-profiles \
      --organization <ID> --confidence all --batch-size 5
  ```
  `railway run` supplies `REVALIDATION_TOKEN` for the ISR purge; the
  `DATABASE_URL` override is needed because the service's own value is
  Railway-internal.
- `generate-profiles --ids 12,34` re-profiles named dogs (implies `--force`
  and `--confidence all`). It still selects only available dogs at
  LLM-enabled rescues, and prints any id it skipped.
- Not profilable by design: org 2 (not in `configs/llm_organizations.yaml`)
  and Furry Rescue Italy (`enabled: false`); the command prints `Total: 0/0`
  without saying why.
- About 8% of first attempts get an upstream 429 that OpenRouter returns as
  HTTP 200 with `finish_reason: "error"`, now raised as `UpstreamLLMError`
  (#434).
- If OpenRouter spend alerts fire, check the pinned model first. A full
  re-profile of all dogs is a real cost; normal runs only profile new dogs.

## Frontend tests

- **Never `delete window.location`** or redefine it: jsdom 26 makes it
  non-configurable and the whole test file dies. Let the component assign
  `href` (jsdom logs "Not implemented: navigation"), or use
  `history.pushState`.
- **A "cancelled" Frontend Tests job at the timeout ceiling** is a per-test
  timeout stampede, not flaky infra: nwsapi 2.2.25-2.2.27 hangs Radix Select
  tests. `nwsapi` is pinned to 2.2.24 in pnpm overrides until a fixed release
  ships (dperini/nwsapi#214).
- **`next dev` side effects.** `agentRules: false` in `next.config.js` stops
  it generating `frontend/AGENTS.md` / `CLAUDE.md`; never commit them if they
  reappear. `pnpm dev` pins `NODE_ENV=development` because any other value
  makes it add `.next/dev/dev/types` to `tsconfig.json`. Stage files by name,
  never `git add -A`, after running it.

## Tools and accounts

- **Sentry**: org `sampo-cr` on the EU region (`https://de.sentry.io`; pass
  `regionUrl` explicitly). This repo's projects are `python-fastapi` and
  `javascript-nextjs`; the other two projects belong to unrelated apps.
- **PostHog**: EU, project 283494. Event reference in
  `docs/features/product-analytics.md`; funnel comparison with
  `scripts/posthog-funnel.sh`, which needs `POSTHOG_PERSONAL_API_KEY` on the
  laptop (cloud sessions get it from the proxy). Without it, use the PostHog
  MCP after switching to org rescuedogs.me, project 283494. It sees far fewer
  people than "20+ daily users" (4-7 a day in late September 2026), so read
  funnels as anecdote until traffic grows.
- **chrome-devtools MCP**: under touch emulation, `click` doesn't open the
  mobile filter drawer; a JS `.click()` does. The drawer works.
- **Checking layouts**: `node scripts/visual-check.cjs <paths>` screenshots
  390/820/1180/1440px in light and dark and reports overflow and console
  errors. `BASE_URL=https://www.rescuedogs.me` audits production. Vercel
  previews are behind a login, so to check a branch against real data, build
  with `NEXT_PUBLIC_API_URL` pointing at a local proxy to api.rescuedogs.me
  that adds CORS headers (the API allows only localhost:3000), and serve it
  on 127.0.0.1 and a free port. Off Vercel, `/_vercel/insights` 404s show as
  console errors; ignore them.
- **Postgres MCP is production.** Its findings are production facts; say so
  when reporting. It runs as the read-only `claude_ro` role: directly via
  `PROD_RO_DATABASE_URL` on the laptop, via `POST /api/admin/query` in cloud
  sessions (see `scripts/sql/create_claude_ro.sql`). A read-only *session* is
  not a guard (a query can switch it back to read-write); the role's grants
  are, and the endpoint refuses any role that could write.
