# Guides Remediation — Deferred to PR 3

Everything from `docs/audits/guides-regulatory-audit.md` that PR #368
(`fix/guides-defects`) and PR 2 (`refactor/guides-remove-unsupported-claims`)
deliberately did **not** address.

Those two PRs fixed mechanical defects and deleted unsupported claims. Neither
wrote a single new sentence about law, veterinary requirements, documents, or
import procedure. Everything below needs exactly that, which is why it is here.

---

## 1. Regulatory corrections requiring new sourced text

These are all still live on the site. Each needs a replacement written against a
primary source, not a deletion.

| # | Location | What is wrong | Primary source to write from |
|---|---|---|---|
| W3 | `european-rescue-guide.mdx` — "UK Pet Travel After Brexit" | The "Core Requirements" list is the **non-commercial pet travel** list. A rescue dog changes owner and travels without the adopter, so GB commercial rules apply: health certificate, IPAFFS notification, origin in registered/approved premises. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules), [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| W4 | same list, "Documentation" bullet | "EU Pet Passport (issued before 2021) or Animal Health Certificate for newer imports". GB accepts an EU-issued passport with no pre-2021 cut-off; an AHC is issued **in GB** for pets *leaving*. Neither applies to a rescue movement. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| W5 | `european-rescue-guide.mdx` — "Requirements for Germany, Austria, and Switzerland" | "follow standard EU Pet Passport regulations" / "EU Pet Passports for intra-EU movement". A change-of-ownership move needs an official vet's health certificate, TRACES notification, and a registered establishment of origin. | [Del. Reg. (EU) 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| W6 | `european-rescue-guide.mdx` — "Special Cases" | "three-month **quarantine** periods after rabies blood titer testing". It is a waiting period, not quarantine: sample ≥30 days post-vaccination, ≥3 months before movement, result ≥0.5 IU/ml. Turkey is unlisted in 2026/636, which is what drives it. | [food.ec.europa.eu](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en), [Impl. Reg. 2026/636](https://eur-lex.europa.eu/eli/reg_impl/2026/636/oj/eng) |
| W7 | `european-rescue-guide.mdx` — same section | "Cross-border movement within Germany, Austria, **Switzerland** … **No internal border checks exist**". Switzerland is outside the EU veterinary and customs area. | [bazg.admin.ch](https://www.bazg.admin.ch/de/mit-hund-und-katze-in-die-schweiz), [blv.admin.ch](https://www.blv.admin.ch/de/reisen-heimtiere-hunde-katzen-frettchen) |
| — | `european-rescue-guide.mdx` | "The old EU Pet Travel Scheme no longer applies." Survives PR 2 because deleting it would have left the section with no opening. GB still runs a pet travel scheme and still accepts EU-issued passports; what changed is GB-issued passports for entry *to* the EU. | [gov.uk pet travel document](https://www.gov.uk/taking-your-pet-abroad/pet-travel-document) |
| — | `costs-and-preparation.mdx` | Animal Health Certificate validity. PR 2 removed the undated prices but left the AHC sentence. Validity is 10 days for entry to the EU, then **6 months** for onward travel and re-entry to GB (was 4 months). | [gov.uk pet travel document](https://www.gov.uk/taking-your-pet-abroad/pet-travel-document) |
| — | `costs-and-preparation.mdx`, `FaqClient.tsx` | "EU Pet Passport" as a deliverable. Model changed 22 April 2026; certificate models under 2026/848, old models issuable to 1 Oct 2026 and valid to 31 Mar 2027. | [Impl. Reg. 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng), [Impl. Reg. 2026/848](https://eur-lex.europa.eu/eli/reg_impl/2026/848/oj/eng) |

## 2. The 22 April 2026 framing

No guide mentions that the EU framework changed on 22 April 2026. The
regulatory content was written before that date and has not been revisited
since; the `lastUpdated` field now reads 2026-08-28 because of the mechanical
and deletion passes, which makes the guides look current while the regulatory
substance is not. Until the change is stated, a reader comparing the guides
against their vet's advice finds them describing a superseded regime, which
undermines the accurate parts too.

Needs: a short dated note, and the new instruments named where relevant
(2016/429 Part VI, 2026/131, /132, /133, /135, /636, /705, /848).

## 3. Missing material the audit identified

- **Animal Welfare (Import of Dogs, Cats and Ferrets) Act 2025 (c. 30)**, Royal
  Assent 2 Dec 2025. s.1(3): the first regulations **must** ban importing dogs
  under 6 months, more than 42 days pregnant, or mutilated. s.8: ss.1–7 commence
  by regulations — **not yet in force**, no commencement regulations found.
  ([s.1](https://www.legislation.gov.uk/ukpga/2025/30/section/1),
  [s.8](https://www.legislation.gov.uk/ukpga/2025/30/section/8))
- **Brucella canis** — mandatory negative test for commercial imports of dogs
  from Romania to GB, "This includes rescue animals". Both guides discuss
  Romania at length and never mention it.
- **Approved Importer status** — required for commercial imports from Romania,
  Ukraine, Belarus, Poland. A concrete thing an adopter can ask about.
- **§ 11(1) Nr. 5 TierSchG** — a permit is required to bring vertebrates into
  Germany for transfer against payment, or to broker such transfers. The single
  most useful verification question for a German adopter.
  ([gesetze-im-internet.de](https://www.gesetze-im-internet.de/tierschg/__11.html))
- **Swiss specifics** — AMICUS registration within 10 days, personal customs
  declaration, 8.1% VAT above CHF 300, cropped dogs barred, and the fact that
  transport by an organisation counts as a commercial import.
- **Country listing status** — Serbia, Bosnia, Montenegro and the UK are in
  Annex II of 2026/636; Switzerland in Annex I; **Turkey is unlisted**. Directly
  relevant: 157 available dogs come from Serbian organisations and 44 from Turkey.

## 3a. GB statutory duties — RESTORED 2026-08-29

Done, not deferred. The ID tag and microchipping duties are real and are back
with a Great Britain qualifier and primary sources: [Control of Dogs Order
1992](https://www.legislation.gov.uk/uksi/1992/901/made) for the collar, and the
microchipping regulations for
[England](https://www.legislation.gov.uk/uksi/2015/108/made),
[Scotland](https://www.legislation.gov.uk/ssi/2016/58/made) and
[Wales](https://www.legislation.gov.uk/wsi/2015/1990/made).

Still open from that group:

- **Hunde-Sachkunde (Austria)** — the whole bullet went when only its price
  should have. Restoring it needs the actual trigger conditions from the
  relevant Land, not the old "for new owners" wording the audit flagged as
  wrong.

## 3b. Norman et al. (2020) — what the paper actually supports

The paper behind most of the guides' statistics has now been read. See the
correction block at the top of `guides-regulatory-audit.md`. For PR 3:

- **14.8% Leishmania can come back, with its denominator.** It is 14.8% *of
  dogs that had been tested*. 79 owners reported a positive test. Reinstating it
  without "of those tested" reintroduces the original defect.
- **89% can come back, reframed as owner belief.** The paper reports what
  adopters said about how their dog was imported, from a Facebook-recruited 2017
  sample, with owner knowledge of importation practice named as a limitation.
  "89% of rescue imports were using the wrong rules" is not what it establishes.
- **20% arrived with known health conditions**, most commonly traumatic injury —
  a real finding the guides never used, and one that belongs in an honest guide.
- **Do not reinstate any satisfaction, retention or success rate.** The paper
  reports none.

**Before reinstating anything from this list, amend the guard.**
`frontend/src/__tests__/guides/mdx-compilation.test.ts` blocks `89%` and
`14.8%` as bare patterns, so a correctly-framed reinstatement will fail CI
until its entry is updated or removed in the same commit that adds the source.
That is the intended friction, not a bug — but it needs doing deliberately
rather than by deleting the guard.

Still to verify against the full text before reuse, all currently in the guides
and all attributed to this paper or to "the UK study":

- 67.5% sought behavioural help / 71% reported it resolved
  (`european-rescue-guide.mdx`, `why-rescue-from-abroad.mdx`)
- 4% vs 8% consideration-of-return comparison with p < 0.0001
- 81% home visits, 40% questionnaires, 92% through organizations, 59% wanted a
  specific dog, 53% previously tried UK adoption, 61% street dogs, 41% adults,
  65% mixed breeds, 10% from cruelty

Separately, the Danish 2021 study figures in `european-rescue-guide.mdx` (97% of
street dog owners still had their dogs, 2.1% aggression, 6.7% anxiety) are a
**different** citation and were not part of the Norman et al. problem. They have
not been checked against their source.

## 4. Structural work

- **The article body is not server-rendered.** `GuideContent.tsx` loads
  `MDXRenderer` with `dynamic(..., { ssr: false })` while the route is
  `force-static`. Served HTML has one `<h1>` and **zero** `<h2>`; the guide text
  exists only in the `self.__next_f` RSC payload. Crawlers that do not execute
  JavaScript see the hero image, title and byline. This is the single largest
  structural problem in the guides.
- **Table of contents and heading anchors are client-only.** The TOC is built
  from `document.querySelectorAll("article h2")` after a 100 ms timeout, so no
  `#anchor` deep link resolves before hydration and none exists in static HTML.
- **Anchor slugifier can emit trailing hyphens.** `children.toString()
  .toLowerCase().replace(/[^a-z0-9]+/g, "-")` with no trim. No heading is
  affected today; it is fragile, not broken.
- **`readTime` values are optimistic.** 380–413 wpm across the four guides
  (`first-time-owner` is 15 min for what is now 5,747 words). A normal 220–250
  wpm would roughly double them.
- **Markdown tables have no horizontal scroll container.** `GuideContent.tsx`
  maps `h2`, `p`, `ul`, `ol`, `a`, `code` but not `table`. Worth checking on a
  narrow viewport.
- **FAQ has no `FAQPage` JSON-LD**, despite `FAQ_SECTIONS` already being a clean
  question/answer structure.

## 5. Content-level work

- **Duplicated content across guides.** The supplies checklist appears in both
  `first-time-owner` and `costs-and-preparation` almost item for item; the 3-3-3
  rule appears in `first-time-owner` and `european-rescue`; the Galgo background
  appears in all three. One set of facts, three chances to drift.
- **Conflicting lifetime cost ranges.** `costs-and-preparation` gives
  £10,000–£20,000 in its opening and £10,000–£30,000 in a `<Stats>` block;
  `first-time-owner` no longer quotes a figure at all after PR 2 removed the
  University of Pennsylvania range. A single sourced range should be agreed and
  used everywhere.
- ~~Study-attributed figures kept asymmetrically.~~ **Resolved 2026-08-29.**
  Removed everywhere, because the paper reports no such figure. See §3b.
- **Remaining UNVERIFIABLE rows not deleted**, because deleting them would have
  gutted sections that carry real weight and the replacement is a sourcing job:
  the 50,000–100,000 Galgo figure (all three guides), the German 2025 C-BARQ
  study, the carbon figures, the Bosnia/Montenegro figures, and the "7,800 UK
  dogs euthanized annually" figure. Each needs a citation or a cut. The
  Charleston/Canadian/US return-rate comparisons and the Danish study's
  retention figure have since been deleted; the Danish aggression (2.1%) and
  anxiety (6.7%) figures remain and are still unverified — a search for them
  returns only this repository.

## 6. Data defects, not content defects

- **`age_min_months` is NULL for every available Bulgarian (82) and Bosnian (63)
  dog.** Not a scraper bug: those organisations do not publish age on their own
  sites, so there is nothing to scrape. It is a **filter-semantics** problem.
  `age_category` compiles to `a.age_min_months >= x AND a.age_max_months <= y`,
  so a NULL age fails every comparison and the dog silently disappears from any
  age-filtered query — across `/dogs`, the swipe interface and the guides, not
  just the one `DogGrid` PR #368 worked around. 145 available dogs are currently
  invisible to a large share of filtered searches. **This is the highest-value
  item in this document**: it is costing adoptions now, and the fix is in how
  unknown ages are treated, not in data we cannot obtain.
- **`location_country="SR"` is not ISO 3166 for Serbia** (`RS` is). The
  production database stores `SR`, so content and data agree and the queries
  work. Changing it is a data migration.
- **`DogGrid` empty-state link** now points at `/dogs?breed=<value>`, which
  always resolves. The older `/breeds/<slug>` destination soft-404s below the
  3-dog `QUALIFYING_BREED_MIN_COUNT`. No action needed; recorded so the
  reasoning is not lost.
