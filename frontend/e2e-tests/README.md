# End-to-end tests

Playwright tests covering the journeys that unit tests cannot: real navigation,
real rendering, real network failures.

**These do not run in CI.** They are a local pre-merge check for changes that
touch routing, page shells, or the adoption flow.

## Running

```bash
pnpm e2e:install          # one-time browser download
pnpm dev                  # tests expect a dev server

pnpm test:e2e:critical    # @critical only - the usual loop
pnpm e2e                  # everything, default config
pnpm e2e:ui               # interactive runner, best for debugging a failure
pnpm e2e:headed           # watch it drive a real browser
pnpm e2e:report           # open the last HTML report
```

## Specs

All live in `tests/`. Files ending `.spec.ts.eliminated` are deliberately
disabled - they are not picked up by any config.

| Spec | Covers |
| --- | --- |
| `smoke.spec.ts` | Home and core pages render |
| `end-to-end-adoption-journey.spec.ts` | Browse to adoption-link flow |
| `deep-link-navigation.spec.ts` | Direct URL entry and back/forward |
| `api-error-recovery.spec.ts` | Behaviour when the API fails |
| `organizations-critical.spec.ts` | Organization pages |
| `about-page-critical.spec.ts` | About page |
| `seo-meta-tags-critical.spec.ts` | Meta tags and structured data |
| `share-functionality-critical.spec.ts` | Share actions |
| `theme-toggle-critical.spec.ts` | Light/dark switching |
| `mobile-device-emulation.spec.ts` | Mobile viewports and touch |

Tag a spec `@critical` to include it in the fast loop.

## Configs

| Config | Use |
| --- | --- |
| `playwright.config.ts` | Default. Six projects: Desktop Chrome/Firefox, iPhone 15 Pro (Safari + Chrome), Samsung Galaxy S24, Mobile Firefox |
| `playwright.config.optimized.ts` | Fewer projects, for a fast local loop |
| `playwright.config.ci.ts` | Trimmed set, used by the `:ci` scripts |

## Structure

| Path | Role |
| --- | --- |
| `tests/` | The specs |
| `pages/` | Page objects - `BasePage`, `HomePage`, `DogsPage`, `DogDetailPage` |
| `config/SelectorConfig.ts` | Selector strategy resolution |
| `fixtures/` | Test data and API mock payloads |
| `utils/` | Helpers, including the test-ID validator CLI |
| `setup/` | Global setup and console-error capture |
| `reporters/` | Custom failure reporter |

## Selectors

Selectors resolve test-ID-first, falling back to role and text. Override with
`E2E_SELECTOR_STRATEGY`; `pnpm e2e:strict` runs test-ID-only, which fails loudly
when a component is missing its `data-testid`:

```bash
pnpm e2e:validate         # report components missing test IDs
pnpm e2e:validate:strict  # same, non-zero exit on any gap
```

Prefer adding a `data-testid` over writing a brittle text selector.

## Note on package.json

Several `e2e:*` scripts target spec patterns that no longer exist
(`responsive-*`, `touch-accessibility-validation`, `test-id-validation`,
`mobile-*-interactions`). They fail with "no tests found". The scripts listed
above are the ones that work.
