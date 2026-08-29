# Guides Regulatory Audit

**Date:** 2026-08-28
**Scope:** `frontend/content/guides/*.mdx` (4 guides), plus regulatory and process claims
elsewhere in the frontend (`src/app/faq/FaqClient.tsx`, guide JSON-LD, guide metadata).
**Phase:** Discovery only. No source files were edited.

## Correction, 2026-08-29

The source behind several UNVERIFIABLE rows has since been read: **Norman C,
Stavisky J, Westgarth C (2020), *Importing rescue dogs into the UK: reasons,
methods and welfare considerations*, Veterinary Record 186:248**
([summary](https://www.rcvsknowledge.org/resource/importing-rescue-dogs-into-the-uk-reasons-methods-and-welfare-considerations/)).
It changes four rows in the tables below:

- **U15 (Leishmania) — partly answered.** The summary confirms that 79 owners
  reported a positive Leishmania test, and that the 14.8% figure is of *dogs
  that had been tested* rather than of all imported dogs — a denominator the
  guides dropped, which changes what the number means. The 14.8% itself does
  not appear in the summary, so it still needs the full text before reuse. This
  says nothing about the rest of row U15: the babesiosis, heartworm,
  ehrlichiosis, Echinococcus and Linguatula percentages remain unverified.
- **U1 (89%) — real, but not what the guides claimed.** The paper reports that
  89% of dogs were *reported by their owners* as imported under the EU Pet
  Travel Scheme and 1% under the Balai Directive. That is owner belief from a
  Facebook-recruited 2017 sample, and the authors name owner knowledge of
  importation practice as a limitation. It does not establish that 89% of
  imports used the wrong rules.
- **U2 (3,080) — deletion was correct.** 3,826 questionnaires completed, 3,080
  eligible for analysis. It is a sample size, not an annual adoption rate.
- **The 97.4% / 97% satisfaction and retention figures were WRONG, not merely
  unverifiable.** The paper reports no satisfaction rate, retention rate,
  success rate or proportion returned. Its stated aim was to establish why
  people adopt from outside the UK and to investigate health and welfare
  problems; it reports 20% of dogs arriving with known health conditions, most
  commonly traumatic injury. The audit graded these figures as acceptable
  because they carried a named study and journal. **That was the wrong test.** A
  citation attached to a finding the paper does not contain is more dangerous
  than a bare number, because it survives exactly the review that catches the
  bare one. Removed from both guides on 2026-08-29.

---

## Why this audit exists

All four guides carry `lastUpdated: "2026-02-24"`, and `git log` confirms that is the real
date of last content change. The EU legal framework for moving dogs was replaced on
**22 April 2026**, eight weeks after these guides were last touched. Regulation (EU) No
576/2013 and Implementing Regulation (EU) No 577/2013 stopped applying on 21 April 2026.
Every regulatory paragraph in these guides was written under the old regime.

The new framework, all applying from 22 April 2026:

| Instrument | Covers |
| --- | --- |
| [Reg. (EU) 2016/429](https://eur-lex.europa.eu/eli/reg/2016/429/oj/eng) Part VI | Animal Health Law — parent act |
| [Del. Reg. (EU) 2026/131](https://eur-lex.europa.eu/eli/reg_del/2026/131/oj/eng) | Veterinary requirements, non-commercial movement |
| [Del. Reg. (EU) 2026/132](https://eur-lex.europa.eu/eli/reg_del/2026/132/oj/eng) | Identification and traceability of kept dogs/cats/ferrets |
| [Del. Reg. (EU) 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) | Movement of kept dogs/cats/ferrets **within** the EU |
| [Del. Reg. (EU) 2026/135](https://eur-lex.europa.eu/eli/reg_del/2026/135/oj/eng) | Entry of consignments into the Union |
| [Impl. Reg. (EU) 2026/636](https://eur-lex.europa.eu/eli/reg_impl/2026/636/oj/eng) | Lists of third countries |
| [Impl. Reg. (EU) 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng) | Model identification documents and declarations |
| [Impl. Reg. (EU) 2026/848](https://eur-lex.europa.eu/eli/reg_impl/2026/848/oj/eng) | New veterinary certificate models |

Old-model certificates could be issued until 1 October 2026 and remain valid until
31 March 2027, so a dog arriving today may legitimately carry either.

---

## The single structural error underneath most of the regulatory mistakes

The European Rescue Guide describes what a rescue dog needs in order to enter Great
Britain, and lists the **non-commercial pet travel** requirements: microchip, rabies
vaccine, tapeworm treatment, pet passport. Those are the rules for a person travelling
with their own pet.

A rescue adoption is not that. GOV.UK states that the stricter commercial rules apply if
"you're going to sell, rehome or transfer the ownership of the pet", or if the pet
"is arriving more than 5 days before or after you arrive"
([gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain)). Every
rescue adoption meets both tests. The same split exists on the EU side: a dog moved to a
new owner in Germany moves under Del. Reg. (EU) 2020/688 as amended by 2026/133, needing an
official veterinarian's health certificate, TRACES notification and origin in a registered
establishment — not under the pet-passport rules of 2026/131.

The guide does know this. It says so at `european-rescue-guide.mdx:72`. But it says it as an
aside, three paragraphs after presenting the wrong list under the heading "Here's what the
law actually requires". A reader who stops at the bullet list leaves with the wrong rules.

---

## Guides ranked by urgency of correction

1. **`european-rescue-guide.mdx`** — Carries nine of the eleven WRONG claims. Its
   "Legal Framework" section presents non-commercial pet travel rules as the requirements
   for rescue imports, names a directive repealed in 2021, describes a waiting period as
   quarantine, and dates Spain's animal welfare law to the wrong year.
2. **`costs-and-preparation.mdx`** — States two things as UK law that are not
   ("UK law requires restrained dogs", "car restraints... are legally required"), misstates
   Animal Health Certificate validity, and contains a dog query that returns HTTP 422 and
   renders an error box to every reader.
3. **`why-rescue-from-abroad.mdx`** — Builds a four-point policy argument on "enforce Balai
   Directive compliance", an instrument repealed on 21 April 2021. Gets Spain's law year
   right where the European Rescue Guide gets it wrong, so the two guides contradict
   each other.
4. **`first-time-owner-guide.mdx`** — Almost no regulatory content. One inherited claim
   ("ID tag (legally required)", which is correct for the UK but presented to an
   EU-and-Swiss audience). Its problems are prose and sourcing, not law.
5. **`src/app/faq/FaqClient.tsx`** — Two fee/inclusion claims that repeat the guides. Lower
   urgency because they are vaguer, and vagueness is protective here.

---

## Claims marked WRONG

These are the ones adopters may already be acting on.

| # | Guide | Line | Claim as written | Why it is wrong |
| --- | --- | --- | --- | --- |
| W1 | european-rescue | 72, 541, 555 | "Choose organizations that comply with **Balai Directive** requirements" / "Follow Balai Directive for commercial movements" | Directive 92/65/EEC was repealed by Art. 270(2) of [Reg. (EU) 2016/429](https://eur-lex.europa.eu/eli/reg/2016/429/oj/eng) with effect from 21 April 2021. For a German, Austrian or EU adopter there is nothing left to comply with under that name. GOV.UK still uses "Balai rules" informally for the GB regime, so the term survives in Britain only. |
| W2 | why-rescue | 369, 402, 410, 433 | "Use Balai Directive for commercial movements" / "Enforce Balai Directive compliance" | Same as W1. Here it is load-bearing: the guide's closing policy argument rests on enforcing a repealed instrument. |
| W3 | european-rescue | 62–68 | "Here's what the law actually requires for dogs entering Great Britain from EU countries:" followed by microchip / rabies / tapeworm / passport / IPAFFS | This is the non-commercial list. A rescue dog changes owner and travels without the adopter, so GB commercial ("Balai") rules apply: health certificate, IPAFFS notification, and origin in premises registered or approved by the competent authority in the country of origin ([gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules)). |
| W4 | european-rescue | 67 | "Documentation: EU Pet Passport (issued before 2021) or Animal Health Certificate for newer imports" | Two errors. GOV.UK accepts "a pet passport issued in an EU country or certain other countries" for entry to GB with no pre-2021 cut-off — the 2021 cut-off applies to *GB-issued* passports used to enter the EU. And an Animal Health Certificate is issued **in Great Britain** for a pet leaving GB; it is not an import document. ([gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain)) |
| W5 | european-rescue | 84, 90 | "Germany and Austria, as EU members, follow standard EU Pet Passport regulations" / "EU Pet Passports for intra-EU movement" | For a dog moved to a new owner, [Del. Reg. (EU) 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) amending 2020/688 applies: individual health certificate from an official veterinarian, TRACES notification to the authorities of destination, and origin in a registered establishment. A passport is required in addition ([2026/132](https://eur-lex.europa.eu/eli/reg_del/2026/132/oj/eng), model at [2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng)), not instead. |
| W6 | european-rescue | 95 | "Dogs from non-EU countries like Turkey face additional requirements: **three-month quarantine periods** after rabies blood titer testing" | It is a waiting period, not quarantine. The blood sample must be taken at least 30 days after vaccination and at least 3 months before the movement, with a result of ≥0.5 IU/ml. The dog is not confined and stays in the third country. ([food.ec.europa.eu, bringing a pet from a non-EU country](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en)) |
| W7 | european-rescue | 97 | "Cross-border movement within Germany, Austria, **Switzerland**, and broader EU follows straightforward procedures once dogs enter legally. **No internal border checks exist**" | Switzerland is outside the EU veterinary and customs area. Swiss customs require the animal to be declared in person at a staffed border crossing; the QuickZoll app may not be used; VAT of 8.1% applies where total value including the adoption fee, vaccination and transport costs exceeds CHF 300; and import of a cropped dog is prohibited. ([bazg.admin.ch](https://www.bazg.admin.ch/de/mit-hund-und-katze-in-die-schweiz)) |
| W8 | european-rescue | 459, 464, 509 | "Spain's **2022** animal welfare law" (three occurrences) | It is Ley 7/2023 of 28 March 2023, in force 29 September 2023. ([BOE](https://www.boe.es/eli/es/l/2023/03/28/7/con)) `why-rescue-from-abroad.mdx:114` says 2023 and is right, so the two guides contradict each other. |
| W9 | european-rescue | 464 | "PROHIBITS euthanasia of healthy dogs in shelters, yet **hunting dogs** were specifically EXCLUDED" | The exclusion in Ley 7/2023 covers *perros de caza, guarda y de trabajo* — hunting, guard **and** working dogs. `why-rescue-from-abroad.mdx:114` states this correctly. |
| W10 | costs-and-preparation | 227, 683 | "**UK law requires** restrained dogs" / "Car restraints or crates aren't optional. **They're legally required**" | Highway Code rule 57 is advisory: "When in a vehicle make sure dogs or other animals are suitably restrained…". The Highway Code introduction states that failure to comply with an advisory rule "will not, in itself, cause a person to be prosecuted", though it may be used in evidence to establish liability. ([rule 57](https://www.gov.uk/guidance/the-highway-code/rules-about-animals-47-to-58), [introduction](https://www.gov.uk/guidance/the-highway-code/introduction)) |
| W11 | costs-and-preparation | 166 | `<DogGrid breed_type="sighthound" />` | Not a legal claim, but a live defect: the API rejects it with HTTP 422, "Invalid breed_type value: sighthound. Must be one of: purebred, mixed, crossbreed, unknown". Every reader of that section sees a red "Unable to load dogs" box. |

---

## Claims marked UNVERIFIABLE

Each row gives the specific question that needs answering and who can answer it. None of
these should be rewritten until answered.

| # | Guide | Line | Claim | Question | Who can answer |
| --- | --- | --- | --- | --- | --- |
| U1 | european-rescue | 58 | "**89% of rescue imports were using the wrong rules**" | What dataset is this, over what period, and does "wrong rules" mean movements later found non-compliant, or an estimate? Repeated at why-rescue:402. | APHA / Defra — an FOI request on IPAFFS and pet-travel non-compliance data |
| U2 | european-rescue | 42 | "Over 3,000 UK households adopt European rescues annually" | Is this a count of imports, of households, or the sample size of Norman et al. 2020 (3,080 respondents) restated as an annual rate? The number is suspiciously close to the study's n. | APHA import statistics; the study authors |
| U3 | european-rescue | 434 | "European imports represent ~3% of UK adoptions annually" | Numerator and denominator? There is no single register of UK adoptions. | APHA; Dogs Trust / RSPCA published intake and rehoming figures |
| U4 | european-rescue | 76 | "Dogs enter through the Eurotunnel Pet Reception Centre at Calais" | Does this describe rescue transports? Commercial imports of live animals from the EU may currently enter GB at any point of entry; the Calais reception centre is a departure-side check for non-commercial pet travel through the tunnel. | APHA; Eurotunnel Le Shuttle |
| U5 | costs-and-preparation | 88 | "**DEFRA-licensed** road transport" | Defra does not license animal transporters. Transporter authorisations under Council Reg. (EC) 1/2005 are issued by APHA. Is "DEFRA-licensed" the organisation's own wording? | APHA transporter authorisation register |
| U6 | costs-and-preparation | 120 | "Tierschutzverein Europa e.V. offers documented pricing at €350 … plus flat-rate €100 transport" | Current as of when? All named-organisation prices in both guides are undated. | The organisations themselves |
| U7 | costs-and-preparation | 87–98 | Named prices for Spanish Stray Dogs, Santerpaws, Galgos del Sol, MISI's, Paws2Rescue, Project Galgo | Same as U6. Six organisations, six undated prices. | The organisations themselves |
| U8 | european-rescue | 186–198 | "Example: Dali Dog Rescue UK from Cyprus, £610" itemised inclusion list | Same as U6. | The organisation |
| U9 | costs-and-preparation | 330–348 | German Hundesteuer figures (Hamburg €90, Berlin €120, Munich €100–800), "€421 million in dog tax nationally in 2023" | Municipal rates change annually and vary by city; which year do these describe? | Individual city Steuerämter; Destatis for the national total |
| U10 | costs-and-preparation | 339–342 | Austria: "Annual registration in Vienna: €72", "minimum €725,000 coverage", "Hunde-Sachkunde courses €50-100" | The €72 and €725,000 figures match Vienna's published rules, but the guide calls €72 a "registration" fee when it is the Hundeabgabe (dog levy), and Sachkunde is required only for specific circumstances, not all new owners. | Stadt Wien (wien.gv.at); RIS for the Wiener Tierhaltegesetz |
| U11 | costs-and-preparation | 345–348 | Switzerland: "Annual dog tax CHF 100-200", "CHF 1 million minimum coverage", liability insurance "compulsory" | Dog tax and insurance obligations are cantonal, not federal — is CHF 1 million a federal minimum or one canton's? | Individual cantonal Veterinärämter; BLV for federal matters |
| U12 | why-rescue | 120, 292 | "Law 258/2013 permits municipal shelters to kill unclaimed dogs after 14 working days" | Is Law 258/2013 still in force in its 2013 form? | ANSVSA; Romanian Monitorul Oficial |
| U13 | why-rescue | 130, 133 | Turkey July 2024 law: "322 shelters with only 105,000 capacity", "2.7% public support (Metropoll survey)" | Are the capacity figures official, and is the Metropoll poll public? | Turkish Resmî Gazete; Metropoll |
| U14 | european-rescue | 490; why-rescue | "Romania exported 33,725 dogs in the first half of 2023" | Source and definition of "exported"? | ANSVSA; European Commission TRACES statistics |
| U15 | european-rescue | 101, 260, 298–304 | "14.8% of tested European rescue dogs … carried Leishmania", plus the babesiosis / heartworm / ehrlichiosis / Echinococcus / Linguatula percentages | These are attributed to "the 2020 UK study" and to "Norman et al., 2020, Veterinary Record" in different places. Are the disease percentages from that paper or from a different one? | The Veterinary Record paper; the University of Liverpool authors |
| U16 | european-rescue | 272–278 | Regional Leishmania prevalence: SE Spain 23.7%, Campania 14%, Mediterranean France 8.1–28%, Portugal 6.31% | "2022 Data" — which study? | The source publication |
| U17 | costs-and-preparation | 163 | "EU Pet Passports **valid for life** with current vaccinations" | Does the model passport under [Impl. Reg. (EU) 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng) retain open-ended validity? Only secondary sources were found. Separately, from 22 April 2026 the EU pet passport is restricted to owners resident in the EU — which is the more consequential fact and is missing entirely. | The competent authority of the issuing Member State; EUR-Lex text of 2026/705 |
| U18 | costs-and-preparation | 154 | AHC price "£150-£350" and "Border control fees: £35-£260 depending on airport" | Vet fees are unregulated and border fees vary; as of when? | Individual practices; the relevant BCP operators |

---

## Passages that read as legal advice rather than orientation

The editorial standard is that a guide orients and points to the competent authority. These
cross that line.

1. **`european-rescue-guide.mdx:60`** — "Here's what the law actually requires for dogs
   entering Great Britain from EU countries". A flat statement of legal requirements, in
   the guide's own voice, with no authority named and no link. It is also the wrong list
   (W3). This is the worst instance in the corpus: maximum authority claimed, minimum
   accuracy delivered.

2. **`european-rescue-guide.mdx:72`** — "Most organizations don't follow the correct
   procedures, creating legal grey areas. Choose organizations that comply with Balai
   Directive requirements." An allegation of widespread non-compliance by named third
   parties, plus an instruction to the reader to assess legal compliance themselves,
   against a repealed instrument.

3. **`european-rescue-guide.mdx:49`** — "European rescue adoption is legal and regulated."
   A blanket assurance about a category of transaction. Whether a particular movement is
   lawful depends on the organisation, the route and the paperwork.

4. **`european-rescue-guide.mdx:748`** — "**Verify legal compliance** — Proper
   documentation, licensed transport". Presented as a step the adopter can complete. An
   adopter cannot verify that an import is lawful, and framing it as their job shifts
   responsibility onto the person with the least information.

5. **`why-rescue-from-abroad.mdx:410, 433`** — "The solution: stronger regulation, enforced
   Balai compliance…" and "These have solutions. Enforce Balai Directive compliance."
   Policy advocacy in an orientation guide, addressed to a reader who cannot act on it.

6. **`costs-and-preparation.mdx:227, 683`** — "UK law requires restrained dogs" and
   "They're legally required" (W10). Stating a non-existent legal duty.

7. **`costs-and-preparation.mdx:209`** — "Pet insurance (required before arrival)" (also
   `european-rescue-guide.mdx:209`). Insurance is not legally required anywhere in the
   guides' target markets. Some organisations require it contractually. The distinction
   matters and is not drawn.

8. **Generalising from one country.** `costs-and-preparation.mdx:195` and
   `first-time-owner-guide.mdx:298` state "ID tag (legally required)" without qualification.
   This is true in Great Britain under the Control of Dogs Order 1992
   ([legislation.gov.uk](https://www.legislation.gov.uk/uksi/1992/901/made)) and is not a
   general European rule. The same applies to "Microchipping (£15-25, legally required)" at
   `costs-and-preparation.mdx:681`. Both guides address UK, German, Austrian and Swiss
   readers in the same breath.

---

## What is missing entirely

Not "claims", so not in the tables above, but the largest gaps for a 2026 reader.

- **The 22 April 2026 change itself.** No guide mentions it. A reader comparing these guides
  against a vet's or an authority's current advice will find them describing a superseded
  regime, which undermines everything else on the page.
- **Animal Welfare (Import of Dogs, Cats and Ferrets) Act 2025 (c. 30)**, Royal Assent
  2 December 2025. Section 1(3) requires that the first regulations made under it **must**
  prohibit bringing into the UK dogs under 6 months old, dogs more than 42 days pregnant,
  and dogs that have been mutilated (cropped ears, docked tails). Section 8 provides that
  sections 1–7 come into force "on such day as the Secretary of State may by regulations
  appoint" — so the Act is not yet in force, and no commencement regulations were found.
  ([s.1](https://www.legislation.gov.uk/ukpga/2025/30/section/1),
  [s.8](https://www.legislation.gov.uk/ukpga/2025/30/section/8)) This will change UK rescue
  adoption materially, and cropped-eared dogs are common in some source countries.
- **Brucella canis testing for Romania.** GOV.UK: "Dogs imported commercially from Romania
  must have a negative Brucella canis test result prior to import. **This includes rescue
  animals.**" Both guides discuss Romania at length; neither mentions it.
  ([gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules))
- **Approved Importer status.** Commercially importing dogs into GB from Romania, Ukraine,
  Belarus or Poland requires the importer to hold Approved Importer status. Same source.
  This is a concrete, checkable thing an adopter could actually ask a UK organisation about
  — unlike "Balai Directive compliance".
- **§ 11(1) Nr. 5 Tierschutzgesetz (Germany).** An organisation that brings vertebrate
  animals into Germany for transfer against payment, or brokers such transfers, needs a
  permit from the competent veterinary office.
  ([gesetze-im-internet.de](https://www.gesetze-im-internet.de/tierschg/__11.html)) For a
  German adopter this is the single most useful verification question available, and it
  appears nowhere.
- **Swiss specifics.** AMICUS registration within 10 days of entry, personal customs
  declaration, 8.1% VAT above CHF 300, and the fact that a dog transported by an
  organisation counts as a commercial import.
  ([blv.admin.ch](https://www.blv.admin.ch/de/reisen-heimtiere-hunde-katzen-frettchen),
  [bazg.admin.ch](https://www.bazg.admin.ch/de/mit-hund-und-katze-in-die-schweiz))
- **Country listing status of the source countries.** Under
  [Impl. Reg. (EU) 2026/636](https://eur-lex.europa.eu/eli/reg_impl/2026/636/oj/eng),
  Serbia, Bosnia and Herzegovina, Montenegro and the United Kingdom are in Annex II
  (listed, no rabies titration test required); Switzerland is in Annex I; **Turkey is not
  listed**, which is what actually drives the extra requirements the guide gestures at.
  ([food.ec.europa.eu country lists](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/listing-territories-and-non-eu-countries_en))
  This matters directly: 157 of the platform's currently available dogs come from Serbian
  organisations and 44 from Turkey.

A caution worth recording: the German ministry's own English-language third-countries page
(bmleh.de) still cited the repealed Regulation (EU) No 577/2013 when checked on 2026-08-28.
National authority pages are lagging too. Cite the EUR-Lex text or the Commission's
food.ec.europa.eu pages for the rules themselves, and the national authority for national
add-ons.

---
---

# Per-guide findings

## 1. `frontend/content/guides/european-rescue-guide.mdx`

**Word count:** 4,571 (762 lines)
**lastUpdated:** 2026-02-24 — predates the 22 April 2026 regime change.

### 1.1 Regulatory claims

| Claim as written | Location | Status | What it should say | Source |
| --- | --- | --- | --- | --- |
| "European rescue adoption is legal and regulated." | Callout, "Quick Summary", L49 | WRONG (as framing) | Do not assure the reader that a whole category is lawful. State that lawful routes exist, and that whether a particular movement uses one depends on the organisation. | — |
| "Requirements: microchip, rabies vaccine, health certificate." | Callout, L49 | OUTDATED | Incomplete for a rescue import. Add: origin in a registered/approved establishment, an official veterinarian's certificate, and IPAFFS (GB) or TRACES (EU) notification. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules); [Del. Reg. 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| "The old EU Pet Travel Scheme no longer applies" | "UK Pet Travel After Brexit", L58 | WRONG | GB still operates a pet travel scheme, and a pet passport issued in an EU country is still accepted for entry into GB. What changed is that a GB-issued passport is no longer valid for entry to the EU. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain); [gov.uk pet travel document](https://www.gov.uk/taking-your-pet-abroad/pet-travel-document) |
| "89% of rescue imports were using the wrong rules" | L58 | UNVERIFIABLE (U1) | No primary source found. Remove or attribute. | — |
| "Here's what the law actually requires for dogs entering Great Britain from EU countries" | L60, heading the bullet list | WRONG (W3) | This is the non-commercial list. A rescue dog changes owner and travels without the adopter, so GB commercial rules apply. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "Microchip: ISO-compliant chip implanted before rabies vaccination" | L64 | CORRECT | GOV.UK: "You must get your pet microchipped before, or at the same time as, their rabies vaccination." Note "or at the same time as" — the guide's "before" is stricter than the rule, which is safe but not exact. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "Rabies vaccination: … at least 21 days before travel" | L65 | CORRECT | GOV.UK: "at least 21 full days after the first vaccination". The dog must also be at least 12 weeks old at vaccination — worth adding, since it sets the floor on a puppy's arrival date. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "Tapeworm treatment: … 24 hours to 5 days before UK entry (dogs only)" | L66 | CORRECT | GOV.UK: "no less than 24 hours before" and "no more than 5 days (120 hours)". | [gov.uk tapeworm treatment](https://www.gov.uk/taking-your-pet-abroad/tapeworm-treatment-for-dogs) |
| "Documentation: EU Pet Passport (issued before 2021) or Animal Health Certificate for newer imports" | L67 | WRONG (W4) | For entry to GB, a pet passport issued in an EU country is accepted with no pre-2021 cut-off. An AHC is a GB-issued document for pets leaving GB. For a rescue dog neither applies — commercial rules do. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "IPAFFS notification: Import notification system (replaced EU TRACES) completed before arrival" | L68 | CORRECT | IPAFFS is required, and it replaced TRACES **for GB imports**. TRACES still operates inside the EU, so "replaced EU TRACES" reads as more final than it is. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules) |
| "Rescue dogs travel without their adopters—technically triggering stricter commercial protocols." | L72 | CORRECT | Right, and it is the most important sentence in the section. "Technically" undersells it; there is nothing technical about it. | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "Choose organizations that comply with Balai Directive requirements." | L72 | WRONG (W1) | Directive 92/65/EEC was repealed 21 April 2021. In GB, GOV.UK still calls the regime "Balai rules"; in the EU the term is dead. | [Reg. (EU) 2016/429](https://eur-lex.europa.eu/eli/reg/2016/429/oj/eng) |
| "Dogs enter through the Eurotunnel Pet Reception Centre at Calais." | L76 | UNVERIFIABLE (U4) | Live animals from the EU may currently enter GB at any point of entry. The Calais centre is a departure-side check for tunnel pet travel. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules) |
| "Non-compliance means quarantine (up to 4 months) or entry refusal." | L80 | CORRECT | GOV.UK: "Your pet may be put into quarantine for up to 4 months if you do not follow these rules - or refused entry if you travelled by sea." | [gov.uk/bring-pet-to-great-britain](https://www.gov.uk/bring-pet-to-great-britain) |
| "Germany and Austria, as EU members, follow standard EU Pet Passport regulations." | L84 | WRONG (W5) | For a change of ownership, 2020/688 as amended by 2026/133 applies: official veterinarian's health certificate, TRACES notification, registered establishment of origin. | [Del. Reg. 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| "Switzerland … maintains alignment through bilateral agreements requiring similar documentation plus specific Swiss entry procedures." | L84 | CORRECT | Switzerland is in Annex I of Impl. Reg. 2026/636 (territories applying the same rules as Member States). "Specific Swiss entry procedures" is right but empty — see W7 for what they are. | [country lists](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/listing-territories-and-non-eu-countries_en) |
| "ISO-compliant microchipping before rabies vaccination" (EU/CH list) | L88 | CORRECT | 2026/133 requires that the vaccination date not precede the date of identification. | [Del. Reg. 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| "Valid rabies vaccination certificates (minimum 21 days before travel)" | L89 | CORRECT | 2026/133: complete primary course at least 21 days before movement, animal at least 12 weeks old at vaccination. | [Del. Reg. 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| "EU Pet Passports for intra-EU movement" | L90 | OUTDATED | A passport is still required (2026/132, model at 2026/705), but for a rescue movement it accompanies a health certificate rather than replacing one. | [Del. Reg. 2026/132](https://eur-lex.europa.eu/eli/reg_del/2026/132/oj/eng) |
| "Dogs from non-EU countries like Turkey face … three-month quarantine periods after rabies blood titer testing" | L95 | WRONG (W6) | A three-month waiting period between blood sampling and movement, not quarantine. Sample at least 30 days post-vaccination; result ≥0.5 IU/ml. Turkey is not listed in either annex of 2026/636, which is why the titration applies. | [bringing a pet from a non-EU country](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en) |
| "Cross-border movement within Germany, Austria, Switzerland … No internal border checks exist" | L97 | WRONG (W7) | Switzerland is outside the EU veterinary and customs area: personal declaration at a staffed crossing, no QuickZoll, 8.1% VAT above CHF 300, cropped dogs barred. | [bazg.admin.ch](https://www.bazg.admin.ch/de/mit-hund-und-katze-in-die-schweiz) |
| "The system assumes trust in source country veterinary systems … vulnerability to fraudulent passports" | L101 | UNVERIFIABLE | Plausible and widely asserted, but no primary source found for a fraud rate. Presented as fact. | — |
| "14.8% of tested European rescue dogs in the UK study carried Leishmania infections" | L101, 260, Callout L104 | UNVERIFIABLE (U15) | Attribution shifts between "the 2020 UK study" and "Norman et al., 2020, Veterinary Record" without a citation. | — |
| Disease prevalence list (Babesiosis 1.3%, Heartworm 3.0%, Ehrlichiosis 5.7%, Echinococcus 1.0%, Linguatula 2.0%) | L298–304 | UNVERIFIABLE (U15) | Same. | — |
| Regional Leishmania prevalence, "2022 Data" | L272–278 | UNVERIFIABLE (U16) | No study named. | — |
| "Spain's 2022 animal welfare law" | L459, 464, 509 | WRONG (W8) | Ley 7/2023 of 28 March 2023, in force 29 September 2023. | [BOE](https://www.boe.es/eli/es/l/2023/03/28/7/con) |
| "hunting dogs (Galgos, Podencos) were specifically EXCLUDED" | L464 | WRONG (W9) | The exclusion covers hunting, guard and working dogs. | [BOE](https://www.boe.es/eli/es/l/2023/03/28/7/con) |
| "Greek law prohibits euthanasia of healthy strays." | L478 | UNVERIFIABLE | Greek Law 4830/2021 replaced the earlier framework. Which law, and does the prohibition survive in its current form? Ask the Greek Ministry of Rural Development. | — |
| "The law allows euthanasia after 14 working days." (Romania) | L486 | UNVERIFIABLE (U12) | — | — |
| "Follow Balai Directive for commercial movements (not just Pet Travel Scheme)" | Green flags, L541; Callout L555 | WRONG (W1) | — | [Reg. (EU) 2016/429](https://eur-lex.europa.eu/eli/reg/2016/429/oj/eng) |
| "Missing charity registration: Established organizations should have proper legal status in both source and destination countries." | L576 | CORRECT (as advice) | Sound, and checkable. Would be stronger naming the register: Charity Commission for England and Wales, OSCR for Scotland, the Vereinsregister for Germany. | — |

### 1.2 Prose quality notes

**a. The opening tells the reader what to feel before it tells them anything.**

> "Somewhere in Spain, a Galgo is chained in a shed, waiting for hunting season to end—and
> with it, likely, his life. In Romania, a street dog navigates traffic and poison traps. In
> Greece, a gentle mutt watches tourists come and go, hoping one will take her home."
> (L30)

A tricolon of invented vignettes, each with an em-dash or a participial tail. The guide then
says at L40 "This guide answers them with evidence, not emotion", which the preceding
paragraph disproves.

Suggested rewrite:

> Every year, thousands of dogs from Spain, Romania and Greece are adopted into homes in the
> UK, Germany, Austria and Switzerland. This guide covers what that involves: the paperwork,
> the journey, the health risks, and how to tell a careful organisation from a careless one.

**b. "Brexit complicated things."** (L58)

Three words of throat-clearing before a section that gets the law wrong. Cut it and lead with
the fact that matters:

> A rescue dog changes owner and travels without you. That makes it a commercial movement,
> not pet travel, and a different set of rules applies.

**c. Two sections restate each other.**

"The Legal Framework" (L54–105) and "Choosing a Reputable Organization → Proper legal
compliance" (L539–545) make the same four points about Balai, IPAFFS, health certificates
and transport licensing. The second adds nothing. Fold the checkable items into the green
flags list and delete the duplicate.

**d. Hedge stacking.**

> "Rescue dogs travel without their adopters—**technically** triggering stricter commercial
> protocols. **Most** organizations don't follow the correct procedures, creating legal
> **grey areas**." (L72)

Three softeners in two sentences, around a claim that is either true or defamatory.

Suggested rewrite:

> Because ownership transfers, the movement is commercial. Ask the organisation which
> route they use and to show you the paperwork. If they cannot, that is your answer.

**e. "It's biology, not magic."** (L424)

Nobody suggested magic. The sentence exists to close a paragraph rhythmically.

**f. Section closer at L760–762.**

> "The question isn't whether European rescue can work. The data proves it does. The question
> is whether it's right for *your* circumstances." … "Somewhere in Europe, a dog is waiting."

"The question isn't X, it's Y" followed by a callback to the opening vignette. Both are
persuasion devices in a guide that promised orientation. The preceding "Is European Rescue
Right for You?" checklist already does this work honestly; end on it.

### 1.3 Structural notes

- **Duplicate H1.** `GuideContent.tsx:147` renders `<h1>{frontmatter.title}</h1>`, and the
  MDX begins with `# European Rescue Guide: Everything You Need to Know` (L28). The MDX
  `h1` is not overridden in the `components` map at `GuideContent.tsx:31`, so after
  hydration the page has two `<h1>` elements. Affects all four guides.
- **The article body is not server-rendered.** `GuideContent.tsx:17` loads `MDXRenderer` with
  `dynamic(..., { ssr: false })`, while `src/app/guides/[slug]/page.tsx:12` sets
  `export const dynamic = "force-static"`. The served HTML for
  `/guides/european-rescue-guide` contains one `<h1>` and **zero** `<h2>` elements; the guide
  text is present only inside the `self.__next_f` RSC payload. Crawlers that do not execute
  JavaScript see the hero image, the title and the byline. Verified against production on
  2026-08-28.
- **Table of contents and heading anchors are client-only.** `GuideContent.tsx:74` builds the
  TOC from `document.querySelectorAll("article h2")` after a 100 ms timeout, and the `h2`
  `id`s are generated in the same file at L32–36. No `#anchor` deep link resolves before
  hydration, and none exists in the static HTML at all.
- **Anchor ids can end in a hyphen.** The slugifier is
  `children.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-")` with no trailing-hyphen
  trim. "Transport, Timeline, and Costs" → `transport-timeline-and-costs` (fine), but any
  heading ending in punctuation gains a trailing `-`. No heading in this guide is affected
  today; it is fragile rather than broken.
- **`seoMeta.canonical` in frontmatter is dead.** L23 declares
  `https://rescuedogs.me/guides/european-rescue-guide` (no `www`), while
  `src/app/guides/[slug]/page.tsx:60` emits
  `https://www.rescuedogs.me/guides/${slug}`. The frontmatter field is never read. Same in
  all four guides. Harmless today, but it is a second source of truth that disagrees with
  the first.
- **JSON-LD.** `GuideSchema.tsx` sets both `datePublished` and `dateModified` to
  `frontmatter.lastUpdated`, so the schema claims the guide was published and last modified
  on the same day. `dateModified` is accurate (2026-02-24 matches `git log`);
  `datePublished` is not, and there is no `articleBody`, which matters given the SSR gap
  above.
- **Dog queries.** All five `DogGrid` blocks in this guide resolve against the live API:
  `primary_breed="Galgo"` (L108) → 121 available dogs; `location_country="SR"` (L221) →
  157; `age_category="Adult" size="Medium"` (L343) → results; `primary_breed="Podenco"`
  (L442) → 81; `location_country="BA"` (L706) → 63. Note `"SR"` is the value the database
  uses for Serbia; the ISO 3166-1 code is `RS`. The query works because content and database
  share the same non-standard code.
- **Links.** All internal links (`/guides/why-rescue-from-abroad`,
  `/guides/costs-and-preparation`, `/dogs`) return 200.

---

## 2. `frontend/content/guides/costs-and-preparation.mdx`

**Word count:** 4,191 (742 lines)
**lastUpdated:** 2026-02-24

### 2.1 Regulatory claims

| Claim as written | Location | Status | What it should say | Source |
| --- | --- | --- | --- | --- |
| "Bulgarian rescues (Santerpaws): £430 … including … TRACES paperwork, and **DEFRA-licensed** road transport" | "Budget-friendly options", L88 | UNVERIFIABLE (U5) | Defra does not license animal transporters; APHA issues transporter authorisations under Council Reg. (EC) 1/2005. Either the organisation's wording or an error. | — |
| "What's typically included: … EU Pet Passport … TRACES/IPAFFS import documentation" | L100–110 | OUTDATED | The passport model changed on 22 April 2026 (Impl. Reg. 2026/705); certificate models changed under Impl. Reg. 2026/848, with old models issuable to 1 Oct 2026 and valid to 31 Mar 2027. | [Impl. Reg. 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng) |
| "Germany, Austria, and Switzerland benefit from intra-EU movement simplification." | "Continental Europe", L120 | WRONG | Switzerland is not in the EU and does not benefit from intra-EU simplification. Customs declaration, AMICUS registration and possible VAT apply. Germany and Austria do, but a change-of-ownership movement still needs a health certificate and TRACES notification. | [bazg.admin.ch](https://www.bazg.admin.ch/de/mit-hund-und-katze-in-die-schweiz); [Del. Reg. 2026/133](https://eur-lex.europa.eu/eli/reg_del/2026/133/oj/eng) |
| "EU Pet Passport (valid for life with current vaccinations)" | L127 | UNVERIFIABLE (U17) | Open-ended validity under Impl. Reg. 2026/705 not confirmed from a primary source. Separately, from 22 April 2026 the EU pet passport is restricted to owners resident in the EU. | [Impl. Reg. 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng) |
| "Each EU trip requires a fresh Animal Health Certificate from an Official Veterinarian at £150-£350, **valid only 10 days before departure**" | "Post-Brexit Documentation Costs", L154 | OUTDATED | One AHC per trip to the EU is correct. But the validity is 10 days for entry into the EU, then **6 months** for onward travel within the EU and 6 months for re-entry to Great Britain. This was 4 months previously. "Valid only 10 days" implies a fresh certificate is needed for each leg. | [gov.uk pet travel document](https://www.gov.uk/taking-your-pet-abroad/pet-travel-document) |
| "Continental European residents maintain advantage of EU Pet Passports valid for life … costing just €20-€100" | L163 | UNVERIFIABLE (U17) | The comparative advantage is real and got sharper on 22 April 2026, when the passport became restricted to EU residents. Say that instead of "valid for life". | [bringing a pet from a non-EU country](https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en) |
| "ID tag (legally required): £3-10" | Supplies checklist, L195 | CORRECT for GB only | Control of Dogs Order 1992 requires a collar bearing the owner's name and address in a highway or place of public resort, in England, Wales and Scotland. Not a general European rule; this guide addresses Germany, Austria and Switzerland too. | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/1992/901/made) |
| "Proper car restraint … **UK law requires restrained dogs**" | L227 | WRONG (W10) | Highway Code rule 57 is advisory. Breaking an advisory rule is not itself an offence, though it may be used in evidence to establish liability. | [rule 57](https://www.gov.uk/guidance/the-highway-code/rules-about-animals-47-to-58) |
| "Dog tax (Hundesteuer): €90-186 annually … Hamburg €90, Berlin €120, Munich €100-800. Germany collected €421 million in dog tax nationally in 2023." | L332–336 | UNVERIFIABLE (U9) | Municipal rates, undated. | Individual city Steuerämter; Destatis |
| "Liability insurance (Hundehaftpflicht): €2.50-15 monthly, **mandatory in many states**" | L333 | CORRECT (imprecise) | Right in substance — it is a Länder matter, mandatory in some, not others. "Many" is doing a lot of work; naming two or three Länder would help more. | — |
| "Austria requires: Annual registration in Vienna €72; mandatory liability insurance €50-150 annually with minimum €725,000 coverage; Hunde-Sachkunde courses for new owners €50-100" | L340–342 | UNVERIFIABLE (U10) | €72 and €725,000 match Vienna's published figures, but €72 is the Hundeabgabe (a levy), not a registration fee, and Sachkunde is not required of every new owner. | [wien.gv.at](https://www.wien.gv.at/zusammenleben/hundehaltung-vorschriften) |
| "Switzerland mandates: Annual dog tax CHF 100-200 varying by canton; compulsory liability insurance CHF 100-200 annually with CHF 1 million minimum; Microchipping and AMICUS national database registration" | L346–348 | UNVERIFIABLE (U11) | Microchipping and AMICUS are federal and correct. Dog tax and insurance are cantonal — "CHF 1 million minimum" is presented as national. | [blv.admin.ch](https://www.blv.admin.ch/de/reisen-heimtiere-hunde-katzen-frettchen) |
| "German veterinary costs follow GOT-Satz official fee schedule with 1x to 4x multipliers" | L375 | CORRECT (structure) | The Gebührenordnung für Tierärzte does work on multipliers. The euro figures beneath it are undated. | — |
| "Microchipping (£15-25, **legally required**)" | L681 | CORRECT for GB only | Compulsory in England, Scotland and Wales. Presented without qualification to a four-country audience. | — |
| "Car restraints or crates aren't optional. **They're legally required**" | L683 | WRONG (W10) | Advisory. Also contradicts the same guide's softer wording at L227 within the same document. | [rule 57](https://www.gov.uk/guidance/the-highway-code/rules-about-animals-47-to-58) |

### 2.2 Prose quality notes

**a. The opening leans on a shock statistic that is never sourced.**

> "Every year, over one million pets are surrendered—many because their owners couldn't
> afford unexpected costs. This guide exists so that doesn't happen to you." (L30)

"Over one million" with no country and no source, then a promise the guide cannot keep.

Suggested rewrite:

> Adoption fees are the smallest cost of owning a dog. This guide sets out what the next
> twelve to fifteen years cost, so you can decide before the dog arrives rather than after.

**b. "98% of pet owners underestimate lifetime costs."** (L44, repeated at
`first-time-owner-guide.mdx:810`)

Used twice across the corpus as a `<Stats>` headline, never sourced. A figure this round
and this high should carry a citation or go.

**c. "Here's a secret pet stores won't tell you: dogs don't recognize brands."** (L222)

Conspiratorial framing for an obvious point.

Suggested rewrite:

> A £5 stainless steel bowl works as well as an £80 ceramic one, and is easier to keep clean.

**d. Manufactured drama.**

> "It's 2am. Your dog is vomiting blood. You rush to the emergency vet. This is when
> preparation matters most—or when its absence becomes devastating." (L405)

Second person present tense, then an em-dash antithesis. The £269 figure in the next
paragraph is the useful part and does not need the setup.

Suggested rewrite:

> A January 2025 UK survey put the average emergency consultation at £269, before any
> treatment. Hospitalisation runs £100-300 a night.

**e. The savings section overpromises.**

> "How to Save £11,000-62,000 Over Your Dog's Lifetime" (L553) and "DIY Grooming: Save
> £4,000-20,000" (L558)

The £4,000-20,000 grooming figure assumes a coat needing professional trimming every 4-8
weeks for fifteen years, then the guide notes at L582 that this does not apply to short-coated
breeds — which includes Galgos, the breed the guide most often recommends. The headline
number does not apply to the typical reader of this site.

**f. The same figures appear in three different forms.**

Lifetime cost is given as "£10,000-£20,000" (L32), "£10,000-15,000 / £12,000-20,000 /
£15,000-30,000+" by size (L505-507), "£10,000-£30,000" in a `<Stats>` block (L511), and
"£10,000-20,000 over 12-15 years" (L713). `first-time-owner-guide.mdx:64` gives
"£16,000-£33,000". A reader comparing the two guides finds a £13,000 gap with no explanation.

### 2.3 Structural notes

- **Broken dog query (W11).** `<DogGrid breed_type="sighthound" ... />` at L165–169. The API
  returns HTTP 422: `Invalid breed_type value: sighthound. Must be one of: purebred, mixed,
  crossbreed, unknown`. `DogGrid.tsx` catches this and renders the red "Unable to load dogs.
  Please try again later." box. The caption promises "Sighthounds like Galgos and Podencos",
  so the reader sees a failure exactly where the guide is trying to build confidence.
  `primary_breed="Galgo"` or `primary_breed="Podenco"` both return results.
- **Other dog queries resolve.** `size="Medium"` (L350) and `status="available"` (L545, L740)
  return results.
- **Duplicate H1.** Frontmatter title *Costs and Preparation: Financial Guide to European
  Rescue Adoption* renders as `<h1>`; MDX L28 is `# Costs and Preparation: Financial Guide`.
  Two H1s, and they are not even the same string — the `<title>`, the JSON-LD `headline` and
  the visible page heading say one thing, the second H1 says another.
- **`readTime: 11`** for 4,191 words implies 380 wpm. The other guides sit around 380-410 wpm
  too, so the field is consistently optimistic rather than wrong in one place.
- **Dead `seoMeta.canonical`** (L23), same as the other guides.
- **JSON-LD** `datePublished` and `dateModified` both 2026-02-24, same issue as guide 1.
- **Tables.** Two Markdown tables (L527–541, L717–725). `GuideContent.tsx` maps `h2`, `p`,
  `ul`, `ol`, `a`, `code` but not `table`, `thead`, `th` or `td`, so tables fall back to Tailwind
  Typography defaults. They render, but there is no `overflow-x: auto` wrapper — worth
  checking on a narrow viewport.

---

## 3. `frontend/content/guides/why-rescue-from-abroad.mdx`

**Word count:** 2,710 (443 lines)
**lastUpdated:** 2026-02-24

### 3.1 Regulatory claims

| Claim as written | Location | Status | What it should say | Source |
| --- | --- | --- | --- | --- |
| "Spain's **2023** Animal Welfare Law prohibits euthanasia of healthy dogs in shelters with fines up to €100,000—but explicitly excludes hunting and working dogs" | "Spain: The Galgo Crisis", L114 | CORRECT | Ley 7/2023 of 28 March 2023, in force 29 September 2023; excludes *perros de caza, guarda y de trabajo*. This is the accurate version; `european-rescue-guide.mdx:459,464,509` says 2022 and omits guard/working dogs. | [BOE](https://www.boe.es/eli/es/l/2023/03/28/7/con) |
| "prohibits euthanasia of healthy dogs in shelters" | L114 | OUTDATED (imprecise) | Ley 7/2023 bans killing for economic reasons or lack of space; euthanasia on veterinary grounds remains lawful. "Prohibits euthanasia of healthy dogs" is close but blurs that. | [BOE](https://www.boe.es/eli/es/l/2023/03/28/7/con) |
| "The population exploded after 2004 legislative changes repealed euthanasia restrictions." (Romania) | L118 | UNVERIFIABLE | Which instrument? | Monitorul Oficial |
| "Law 258/2013 permits municipal shelters to kill unclaimed dogs after 14 working days." | L120, 292 | UNVERIFIABLE (U12) | Is Law 258/2013 still in force in this form? | ANSVSA; Monitorul Oficial |
| "Greece prohibits killing healthy dogs but maintains 3+ million strays" | L126 | UNVERIFIABLE | Greek Law 4830/2021 replaced the earlier framework. Which law, and does the prohibition survive? The 3 million figure is also unsourced and conflicts with "1 million" at `european-rescue-guide.mdx:474`. | Greek Ministry of Rural Development and Food |
| "Turkey's July 2024 law: 4 million homeless dogs versus 322 shelters with only 105,000 capacity" | L130, Callout L133 | UNVERIFIABLE (U13) | — | Resmî Gazete |
| "2.7% public support (Metropoll survey)" | Callout L133 | UNVERIFIABLE (U13) | — | Metropoll |
| "Bulgaria's 2008 Animal Protection Law prohibits killing for population control, mandating lifetime kenneling instead" / "Italy's Law 281/91" | L296 | UNVERIFIABLE | Both are real instruments, but neither was checked against a current consolidated text. | Bulgarian Darzhaven Vestnik; Italian Gazzetta Ufficiale |
| "**Use Balai Directive for commercial movements** (not Pet Travel Scheme)" | "What Reputable Organizations Do", L369 | WRONG (W2) | Directive 92/65/EEC repealed 21 April 2021. Replace with the checkable GB facts: IPAFFS notification, origin in registered/approved premises, Approved Importer status for Romania/Ukraine/Belarus/Poland, negative *Brucella canis* test for Romanian dogs including rescues. | [Reg. (EU) 2016/429](https://eur-lex.europa.eu/eli/reg/2016/429/oj/eng); [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules) |
| "Provide TRACES/IPAFFS documentation" | L370 | CORRECT | TRACES for EU destinations, IPAFFS for GB. The slash implies they are interchangeable; they are not. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules) |
| "Import from officially registered premises" | L371 | CORRECT | GOV.UK: animals under Balai rules "must be imported to Great Britain from premises that are either registered or approved by competent authorities". Matches 2026/133 for intra-EU movement too. | [gov.uk Balai rules](https://www.gov.uk/guidance/import-live-animals-and-germinal-products-to-great-britain-under-balai-rules) |
| "14.8% test positive for Leishmania among tested imported dogs" | L378 | UNVERIFIABLE (U15) | — | — |
| "Using Pet Travel Scheme instead of Balai Directive (**89% of imports incorrectly use PETS**)" | Red Flags, L402 | WRONG + UNVERIFIABLE (W2, U1) | Instrument name wrong; percentage unsourced. | — |
| "The solution: stronger regulation, enforced Balai compliance, required Mediterranean disease testing" | L410 | WRONG (W2) | — | — |
| "These have solutions. Enforce Balai Directive compliance." | L433 | WRONG (W2) | — | — |
| "Doesn't include Mediterranean disease panel (**not needed for UK dogs**)" | L254 | CORRECT | Leishmania is not endemic in the UK. Worth noting that a UK dog that has travelled may still warrant testing, but as written it is right. | — |
| "European rescue organizations can match adopters within 2-3 weeks from application to dog arrival" | L77 | WRONG (internally) | `european-rescue-guide.mdx:143` says "Expect 6-10 weeks", with 3-4 weeks as the *fastest possible*. The FAQ repeats the 2-3 week figure. Three surfaces, two incompatible numbers, and the optimistic one is the one shown to the least-committed reader. | — |
| "Return rates for international adoptions (1-5%) fall below UK domestic rescue returns (~20%)" | L171 | UNVERIFIABLE | The ~20% domestic figure is sourced at `european-rescue-guide.mdx:374` to "US national data: 7-20%". A US upper bound is being used as a UK comparator. | — |

### 3.2 Prose quality notes

**a. The regulation section argues a policy case at a reader who came for orientation.**

> "The real questions are operational: How do we ensure legal import frameworks? Verify
> health screening? Distinguish reputable organizations from questionable ones? Support
> adopters with realistic expectations? Fund CNVR in source countries?" (L431)
>
> "These have solutions. Enforce Balai Directive compliance. Require Mediterranean disease
> testing. Verify charitable registration and transparent finances. Provide post-adoption
> behavioral support. Direct fees toward source country sterilization." (L433)

Two stacked five-item lists, the second answering the first, addressed to a policymaker who
is not reading this. And the first item in the answer list names a repealed directive.

Suggested rewrite:

> There are things an adopter can check. Ask which import route the organisation uses. Ask
> to see the health certificate and the disease test results. Ask for their charity
> registration number in both countries. An organisation that answers all three plainly is
> telling you something; one that does not is telling you something else.

**b. Restating the section above in different words.**

The "Summary" (L414-437) repeats the supply-and-demand figures from L79-87, the success rates
from L158-171, the cost comparison from L232-268 and the carbon figures from L316-323. Every
number in the summary already appeared. The one thing the summary adds — the framing that
local and international adoption serve different populations — is already the opening claim
at L38.

**c. Numbers presented with unearned precision.**

> "Romania: 500,000-2 million stray population" (L81) … "Today: 500,000-2 million estimated
> strays." (L122) … "2 million stray dogs in Romania face euthanasia or street life" (L31)

A range spanning a factor of four, then the top of that range stated flatly as fact in the
opening line. `european-rescue-guide.mdx:484` gives "500,000-600,000" for the same country.

**d. "Read that again."**

> "Read that again: **one million stray dogs. Three hundred domestic adoptions annually.**"
> (`european-rescue-guide.mdx:476`, and this guide's L126 makes the same move with 3 million)

Instructing the reader to be impressed.

### 3.3 Structural notes

- **Broken dog query.** `<DogGrid age_category="Adult" location_country="BG" limit={4} />`
  at L221–226 returns **0 results** from the live API. The reader sees the empty-state box:
  "Currently no dogs available matching these criteria." with a link to `/dogs`. There are 82
  available Bulgarian dogs; the `age_category="Adult"` combination is what empties it. The
  caption "Adult Bulgarian street dogs available for adoption" contradicts what renders.
- **Empty-state link is wrong for these queries.** `DogGrid.tsx:161` builds the fallback link
  as `/breeds/${breed}` using the `breed` prop. Guides pass `primary_breed`, never `breed`,
  so the fallback always degrades to `/dogs` and the message always reads "Currently no dogs
  available matching these criteria". Correct, but it means a breed-specific empty state can
  never link to the breed page.
- **Other dog queries resolve.** `location_country="SR" status="available"` (L89) → 157;
  `primary_breed="Galgo"` (L142) → 121; `status="available"` (L353) → results.
- **Duplicate H1**, **client-only body render**, **client-only TOC**, **dead
  `seoMeta.canonical`**, **`datePublished` = `dateModified`** — all as described for guide 1.
- **`readTime: 9`** for 2,710 words is 301 wpm, the most realistic of the four.
- **Internal links** to `/guides/european-rescue-guide`, `/guides/first-time-owner-guide` and
  `/dogs` all return 200.

---

## 4. `frontend/content/guides/first-time-owner-guide.mdx`

**Word count:** 6,198 (873 lines)
**lastUpdated:** 2026-02-24

This is the longest guide and has the least regulatory content. Its problems are sourcing and
length, not law.

### 4.1 Regulatory claims

| Claim as written | Location | Status | What it should say | Source |
| --- | --- | --- | --- | --- |
| "ID tag (legally required): £3-10" | Supplies, L298 | CORRECT for GB only | Control of Dogs Order 1992, England/Wales/Scotland. This guide names Spain, Portugal, Romania and Bulgaria as source countries and does not say which country's law it means. | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/1992/901/made) |
| "In the UK, all veterinarians must hold Royal College of Veterinary Surgeons (RCVS) registration. Verify at rcvs.org.uk." | L365 | CORRECT | Right, and a good example of what the rest of the corpus should do: state the rule, name the authority, link it. | [rcvs.org.uk](https://www.rcvs.org.uk) |
| "Clomipramine (Clomicalm) and Fluoxetine (Prozac) are **FDA-approved** for canine separation anxiety at 1-2 mg/kg every 12 hours" | L726 | WRONG (jurisdiction) | The FDA is a US regulator. For a guide addressed to UK, German, Austrian and Swiss readers, the relevant authorisations come from the VMD (UK) and the EMA/national agencies. The dosing figure should not be in a consumer guide at all — it invites self-medication of a prescription-only product. | — |
| "**Dog training is 100% unregulated** in the US, Canada, and much of Europe." | L730 | CORRECT | True and useful. "100%" is redundant on "unregulated". | — |
| "Estimated 50,000-100,000 Spanish Galgos face abandonment or death annually" | L36, 573, Callout L575 | UNVERIFIABLE | Same figure as the other two guides, sourced in none of them. | — |
| "research published in PMC shows **98%** of rescue dog owners report successful adjustment at six months" (L38) vs. "at 180 days, **100%** of owners indicated their dog adjusted extremely or moderately well" (L687, `<Stats value="100%" />` L690) | L38, L687–691 | UNVERIFIABLE + internally inconsistent | Two different numbers for the same finding, 650 lines apart, both attributed to "PMC" — which is a repository, not a source. Name the paper. | — |
| "Children under 5 … accounts for **77% of dog bites** according to CDC data" | L123 | UNVERIFIABLE | The CDC is a US source being applied to European households, and 77% of all dog bites being attributable to under-5s is implausible on its face; the underlying finding is likelier about bite severity or facial bites within that age group. | US CDC |
| "Most shelter surrenders occur between 12-18 months according to **Cesar's Way** research" | L237 | UNVERIFIABLE | Cesar's Way is a commercial content brand, not a research body. Also sits oddly in a guide that tells readers at L385 to avoid dominance-theory trainers. | — |
| "**Walkin' Pets** recommends trained senior dogs for inexperienced owners" | L249 | UNVERIFIABLE | A pet-products retailer cited as an authority on adopter matching. | — |
| "According to **Minnesota Greyhound Rescue**, these breeds make good first-time owner matches" | L178 | UNVERIFIABLE | A single US rescue organisation cited for a general claim. The brief for this audit excludes rescue org pages as sources; the guide is using one. | — |
| "According to **CareCredit** data, emergency vet visits alone run £96-236" | L91 | UNVERIFIABLE | CareCredit is a US medical-credit lender quoting US dollars; the figures have been converted to sterling and presented as UK costs. | — |
| "**5.8 million** dogs and cats entered shelters in 2024. Of those, **29%** were owner surrenders." | L802 | UNVERIFIABLE | US figures (Shelter Animals Count scale) with no country named, in a guide about European adoption. | — |
| "Lifetime costs of £16,000-£33,000+ … according to PDSA and **University of Pennsylvania** studies" | L74, 798 | UNVERIFIABLE | A US university's figures blended with a UK charity's into one sterling range. `costs-and-preparation.mdx:32` gives £10,000-£20,000 for the same thing. | — |
| "£18,478-**€55,132** (€21,620-€64,505) over 15 years" | L798 | WRONG (typo) | The first range mixes a sterling figure with a euro figure: `£18,478-€55,132`. Should be `£`. | — |
| "Foreign body obstruction surgery: £1,500-5,000 (**€1170**-€5,850)" | L792 | WRONG (typo) | €1,170 is the conversion of £1,000, not £1,500. The same line at L87 gives €1,755 correctly. Repeated at L793. | — |
| "Mixed breeds live longer (13.1 years average versus 11.9 for purebreds)" | L191 | UNVERIFIABLE | No study named for a specific two-decimal claim. | — |
| "German Shepherds rank 3rd in canine intelligence according to Stanley Coren's research, learning tasks after only 5 repetitions with 95% first-command obedience" | L222 | UNVERIFIABLE | Coren's ranking is a survey of obedience-trial judges, not a measure of intelligence. Presenting "5 repetitions / 95%" as a property of the breed overstates what that survey established. | — |
| "**RSPCA research suggests 8 in 10 dogs find it hard to cope when left alone**" | L705 | UNVERIFIABLE | Named organisation, no study. | — |
| "Research shows pets from organizations are surrendered **40% less often** … and pet-owning tenants stay **46 months versus 18 months**" | L827 | UNVERIFIABLE | The tenancy figure is from US landlord research. Presented without country. | — |

### 4.2 Prose quality notes

**a. The guide is 6,198 words and says several things twice.**

The supplies checklist at L281-333 duplicates `costs-and-preparation.mdx:177-218` almost
item for item and price for price. The 3-3-3 rule at L410-494 duplicates
`european-rescue-guide.mdx:632-664`. The Galgo trauma background at L565-573 duplicates
`european-rescue-guide.mdx:454-472` and `why-rescue-from-abroad.mdx:104-114`. Three guides,
one set of facts, three chances to drift out of sync — which they have.

**b. Opening restates the costs guide's opening.**

> "Every year, over a million pets enter shelters because their owners weren't prepared."
> (L30)

versus `costs-and-preparation.mdx:30`: "Every year, over one million pets are surrendered—many
because their owners couldn't afford unexpected costs."

Same unsourced statistic, same sentence shape, two guides, and a reader who follows the
"Related Guides" link hits it twice.

**c. "But here's the truth."** (L30)

> "Most underestimated the time, money, or lifestyle changes required. But here's the truth:
> first-time owners can succeed with rescue dogs…"

A tricolon followed by a truth-announcement. Cut both.

Suggested rewrite:

> First-time owners do well with rescue dogs when they know what the first year asks of them.
> This guide sets out the time, the money and the adjustment period, so you can decide before
> you apply.

**d. "The reality behind the romance."** (L32)

A section heading that promises a puncturing and then delivers accurate, useful content that
did not need the framing.

**e. Prescription drug dosing in a consumer guide.**

> "Clomipramine (Clomicalm) and Fluoxetine (Prozac) are FDA-approved for canine separation
> anxiety at **1-2 mg/kg every 12 hours**." (L726)

Suggested rewrite:

> Some dogs with severe separation anxiety are prescribed medication alongside behaviour
> work. That is a decision for your vet, and in complex cases a veterinary behaviourist.

**f. The conclusion asserts a number the guide itself contradicts.**

> "And that **100% owner satisfaction rate at six months** reflects something real" (L857)

The guide's own opening (L38) says 98%. A conclusion is the wrong place to round a disputed
figure up to certainty.

### 4.3 Structural notes

- **Dog queries all resolve.** `primary_breed="Galgo"` (L162) → 121;
  `age_category="Senior"` (L271) → results; `age_category="Adult" size="Medium"` (L550) →
  results; `status="available"` (L869) → results.
- **Currency typos.** L792 `€1170`, L793 `€1170`, L798 `£18,478-€55,132`. See table above.
- **`readTime: 15`** for 6,198 words is 413 wpm, the most optimistic of the four. At a more
  usual 220-250 wpm this guide is a 25-28 minute read.
- **Duplicate H1**, **client-only body render**, **client-only TOC**, **dead
  `seoMeta.canonical`**, **`datePublished` = `dateModified`** — all as described for guide 1.
- **`<Callout>` at L76 and L180 have no `type` heading text**, unlike the callouts in the
  other three guides which open with a bolded label. Minor inconsistency in how the component
  is used across the corpus.
- **No `relatedGuides` entry points back to this guide from `why-rescue-from-abroad`**, whose
  `relatedGuides` are `european-rescue-guide` and `first-time-owner-guide` (L18-20) — that
  one is fine. Checked all four: the graph is complete and every slug resolves.

---

## 5. Regulatory and process claims outside `/guides`

A search across `frontend/src` for regulatory vocabulary (`pet passport`, `rabies`,
`microchip`, `IPAFFS`, `TRACES`, `Balai`, `DEFRA`, `Animal Health Certificate`, `quarantine`,
`titre`, `576/2013`, `577/2013`, `tapeworm`) found matches in only one non-guide file.
Breed pages, organisation pages, dog detail pages, JSON-LD components and metadata carry no
regulatory claims.

### `frontend/src/app/faq/FaqClient.tsx`

| Claim as written | Location | Status | What it should say | Source |
| --- | --- | --- | --- | --- |
| "European rescue adoption fees typically range from €350-€750, which includes transport … This covers neutering, vaccinations, microchip, **EU passport**, Mediterranean disease testing, health certificates, and transport" | L55, "How much does it cost to adopt a rescue dog?" | OUTDATED | The passport model changed on 22 April 2026 (Impl. Reg. 2026/705) and the certificate models under Impl. Reg. 2026/848. Naming "EU passport" as a deliverable will confuse an adopter holding a new-model document. | [Impl. Reg. 2026/705](https://eur-lex.europa.eu/eli/reg_impl/2026/705/oj/eng) |
| "Most fees cover: … microchipping with **EU registration**, **EU Pet Passport**, … veterinary health certificate, official documentation" | L65, "What's included in the adoption fee?" | OUTDATED | There is no single "EU registration" for microchips; registration is national. From 1 January 2028, [Del. Reg. 2026/132](https://eur-lex.europa.eu/eli/reg_del/2026/132/oj/eng) requires new identification codes to begin with the ISO 3166 country code of the Member State of initial identification. | [Del. Reg. 2026/132](https://eur-lex.europa.eu/eli/reg_del/2026/132/oj/eng) |
| "European rescue organizations can often match you with a dog within **2-3 weeks** from application to arrival." | L70 | WRONG (internally) | `european-rescue-guide.mdx:143` says 6-10 weeks, with 3-4 weeks as the best case requiring completed vaccinations and immediate transport. The FAQ gives the best case as typical, to the reader with the least context. | — |
| "Requirements vary by organization, but typically include: a secure garden for some dogs, time for a settling-in period, and home check approval." | L75 | CORRECT | Correctly framed as organisational, not legal. This is the tone the guides should use. | — |
| "Research shows **97%** of international rescue adoptions succeed long-term" | L84 | UNVERIFIABLE (U15) | Same underlying study as the guides; unsourced here too. | — |
| "a remarkable 97% retention rate (based on a **University of Liverpool study of 3,080 adopters**)" | L89 | UNVERIFIABLE (U15) | The most specific attribution anywhere on the site — more specific than either guide. Worth propagating the citation upward rather than leaving it buried in an FAQ answer. | — |

**Note:** the FAQ is a plain React component with no JSON-LD `FAQPage` schema, despite
`FAQ_SECTIONS` being a clean question/answer structure. Not a regulatory finding, but the
data is already in the right shape.

---

## Appendix: verification method

- **Primary sources only.** EUR-Lex (ELI URLs), food.ec.europa.eu, gov.uk,
  legislation.gov.uk, gesetze-im-internet.de, blv.admin.ch, bazg.admin.ch, wien.gv.at,
  boe.es. All 25 cited URLs returned 200 or 202 when checked on 2026-08-28 (EUR-Lex ELI URLs answer 202).
- **Not used as sources:** rescue organisation pages, blogs, forums, Reddit, pet-travel
  commercial sites, and — importantly — the guides themselves. Several search tools returned
  this repository's own MDX files as corroboration for claims made in those same files. Any
  claim whose only support was circular is marked UNVERIFIABLE.
- **Dog queries** were tested against the live API at `https://api.rescuedogs.me/api/animals/`
  and cross-checked against the production database. Note the API requires the trailing
  slash; without it every request 307s.
- **Rendering claims** were verified against the production HTML at
  `https://www.rescuedogs.me/guides/european-rescue-guide` and the local `.next` build output.
- **No source file was modified.**
