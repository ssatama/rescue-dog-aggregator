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
(`scraper.alert_type=dogs_not_saved`). Rejected and failed dogs are not marked
seen, so they go stale while still listed; #558 fixes that for failed saves.

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
