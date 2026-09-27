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
- Site findings from this work (Woof lists available dogs first; Many Tears'
  count swing is churn) are in `docs/technical/operational-knowledge.md`.

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
- A stated age ("3.5 months old") anchors at the post's publication
  (`article:published_time`), passed as `age_stated_at`: the text was
  written then, often years before we read it. Not the last edit: a new
  photo must not make the dog younger. A dog whose age the rescue updated
  in an edit therefore reads a little old. Without it, a re-scrape whose parser
  renders the same text differently ("5 months" → "4 months") would count
  as a changed age and re-anchor at today.
- **Rate:** `_process_single_batch` fetches a batch concurrently
  (`batch_size` threads) and waits `rate_limit_delay` only between batches,
  so the configured 2.5 s isn't a per-request rate. Two back-to-back dry
  runs on 2026-09-26 got 196 HTTP 429s. For #567 (one rate-limit meaning).
  A 429 now backs off (4 x `rate_limit_delay`) and retries once, then skips
  the dog; it never falls back to the browser. Don't run MISIs dry runs back
  to back.

## Tierschutzverein: English ages, size by height (#563)

- `age_text` is the translation of `Geburtstag` ("03.2025 (10 Monate alt)"
  -> "10 months old"). The scraper no longer sets `age`: `process_animal`
  prefers it over `age_text`, so the German text used to be stored. The
  birth range still comes from `Geburtstag` as `date_of_birth` (#561).
- Size is read from "Ungefähre Größe" by shoulder height:
  `translate_size` in `scrapers/tierschutzverein_europa/translations.py`
  (Small below 35 cm, Medium up to 55, Large above). A range counts by its
  middle; without a height, the site's word (klein, mittelgroß, groß). A
  dog still growing gets no size, and the save falls back to the breed's:
  the text says so ("im Wachstum", "wächst", "nicht ganz ausgewachsen"),
  or the stated age is under 12 months (weeks count as 0). The rescue's
  own adult size wins over both: "klein bleibend", "mittelgroß werdend",
  "wird groß", or a height marked "Endgröße", "ausgewachsen", "wächst kaum
  noch" (the height after the marker, else the first). Two size words
  ("klein bis mittelgroß") give no size. Known
  limit: a puppy keeps no size until a forced re-scrape, because
  Tierschutzverein skips existing dogs (43 of 392 on 2026-09-27). Daisy's
  scraper uses 40/60 cm for the same question; one scale for all rescues
  belongs to #568.
- An age the translation doesn't recognise is stored as `None` and logged
  ("Untranslated age for ..."), never as German text.
- The "Beschreibung" section is stored as `properties.description`, the
  key every reader uses. `profile_inputs` (`management/backfill_diff.py`)
  compares the profile texts, not the keys they sit under, for both `plan`
  and `apply`, so #572 doesn't re-profile 366 dogs whose text only moved. The API's sitemap filter (`animal_service.py`) reads only
  that key, so every Tierschutzverein dog used to be out of the quality
  sitemap. The cost: readers of the key now see German text. Pages show
  the English AI text first, but a dog not yet profiled shows the German
  in its page body, meta description and JSON-LD (3 dogs on 2026-09-27).
  Marking the description's language is for #568.
- The issue's "243 Medium" didn't match production on 2026-09-27: 75
  Medium, 201 with no size at all (breeds with no size estimate). Height
  makes most of those 201 Medium, so the Medium count goes up, not down.

## Dogs Trust: compatibility from the "May live with" chips (#516)

The detail page's "May live with" card holds one link per chip, each to the
site's own search (`/rehoming/dogs?liveWithDogs=true`): Cats, Dogs,
Preschool/Primary school/Secondary school children. `_may_live_with` reads
the links inside that card only, and maps them by the URL parameter, not
the label: the labels changed in 2026 ("Secondary" became "Secondary
school children"). A chip it doesn't know, or a card without chips, is
logged. The
old code took the first `div` whose text contained "May live with", which
was the page wrapper, so `good_with_dogs` was true for every dog with the
card (the wrapper always says "dogs"). The children check looked for
"primary school age children", which the site no longer prints, so
`good_with_children` was always "Unknown". A breed link sometimes leaked
into `may_live_with` ("German Shepherd Dog Cross, Secondary school
children").

- A chip means yes; no chip means the rescue didn't say, so the key is left
  out, not "Unknown" and not "no". The AI profile reads "only dog" from the
  text, and the frontend's `companionAnswer` prefers it.
- Children: preschool means any age (`true`), primary "Yes (5+)",
  secondary only "Yes (11+)".
- The profile was fed the wrong facts, so `profile_inputs` (backfill tool)
  counts `good_with_dogs/cats/children` as profile inputs, by key. Dropping
  the "Unknown" placeholder alone isn't a change. `may_live_with` isn't an
  input: its labels changed in 2026 while the facts didn't.
- The Dogs Trust prompt (1.1.0) reads the `good_with_*` properties, not
  the chip labels: `true` is "yes", "Yes (5+)"/"Yes (11+)" is
  "older_children" (the schema has no 5+ bucket, and a primary-school dog
  isn't cleared for toddlers). A missing one is not a "no"; only the
  description can say no.
- The scraper can no longer store an explicit `false`: the "Can live with"
  section it parsed isn't on the pages, and no stored Dogs Trust row had
  one. Negatives come from the profile.
- After #572: change `companionAnswer` in `frontend/src/utils/dogFacts.ts`
  to `answerOf(profile) ?? answerOf(properties)`, so a rescue's real answer
  fills in behind an AI "unknown" (from #514's review, on #516). Not before
  every shown row is right: #572 re-scrapes only listed dogs, and the 118
  in stale grace (2026-09-27) keep the wrong `true` until they're retired
  or a step clears them.
- A page without the "May live with" label is silent (102 dogs have no
  card). If the label is renamed, every dog loses the facts quietly; a
  run-level count of dogs with chips belongs to #569's stats.

## Pets in Turkey: photo ids, whole names, no sleep (#564)

- **The ID is the photo:** `pit-{wix media id}` (`pit_external_id`), the 32
  hex digits of the card photo's Wix upload. The page has no per-dog id: its
  repeater item ids (`__item-kn4frxp6`) decode to 2017-2023 timestamps, so the
  rescue edits slots in place for the next dog. A name id was the fallback,
  but names come back for different dogs (Dotty, a terrier in 2025 and an
  8-month-old spaniel mix in 2026). Every one of the 33 dogs listed on
  2026-09-27 still had the photo it was first seen with (stored R2 hash =
  hash of today's URL), some for over a year. Known cost: a new photo for the
  same dog re-creates it, and the old row retires after the stale grace. A
  card without a Wix photo is skipped (logged).
- **Re-key:** `management/pets_in_turkey_rekey.py` (dry run by default) moves
  rows onto the photo id from `original_image_url`. Planned on 2026-09-27:
  128 of 139 rows, all 33 active, exactly the fixture's 33 ids. The other 11
  share a photo with a newer row: the same dog re-created by a breed edit under
  the old ids (Barney, Chiara, Coffee...), left as they are. Apply it on the
  laptop right after the merge deploys and before the next cron.
- The name is everything after "I'm". `adoption_url` is `/dogs` (no per-dog
  anchor); a save never rewrites `adoption_url`, so backfill step
  `pets-in-turkey-listing-url` fixes stored rows (139 planned 2026-09-27).
- The cards have no story, so no description. Every listed dog is saved on
  every run (the scraper doesn't skip existing dogs), so the cron clears the
  "Ready to fly" text on listed dogs; unlisted rows keep it.
- No placeholders: breed, sex and size are `None` when the card lacks them.
- "Born in" dates were never read: the value sits past the other labels, more
  than five texts on (Shadow had no age). The search now runs to the end of
  the card.
- Runtime: discovery 0.9 s (was 96 s of per-dog sleep). A local run takes 19 s
  in all, 18 s of it failed image uploads (no R2 credentials locally).

## Woof Project: plain HTTP listing (#565)

- The listing is plain HTML: one `<article class="type-adoption">` card per
  dog, its name the last `<h2>`, and a status `<h2>` above the name when the
  dog is adopted or reserved (any case; "GEADOPTEERD" in Dutch). Any other
  heading above the name is logged and the dog kept: hiding an available dog
  is the worse error. The Selenium and Playwright listing code (a fresh
  browser per page, 300px scroll steps, fixed sleeps, page 1 loaded twice) is
  gone, and so is the browser fallback: plain HTML has every card.
- Available dogs come first, then the archive (pages 2-5, 2026-09-27), so the
  next page is read only while a page lists an available dog: pages 1 and 2
  today, with the org's rate limit between them and each page read once. The
  archive holds a badge-less 2023 dog (Billy, page 3), so following every
  page would bring old dogs back.
- Two production errors fixed: **Arean** says "GEADOPTEERD" but was live as
  available (the old check wanted English words right above the name), and
  **Amlet** was never scraped because his page is `/adoption/9270/` and the old
  URL check rejected numeric slugs. Today's production ids otherwise match
  (13 of 14; Arean goes stale, Amlet is added as `wp-9270`).
- Runtime: the listing takes 9 s live (two pages and the 3 s rate limit). A
  local run of the first version (page 1 only) took 16.6 s in all, including
  Amlet's detail page, photo upload and profile (was 169 s on average, 241 s
  of `data_collection` in the latest run).

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
  - `dogstrust` (#516, 2026-09-27, Playwright path; 14 minutes): 362
    scraped, 361 matched, 3 rejected (no photo yet), 118 stored dogs not
    listed (the three-miss lag). Compatibility: `good_with_dogs` true -> none
    188, `good_with_cats` true -> none 23, `good_with_children` gains "Yes
    (11+)" 205, "Yes (5+)" 43, true 5; the "Unknown" placeholders go.
    `may_live_with` loses a leaked breed on 45. 256 dogs re-profile. The
    same run also shows #560's `breed_raw` (185) and #561's birth ranges.
    Run plans with `USE_PLAYWRIGHT=true` on the laptop: without it Dogs
    Trust takes the Selenium listing and returns 5 dogs.
  - `tierschutzverein-europa` (#563, 2026-09-27): forced re-scrape of 373
    listed dogs (the dry run took 6.5 minutes at the configured rate,
    without image uploads; plan it off-peak). 372 matched: every `age_text`
    English, birth ranges on all 372, `description` on 366, no re-profiles
    (the text only moved key). Sizes over the 392 active dogs' stored
    heights and ages, after review: 213 Medium, 117 Large, 10 Small, 52
    none (43 under 12 months, 9 growing or no height).
