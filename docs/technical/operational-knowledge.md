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

**A failed cron run usually means one org failed.** The batch reports
`overall_success: false` if *any* org fails; read `failed_orgs`. The commit
shown next to a run is just what was deployed, not the cause. Check
neighbouring runs (green neighbours mean a transient stall) and curl the
rescue's site before blaming code. Scrapers must separate failure altitude: a
*listing* failure must raise (an empty listing fires a false zero-dogs alert,
#215/#216), a *detail page* failure skips that dog. `navigate_with_retry`
returns `False` instead of raising, so check its return.

**Playwright branches are easy to leave untested.** Scrapers import
Playwright only under `if USE_PLAYWRIGHT:` (read at import time) and tests
default to Selenium. Patch with `patch("...scraper.PlaywrightOptions",
create=True)` to cover the code production runs.

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

## Data

**Rows never self-correct on scrape.** `skip_existing_animals` drops existing
dogs before `save_animal`, and updates are never re-profiled. A scraper fix
needs an explicit backfill: re-scrape with `--force-rescrape`, then
`generate-profiles --force`. Query the full population, not just
`status = 'available'`, when sizing a defect.

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

**REAN ids are `rean-{page}-{name}`** since #435 (the shared GoDaddy page has
no per-dog id); 39 rows were re-keyed on 2026-09-23. Any future id-scheme
change needs the same re-key before the next cron. REAN ages come from the
heading first because GoDaddy leaks a neighbour's sentence into a block.

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
railway run --service thriving-appreciation -- env RAILWAY_DATABASE_URL="$RAILWAY_DATABASE_URL" \
  uv run python management/name_commands.py clean-names --apply
railway run --service thriving-appreciation -- env RAILWAY_DATABASE_URL="$RAILWAY_DATABASE_URL" \
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
    env DATABASE_URL="$RAILWAY_DATABASE_URL" \
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
