# Breed standardization

## What the columns mean

| Column | Meaning |
|---|---|
| `breed_raw` | The organization's original text, never rewritten |
| `primary_breed` | Canonical breed identity. A cross keeps its root here, so `Border Collie Cross` has `primary_breed = "Border Collie"` |
| `secondary_breed` | The second named breed when the source names one, otherwise `NULL` |
| `breed_slug` | Slug of `primary_breed`; the `/breeds/[slug]` page key |
| `breed_type` | `purebred`, `crossbreed`, `mixed`, or `unknown` |
| `breed_group` | Group of the primary breed, e.g. a Staffie cross is `Terrier` |
| `breed` / `standardized_breed` | Display label, e.g. `Border Collie Cross` or `Bichon Frise x Maltese` |

Being a cross is a **facet**, not an identity. `Border Collie` and
`Border Collie Cross` therefore share one breed page rather than forking into
two competing ones.

## Adding a breed or alias

Edit `utils/breed_registry.yaml` — no code change is required.

```yaml
- canonical: Bracco Italiano
  group: Sporting
  size: Large
  aliases: [italian pointer, bracco]
```

Designer breeds keep their own identity and record their parents:

```yaml
- canonical: Cockapoo
  group: Designer/Hybrid
  size: Small
  parents: [Cocker Spaniel, Poodle]
  aliases: [cockerpoo]
```

A Cockapoo resolves to `primary_breed = "Cockapoo"`, not to Cocker Spaniel;
parents stay in the registry rather than being copied onto every row.

## Resolution order

1. Junk and over-long text resolve to unknown
2. Designer breeds match first, so a named cross keeps its own identity
3. Parenthetical forms expand — `Terrier (Staffordshire Bull)` becomes `Staffordshire Bull Terrier`
4. Exact alias match on the whole string
5. Split on `x`, `/`, `+`, `,`, `and`; resolve each part; first two distinct breeds become primary and secondary
6. A short, clean, unrecognized name is kept at confidence `0.4` rather than discarded, so a breed missing from the registry is never silently lost

## Repairing stored values

`breed_slug`, `primary_breed` and the rest are recomputed on every scrape and are
covered by change detection, so stored rows correct themselves within one cron
cycle (Mon/Thu/Sat 15:00 UTC). No backfill migration is needed.

## Keeping the registry current

```bash
uv run python management/breed_commands.py reconcile
```

Reports three things against live data:

- **Unresolved breed text** — organisation text the registry cannot resolve and
  that is not a known sentinel such as `Unknown` or `N/A`. This is the only
  section that needs a human.
- **Candidates for the registry** — clean names kept at confidence `0.4` because
  nothing matched. Each is a breed or alias worth adding to the YAML.
- **Stored values behind the resolver** — rows not yet rescraped. These clear
  themselves on the next cron run and need no action.

Exits non-zero when unresolved rows exceed `--unmatched-budget` (default 50), so
it can gate a scheduled run. Pass `--all-statuses` to include adopted and
delisted dogs.

This is the check that catches a resolver change silently dropping breeds: the
test suite was fully green while 148 production rows were becoming `Unknown`.
