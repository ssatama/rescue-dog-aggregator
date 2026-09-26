# Epic #484: UX refresh (2026) - decisions and working rules

Companion to GitHub epic [#484](https://github.com/ssatama/rescue-dog-aggregator/issues/484)
(issues #485-#506, in dependency order). The epic body holds the rules and the
"How to continue" runbook; this file holds the decisions behind them and the
merge rules, so any session (laptop or cloud) can pick up the epic without
re-asking. These were settled in conversation with the maintainer; don't
re-litigate them.

## Background

UX audit done 2026-09-24 across desktop, mobile (390px) and tablet (820
portrait / 1180 landscape). Proposal with mockups:
https://claude.ai/artifact/Y1XvjoAbuEBHg72p1G3MGv (private to the owner; read
it with the Artifact tool, not WebFetch).

Principles: the goal is the adoption click; finding a suitable dog must be
effortless; dogs and the rescues are the centre; privacy first; free forever.

## Product decisions

- **Location.** Browsing all dogs stays possible and is the default. The
  geo-detected country (Vercel IP country header, read per request, never
  stored) may preselect "I live in" and only *labels* dogs "Adoptable to you".
  Filtering to adoptable dogs is an explicit opt-in switch (remembered in the
  browser), plus an "Anywhere" option. Never silently hide dogs by location.
- **Swipe** is demoted on desktop (no longer the loudest nav CTA); it fits
  mobile.
- **Mobile home stays dogs-only**, no rescue-organization section; orgs are
  reachable via nav.
- **No fee or adoption-process block**: rescues don't publish fees
  consistently.
- **Never say "adopted" or "found a home".** Adoption can't be detected; dogs
  just vanish from rescue sites. The wording is "no longer listed".
- **Full facelift on every page**, not only the mocked-up ones (breeds, swipe,
  rescue pages, landing pages, static pages). Fix small nits too (e.g. the
  "Age Unknown" filter).
- **Typography:** Bricolage Grotesque (display) + Figtree (body), replacing
  Inter.
- **Missing data is left out, not apologised for** (see the epic's rules).

## Photos

"Images are everything": galleries are top priority.

- Galleries are stored as `animals.images` JSONB, a list of
  `{url, original_url, width, height}` objects. The legacy `animal_images`
  table on Railway is empty and unused.
- Multi-photo rescues (inventory 2026-09-24): Dogs Trust (2-11), Tierschutzverein
  Europa (13-28), MISIs (11-33), Santer Paws (3-18), Animal Rescue Bosnia (~6),
  Daisy Family (6-11), The Underdog (~14-20), Woof Project (~5). Single photo
  only: Many Tears, Pets in Turkey, REAN (list-page sites). About 90% of active
  dogs can get a gallery.
- Photo quality varies widely (resolution, aspect, framing). Design for the
  worst case: no upscaling, blurred fill for odd shapes, a quality floor at
  scrape time.

## Merge rules for this epic

The maintainer authorized (2026-09-24) merging epic PRs without waiting for
them, which overrides step 8 of the runbook ("the user merges"):

1. Open the PR, run `/code-review`, fix the findings, wait for every CI check
   to go green, then squash-merge and tick the box on #484, then start the
   next issue.
2. Never merge with failing checks or unresolved medium-or-worse findings.
3. Once a review round finds **only low-severity** issues, merge and file
   those as follow-ups on the issue. Don't loop reviews until empty (#513 took
   nine rounds that way).
4. PostHog went live 2026-09-24, so no saved insights or baselines in
   PostHog; that part of #485 was waived. Compare the
   `dog_viewed -> adoption_link_clicked` funnel with
   `scripts/posthog-funnel.sh` instead.

## Gotchas

- In the chrome-devtools MCP, `click` under touch emulation doesn't open the
  mobile filter drawer; a JS `.click()` does. The drawer works; don't report
  it as broken.
- Check layouts at 390, 820, 1180 and 1440px in light and dark:
  `node scripts/visual-check.cjs <paths>` screenshots all eight views and
  reports overflow and console errors.
