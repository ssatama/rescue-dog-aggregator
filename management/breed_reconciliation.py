"""Compare stored breed values against what the registry resolves today.

Three signals come out of this:

- **unmatched**: organisation text the registry cannot resolve at all. These are
  either junk or a breed the registry is missing, and they are the only signal
  that needs a human.
- **provisional**: a clean name kept at low confidence because no registry entry
  matched. Each one is a candidate alias to add.
- **drift**: rows whose stored value disagrees with the resolver, normally
  because they have not been rescraped yet.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from utils.breed_registry import JUNK_VALUES, _normalize, resolve_breed

PROVISIONAL_CONFIDENCE = 0.4


@dataclass(frozen=True)
class BreedRow:
    """Distinct organisation breed text and the values stored against it."""

    raw: str
    stored_primary: str | None
    stored_slug: str | None
    count: int


@dataclass(frozen=True)
class BreedReconciliation:
    unmatched: list[tuple[str, int]]
    provisional: list[tuple[str, str, int]]
    drift: list[tuple[str, str | None, str, int]]
    total_rows: int
    unmatched_rows: int
    drifted_rows: int

    @property
    def resolved_rows(self) -> int:
        return self.total_rows - self.unmatched_rows

    def is_clean(self, unmatched_row_budget: int) -> bool:
        """Drift resolves itself on the next scrape; unmatched text will not."""
        return self.unmatched_rows <= unmatched_row_budget


def reconcile(rows: Iterable[BreedRow]) -> BreedReconciliation:
    unmatched: list[tuple[str, int]] = []
    provisional: list[tuple[str, str, int]] = []
    drift: list[tuple[str, str | None, str, int]] = []
    total = unmatched_rows = drifted_rows = 0

    for row in rows:
        total += row.count
        identity = resolve_breed(row.raw)

        if identity.primary is None:
            if identity.breed_type == "mixed" or _normalize(row.raw) in JUNK_VALUES:
                # "Mixed Breed" and "Unknown" are answers, not registry gaps.
                continue
            unmatched.append((row.raw, row.count))
            unmatched_rows += row.count
            continue

        if identity.confidence <= PROVISIONAL_CONFIDENCE:
            provisional.append((row.raw, identity.primary, row.count))

        if row.stored_primary != identity.primary:
            drift.append((row.raw, row.stored_primary, identity.primary, row.count))
            drifted_rows += row.count

    unmatched.sort(key=lambda item: -item[1])
    provisional.sort(key=lambda item: -item[2])
    drift.sort(key=lambda item: -item[3])

    return BreedReconciliation(
        unmatched=unmatched,
        provisional=provisional,
        drift=drift,
        total_rows=total,
        unmatched_rows=unmatched_rows,
        drifted_rows=drifted_rows,
    )
