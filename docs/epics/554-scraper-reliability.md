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

## breed_raw keeps the rescue's text (#560)

`process_animal` sets `breed_raw` only when it is absent. Most scrapers call
it in `collect_data` and `save_animal` calls it again; the second pass used to
record the standardized name ("Toy Poodle" for Dogs Trust's "Poodle (Toy)").
Everything else still runs on both passes, so a breed a scraper fills in after
the first pass ("Mixed Breed" defaults) is still standardized on save, and
derived columns are what they were before.

- Backfill step `restore-breed-raw`: `breed_raw` back to `properties.breed`
  for Dogs Trust, Santer Paws, Bosnia and Woof, whose `properties.breed` is
  the site's text. It plans 750 dogs (2026-09-26) and changes nothing else,
  exactly what a forced re-scrape writes (`plan --org santerpawsbulgarianrescue`:
  70 `breed_raw`, no other field).
- Re-resolving the derived columns from the restored text would change no
  standardized name, slug, type or group (checked 2026-09-26), so
  `breed_restandardize.py` has nothing to do for these rows.
- Not in the step: Many Tears (its `properties.breed` is sometimes another
  field, e.g. "Can be the only dog"; from now on scrapes store that text as
  `breed_raw` too, until #571 fixes the parse), Tierschutzverein (`breed_raw`
  is the scraper's English translation of `Rasse`), MISIs (`breed_raw` is
  NULL for every dog; #562), Pets in Turkey, REAN and The Underdog (no source
  copy; #572's forced re-scrape rewrites listed dogs), and the disabled Galgos
  del Sol and Furry Rescue Italy (no row differs).
- The step includes unlisted dogs: their `properties.breed` is the text their
  last scrape read, which is still the rescue's wording.

## Ages keep up (#561)

Ages used to freeze at first sight (every org skips existing dogs), so 70
active dogs first seen over six months ago were still "puppies" on
2026-09-26, 59 of them at MISIs. A dog's age is now stored as the range of
birth dates that fits what the rescue said (`birth_date_min`,
`birth_date_max`), plus `age_observed_at`, the day the age was read.
`utils/birth_dates.py` holds all of it.

- A scraper whose rescue publishes a date of birth passes the text as
  `date_of_birth` (optional key; the save parses it). Tierschutzverein
  (`Geburtstag`), Santer Paws (`D.O.B`), Bosnia, Daisy (`Alter`), Pets in
  Turkey ("Born in") and MISIs (the DOB bullet, from its label on: DOB,
  date of birth, birthday; a bare "born" can be the dog's puppies). Dates
  are day-first. An `age_text` that is a birth date also counts, when it
  says so (DOB, born, geb.) or is nothing but a date: The Underdog's
  "Puppy (estimated DOB 01.03.2026)". A bare date that doesn't parse
  (Daisy's "07/20218") is no age: `parse_age_text` would count it from today.
- Everyone else: the stated age is taken back from the day it was read.
- Months are capped at 360 (`MAX_DOG_AGE_MONTHS`), the bound "8+ years"
  parses to, or open-ended maxima would grow on every refresh.
- `age_min_months`/`age_max_months` stay stored columns, derived from the
  range: at save time, and by `REFRESH_AGES_SQL` after every cron batch
  (`age_refresh` in the batch summary). Chosen over deriving them at read
  time because every filter, sort, stat and the frontend read those two
  columns. The cron runs three times a week, so a month boundary can show
  up to three days late.
- **An unchanged `age_text` keeps its anchor.** A forced re-scrape of a
  site that still says "3 months" a year later must not make the dog a
  puppy again. The months are parsed afresh, so a parser fix still lands.
  Rows stored before #561 have no anchor, so `created_at` stands in (the
  age was read at first sight). This makes #572's forced re-scrape and the
  `derive-birth-dates` step agree, in either order. Known limit: a row
  whose `age_text` an earlier update rewrote gets an anchor that is too
  early; nothing records when the text changed.
- `age_text` is still the rescue's words as first read ("3 months"). The
  frontend shows categories from the months, not the text; JSON-LD and the
  favourites compare view still show the text (a follow-up).
- Backfill step `derive-birth-dates`: active dogs only (the admin API caps
  a query at 5,000 rows; there are 10k dogs). Planned 2026-09-26: stale
  puppies 70 → 6, and the 6 are real (DOB September/October 2025).
- The migration (`f1a6d8e3c520`) must be on production before the PR
  merges, or every save fails on the missing columns.

## MISIs reads the post body (#562)

A MISIs dog is a Wix blog post, and everything about it is inside
`[data-hook="post-description"]`: the story, then a facts list under "Things
you should know about X" (also "have to know"), then the adoption
boilerplate from "How do you adopt X?". `scrapers/misis_rescue/detail_parser.py`
reads only that element. The story is `properties.description` (the facts
when a post has no story), the facts are `raw_bullet_points`, and
`page_text_excerpt` is gone.

- Wix renders the post on the server, so the plain-HTTP fetch
  (`_scrape_dog_detail_fast`) is the normal path. 404/410 means the post is
  gone (skip the dog); another non-200, or HTML without the post, falls back
  to the browser. The browser paths skip a page without a post body. No
  more "500"/"not found" substring checks: CSS like `font-weight:500`
  dropped real dogs.
- New posts had no age because "✔️DOB January 2026" has no colon or dash
  after DOB. The DOB bullet is now the age (`date_of_birth` and `age_text`),
  parsed by #561's `utils/birth_dates.py`; `extract_birth_date` and
  `calculate_age_years` are deleted.
- `navigate_with_retry` doesn't expose the HTTP status, so the browser path
  relies on the missing post body; one fetch helper is #567.

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
  - `misisrescue` (#562): forced re-scrape of every listed dog; `apply`
    re-profiles those whose description changed (all of them: none had one).
