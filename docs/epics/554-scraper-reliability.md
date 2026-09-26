# Epic #554: scraper reliability and data quality

Working notes for epic #554. The issue holds the plan and the order; this file
holds the settled rules and the gotchas found on the way. When the epic
closes, move what lasts into `docs/technical/scraper-architecture.md` and
`docs/technical/operational-knowledge.md`, then delete this file.

## Rules (settled; don't re-ask)

- **A listing failure raises; a detail-page failure skips one dog.** Never
  salvage partial listing pages: stale detection would hide the dogs on the
  missing pages.
- **Missing data is `None`, never a placeholder.** No "Medium", "Mixed Breed",
  "Unknown" or "UK" standing in for data the site didn't give.
- **No backfills in child PRs.** Every data fix registers its backfill step
  with the backfill tool (#556) and proves it with a dry run; all backfills
  run once, in #572.
  - Exceptions: a schema migration is applied to production *before* its PR
    merges (manual Alembic). An ID re-key (#564, #570) is applied right
    *after* merge and *before* the next cron.
- **Production is read-only from a session** (the `postgres` MCP tool).
  Production writes happen only as above, after the maintainer says go.
- **Be a polite crawler.** Never exceed a rescue's configured rate or its
  robots.txt Crawl-delay, even while testing. Save a page as a fixture
  instead of re-fetching it.
- **Playwright is the production path** (`USE_PLAYWRIGHT=true`). Tests cover
  the Playwright branch until #566 removes Selenium.
- **The disabled scrapers stay** (Galgos del Sol, Furry Rescue Italy).
- **Name and location cleaning live in the validator.** Keep
  `properties.raw_name`, `overlooked` and `display_location` working.
- **Keep `collect_data()`'s contract stable** until #568 defines it.
  Base-class changes must not require edits in the org scrapers.
- **Merging:** open the PR, `/code-review`, fix findings, all CI green, then
  squash-merge. Only low-severity findings left means merge and file them as
  follow-ups. Don't merge scraper changes in the 2 hours before a cron run
  (Mon/Thu/Sat 15:00 UTC), and never while one is running: a merge redeploys
  the cron service.

## Run counts (#555)

`scrape_logs.detailed_metrics` now says what a run lost:

| Key | Meaning |
| --- | --- |
| `animals_rejected` | dogs the validator refused |
| `rejected` | the same, by reason: `missing_field`, `invalid_name`, `no_image` |
| `save_errors` | dogs whose `save_animal` returned no id |
| `images_uploaded` / `images_reused` / `images_failed` | per dog, from the batch upload |
| `phase_timings.llm_enrichment` | seconds spent profiling new dogs |

The rejected and failed `external_id`s (up to 20) are in the run's log line
"N collected, M not saved". More than 10% not saved sends a Sentry warning
(`scraper.alert_type=dogs_not_saved`).

## Stale detection (#558)

Every dog the site listed is marked seen before stale detection
(`SessionManager.mark_found_animals_as_seen`), whether it was skipped as
existing, rejected or failed to save, and whether or not
`skip_existing_animals` is on. Every production config has skipping on, and
the old method already covered that case, so this matters for
`FORCE_RESCRAPE` runs: `backfill apply` and #572. Dogs stale detection has
retired (status `unknown`) stay so until a save succeeds, and a new dog that
fails validation is never stored.

Stale detection is skipped, with a run note that makes the run a `warning`,
when more than 20% of *found* dogs fail to save
(`SAVE_ERROR_PARTIAL_FAILURE_RATE`), when marking the found dogs fails, and
it is noted when the stale update itself fails. Found, not collected: with
skipping on only new dogs are collected, so one new dog failing every run
would be 100%. Validator rejections don't count (deviation from the issue):
they repeat for the same dog every run.

## Listings fail loudly (#559)

A listing page that can't be read raises `ListingIncompleteError`
(`scrapers/base_scraper.py`); `collect_data` lets it through, so the run is
an `error` and stale detection doesn't run. In the Playwright (production)
paths of Tierschutzverein, Many Tears, Woof, Santer Paws, MISIs, Bosnia, Pets
in Turkey, The Underdog and REAN, no listing returns the pages that did load
and none turns a failure into `[]`. Still to do: Dogs Trust (below), the
Selenium paths (deleted in #566) and the disabled Furry Rescue Italy and
Galgos del Sol.

- `BaseScraper.get_listing_page(url)` is the plain-HTTP fetch: `max_retries`
  retries with `retry_backoff_factor` backoff for timeouts, connection
  errors, 429 and 5xx; anything else (another 4xx, a malformed URL) fails
  at once. `max_retries: 3` means 4 attempts here.
- Every page the pagination says exists must list dogs. An empty *first*
  page is still left to the zero-dogs alert.
- Per site: Many Tears reads `?page=N` up to the highest numbered link (12
  a page; a full page 1 with no links raises). Santer Paws walks
  `/adopt/page/N/` until an empty 200, which must come after its highest
  `data-page`. Tierschutzverein follows "→" links. MISIs raises when a
  clicked page shows no `/post/` links or the previous page's. A listing
  that runs past its page limit raises (Tierschutzverein 50, Santer 20,
  MISIs 10).
- Per-dog failures still skip one dog: a card that doesn't parse, a detail
  page that fails.
- Not done here: Dogs Trust's Playwright listing still stops early when a
  page doesn't render after "Next". Its "1 / N" indicator can be stale, so
  raising needs a check against the live site first (follow-up on #559).
- Site findings from this work (Woof reads only page 1; Many Tears' count
  swing is churn) are in `docs/technical/operational-knowledge.md`.

## Gotchas

- **The local dev database can lag production's schema.** Alembic only reads
  `RAILWAY_DATABASE_URL`, which is production in `.env`, so never run it for
  a local fix. On 2026-09-26 the local DB lacked `animals.breed_raw`, and
  every new dog's save failed locally, silently until #555. Compare columns
  with `information_schema.columns` on both sides and add what is missing by
  hand.
- **Backfill findings for #572** (from `backfill_commands.py plan`):
  - `rean` (2026-09-26): all 11 stored descriptions (`description`,
    `raw_text`, `rescue_context`) still hold the neighbouring dogs' headings
    that the GoDaddy page leaked before #435, e.g. Athena's text starts with
    "Lindsey 5 years old". A fresh scrape is clean and every other field
    matches. REAN needs a forced re-scrape and a re-profile of all 11 dogs.
