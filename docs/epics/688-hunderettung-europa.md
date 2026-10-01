# Epic #688: add Hunderettung Europa as a new rescue

Hunderettung Europa e.V. (https://hunderettung-europa.de), added end to end as
a trial of onboarding a rescue under the current process. Nobody had added one
since 2025-08. When the epic closes, the lasting parts move to
`docs/technical/scraper-architecture.md` (the adding-a-rescue runbook) and
`docs/technical/operational-knowledge.md` (runners-up, site quirks), and this
file is deleted.

## Progress

| Issue | What | State |
| --- | --- | --- |
| #689 | Scraper (WordPress REST API) and disabled org config | merged (#693) |
| #691 | Site copy and country data (Romania) | #694, merges once the rescue is enabled |
| #692 | Rollout up to the first production sync (gives the org its ID) | done: org ID 30, 2026-10-01 |
| #690 | LLM prompt (German to English) and logo | this PR |
| #692 | Enable, first scrape, LLM batch, Chrome check, runbook | |

## Why this rescue

Chosen on 2026-10-01 from 14 European candidates (UK-only rescues excluded,
current rescues skipped).

- Registered non-profit (eingetragener, gemeinnütziger Tierschutzverein),
  Duisburg, founded 2019, ~300 volunteers. Main project: a partner shelter
  near Brașov, Romania (~400 dogs there).
- ~150 dogs listed: 111 in Romania, 39 in German foster homes. Romania is a
  new source country for the site.
- Rich profiles: a long German story (median ~3,500 characters), labelled
  facts, several photos and videos per dog.
- Scraper-friendly: robots.txt only blocks `/wp-admin/`, no Cloudflare
  challenge, the dog data is in the public WordPress REST API.

## Decisions

- **`ships_to: [DE, CH, NL, BE, LU]`**: the rescue adopts to Germany "and
  neighbouring countries such as Switzerland, the Netherlands, Belgium and
  Luxembourg", case by case outside Germany. Only the countries it names;
  Austria, France, Denmark, Poland and Czechia are neighbours too but are
  added only if the rescue confirms.
- **The REST listing is the whole scrape.** `GET /wp-json/wp/v2/posts`
  returns each post's rendered page, so no dog page is fetched. Pages hold
  25 posts: a post carries its whole rendered page, and 100 of them were
  3.6 MB, up to 46 s uncached. About 11 requests a run (5 category, 6 post).
- **The cron loads only whitelisted modules**
  (`utils/secure_scraper_loader.py`, `ALLOWED_MODULES`). A test now checks
  every config's module is on it; the first version of this scraper wasn't.
- **Categories by slug, not number**: `hundekategorien` > `aufenthaltsort` >
  `rumaenien` / `deutschland` (and its federal states). A missing location
  category, a missing page, a missing `X-WP-TotalPages` header or an empty
  listing raises `ListingIncompleteError`. Posts are paged oldest first
  (`orderby=id`), so a dog published mid-run can't push another off a page.
- **IDs** are `hre-<post id>`. A dog that moves to a foster home is renamed
  ("Pflegehund Tindra", `/pflegehund-tindra/`) but keeps its post ID.
- **Template text and photos**: everything hidden on desktop
  (`.elementor-hidden-desktop`) is dropped before reading, not only what is
  hidden on all devices. On 2026-10-01 two posts showed template parts on
  phones only (Motte's "Monat/ Jahreszahl" facts, Molly's stock photo); no
  post shows anything on desktop only. Images named `template-*` are skipped
  as well.
- **Story**: from the first heading after the facts to the first button; the
  rescue's generic "Adoption" block follows it. "Lerne hier … kennen!" video
  links are dropped. The "Zuhause gesucht" section stays: it is partly
  boilerplate, partly the dog's needs; the prompt (#690) handles the
  boilerplate.
- **Size from the stated shoulder height** on the shared 40/60 cm scale
  (`utils/dog_size.py`); a range counts only when both ends give the same size,
  so a puppy's "ca. 20 – 59 cm" is no size (16 puppies on 2026-10-01). The
  rescue's own size categories (Klein/Mittel/Groß) use the same split and
  stand in when the text has no height; puppies have none.
- **Age**: "geb. ca. Februar 2026" is stored as `date_of_birth` and
  `age_text` "02/2026" (a year alone as "2016"), the form the age parser
  reads as a birth month. "Februar 2026" itself would be read as an age.
- **Sex** from "Geschlecht", the category standing in.
- **Location**: "Romania" for the shelter, "<town>, Germany" from "Auf
  Pflegestelle in: <postcode> <town>" for a foster home.
- **No breed**: the rescue doesn't state one.
- **Gnadenplatz dogs stay**: they are seniors looking for a home for life, not
  sanctuary-only.
- **`skip_existing_animals: false`**, unlike every other rescue: the listing
  already holds every page, so re-reading costs no request, and dogs move
  from the shelter to foster homes (39 of 150 had). Unchanged dogs are a
  `no_change` and photos are reused. Text changes don't re-profile a dog
  (profiling runs on create). A moved dog's post is renamed
  (`/tindra/` to `/pflegehund-tindra/`); the old link 301s to the new one,
  and updates don't rewrite `adoption_url`.
- **Excluded**: `happy-ends-hunde` and all its subcategories (WordPress
  doesn't exclude children). Size and sex categories only stand in for the
  text, so a change to those trees logs a warning instead of failing the run.
- **A post without its facts block** counts as a failed dog, not a half-read
  one, so a layout change shows up in the run's detail failures.

## LLM profiles (#690)

- Prompt `prompts/organizations/hunderettung_europa.yaml`, org 30, German
  source. It names the rescue's boilerplate, measured as the sentences
  repeated across the 150 stories (the "Zuhause gesucht" closing in 129, the
  Tierschutz-FAQ link in 75, the new-dog and litter paragraphs, the
  foster-home paragraph, the guardian-dog notice), so none of it becomes a
  trait.
- Dry run on 16 dogs (2026-10-01, `google/gemini-3.8-flash`, no database:
  `DogProfilerPipeline(organization_id=30, dry_run=True).process_batch` on
  the scraper's output): 16/16 profiled, no boilerplate in any description.
  Two fixes came out of it: a Gnadenplatz dog's profile mentioned the waived
  fee and called it "hospice/sanctuary placement" (now: never mention money;
  a Gnadenplatz dog is a senior looking for a quiet home), and "no small
  children, teenagers from 14" read as `no` (now `older_children`).
  Puppies with only the litter template get short, honest profiles.
- Logo: the rescue's square paw-and-hand mark (512 px PNG from its site),
  uploaded to R2 as `org-logo-hunderettung-europa.png`. Checking it right
  before the upload cached a 404 at Cloudflare for a while; check with a
  query string instead.

## Runners-up (for later)

| Rescue | Dogs | Adopts to | Notes |
|---|---|---|---|
| ROLDA (sponsoradog.rolda.org) | 59 free + 89 reserved | SE, CH, NO, DE, UK | Best structured data (WordPress ACF JSON, English) |
| Scooby Medina (uonline.it/scooby) | 83 | Europe via partner groups | Structured compatibility ratings; no per-dog URL found |
| Animal Care Austria | ~350 | AT (handover at the Hungarian border) | Thin profiles |
| Hope for Dogs Europe | ~126 | NL, BE, DE, AT | Thin profiles |
| Fundación Benjamín Mehnert | 73 | Spain/Europe | Spanish-only stories |
| Every Dog Matters EU | ~50 | DE, BE, FR | Small |

Rejected: SOS Dogs Romania (`crawl-delay: 60`), Sochi Dogs (dogs mixed into
Squarespace blog posts), Takis Shelter (in-person only), Tierhilfe
Hoffnung/Smeura (rehomes only via partners), DASH (8 dogs), Save a Dog
Romania (29).
