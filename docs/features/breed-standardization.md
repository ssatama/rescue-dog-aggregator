# Breed standardization

## What the columns mean

| Column | Meaning |
|---|---|
| `breed_raw` | The organization's original text, never rewritten |
| `primary_breed` | Canonical breed identity. A cross keeps its root here, so `Border Collie Cross` has `primary_breed = "Border Collie"` |
| `secondary_breed` | The second named breed when the source names one, otherwise `NULL` |
| `breed_slug` | Slug of `primary_breed`; the `/breeds/[slug]` page key |
| `breed_type` | `purebred`, `crossbreed`, `mixed`, or `unknown` — how the breed was arrived at, never what kind it is |
| `breed_group` | Group of the primary breed, e.g. a Staffie cross is `Terrier` |
| `breed` / `standardized_breed` | Display label, e.g. `Border Collie Cross` or `Bichon Frise x Maltese` |

Being a cross is a **facet**, not an identity. `Border Collie` and
`Border Collie Cross` therefore share one breed page rather than forking into
two competing ones.

## breed_type is not a category

`breed_type` records **how** a breed was arrived at. It previously also carried
`sighthound`, a category rather than a type, which meant Lurchers were neither
`purebred` nor `crossbreed` and the Crossbreed filter silently excluded every
Lurcher cross. Breed *kind* belongs in `breed_group`.

All designer breeds share the group `Designer/Hybrid`. Inheriting a parent's
group made the choice arbitrary — a Puggle is no more Hound (from Beagle) than
Toy (from Pug).

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

**Scrapes do not repair existing rows.** Most organisations run with
`skip_existing_animals: true`, and `filter_existing_animals` drops dogs that are
already stored *before* `save_animal`, so an existing animal never reaches
`process_animal` again. Only newly listed dogs get current standardization.

After any change to the registry or resolver, re-resolve the stored rows from
the organisation's original text:

```bash
uv run python management/breed_commands.py restandardize             # dry run
uv run python management/breed_commands.py restandardize --apply     # write
```

It reads `breed_raw`, falling back to `breed`, and rewrites the derived columns.
The dry run prints what would change so the rewrite can be reviewed first.

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
