"""Canonical breed registry and resolver.

Organisations describe the same breed many ways: "Terrier (Staffordshire Bull)",
"staffie", "SBT", "Staffordshire Bull Terrier Cross". This module maps all of
them onto one canonical record, and separates the breed's identity from the
fact that it is a cross, so that "Border Collie" and "Border Collie Cross"
share a breed page instead of forking into two.

Breeds and aliases live in breed_registry.yaml; adding either is a data change.
"""

import functools
import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from utils.breed_utils import fold_to_ascii, generate_breed_slug

REGISTRY_PATH = Path(__file__).with_name("breed_registry.yaml")

CROSS_MARKERS = frozenset({"cross", "crossbreed", "mix", "mixed", "mischling", "mongrel", "mutt"})
# Words organisations prefix when they are guessing; they carry no breed meaning.
QUALIFIER_WORDS = frozenset({"vermutlich", "wahrscheinlich", "similar", "possibly", "probably", "evtl", "maybe"})
# Connectives inside breed names such as "Perro de Agua" or "Dogue de Bordeaux".
PARTICLES = frozenset({"de", "del", "la", "el", "von", "van", "der", "du", "di", "y"})
GENERIC_BREED_WORDS = frozenset({"breed", "dog", "puppy", "pup"})
SEPARATOR_PATTERN = re.compile(r"\s+x\s+|[/+,]|\s+and\s+")
JUNK_VALUES = frozenset(
    {
        "n/a",
        "na",
        "tbc",
        "breed tbc",
        "not specified",
        "pending",
        "unknown",
        "can be the only dog",
        "",
    }
)
# Single words that appear in the breed field but never name a breed.
NON_BREED_WORDS = frozenset({"unlisted", "european", "tofu", "yorkshire", "pinscher", "shepherd", "spitz", "hound", "terrier", "spaniel", "poodle", "collie", "retriever"})
MAX_BREED_TEXT_LENGTH = 120


@dataclass(frozen=True)
class BreedRecord:
    """One canonical breed and every string that resolves to it."""

    canonical: str
    slug: str
    group: str
    size: str | None
    aliases: tuple[str, ...]
    parents: tuple[str, str] | None = None


@dataclass(frozen=True)
class BreedIdentity:
    """The outcome of resolving one organisation-supplied breed string."""

    primary: str | None
    secondary: str | None
    slug: str | None
    group: str
    size: str | None
    is_cross: bool
    breed_type: str
    confidence: float
    parents: tuple[str, str] | None = None


class BreedRegistry:
    """Alias index over the canonical breed list."""

    def __init__(self, breeds: list[BreedRecord], designer_breeds: list[BreedRecord]):
        self.breeds = breeds
        self.designer_breeds = designer_breeds
        self._index: dict[str, BreedRecord] = {}
        for record in [*breeds, *designer_breeds]:
            for key in (record.canonical, *record.aliases):
                self._index.setdefault(_normalize(key), record)
        # Longest first so "miniature poodle" wins over "poodle".
        self._ordered = sorted(self._index.items(), key=lambda kv: -len(kv[0]))

    @classmethod
    @functools.cache
    def load(cls, path: Path = REGISTRY_PATH) -> "BreedRegistry":
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
        return cls(
            breeds=[_record(entry) for entry in document["breeds"]],
            designer_breeds=[_record(entry) for entry in document["designer_breeds"]],
        )

    def match_exact(self, text: str) -> BreedRecord | None:
        return self._index.get(text)

    def find_all(self, text: str) -> list[BreedRecord]:
        """Return breeds mentioned in text, ordered by where they appear."""
        found: list[tuple[int, BreedRecord]] = []
        claimed: list[tuple[int, int]] = []
        for alias, record in self._ordered:
            start = _find_word(text, alias)
            if start is None:
                continue
            end = start + len(alias)
            if any(start < c_end and c_start < end for c_start, c_end in claimed):
                continue
            claimed.append((start, end))
            found.append((start, record))
        deduped: list[BreedRecord] = []
        for _, record in sorted(found, key=lambda pair: pair[0]):
            if record not in deduped:
                deduped.append(record)
        return deduped


def _record(entry: dict) -> BreedRecord:
    parents = entry.get("parents")
    return BreedRecord(
        canonical=entry["canonical"],
        slug=generate_breed_slug(entry["canonical"]),
        group=entry["group"],
        size=entry.get("size"),
        aliases=tuple(entry.get("aliases") or ()),
        parents=(parents[0], parents[1]) if parents else None,
    )


def _normalize(text: str) -> str:
    """Fold to ASCII and reduce punctuation to single spaces for matching."""
    folded = fold_to_ascii(text)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", folded)).strip()


def _find_word(haystack: str, needle: str) -> int | None:
    """Locate needle in haystack on word boundaries, so 'lab' misses 'black'."""
    match = re.search(rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])", haystack)
    return match.start() if match else None


def _strip_cross_markers(text: str) -> tuple[str, bool]:
    """Remove cross wording and guess-qualifiers, reporting if a cross was named."""
    for marker in ("mischling", "mix"):
        text = re.sub(rf"([a-z]{{4,}}){marker}\b", r"\1 " + marker, text)
    words = [word for word in text.split() if word not in QUALIFIER_WORDS]
    kept = [word for word in words if word not in CROSS_MARKERS]
    found = len(kept) != len(words)
    if kept and kept[-1] == "x":
        kept.pop()
        found = True
    remaining = " ".join(kept)
    if found and remaining and all(word in GENERIC_BREED_WORDS for word in remaining.split()):
        remaining = ""
    return remaining, found


def _expand_parenthetical(raw: str) -> str | None:
    """Turn "Terrier (Staffordshire Bull)" into "staffordshire bull terrier"."""
    match = re.match(r"^\s*([\w\s-]+?)\s*\(([^)]+)\)\s*$", fold_to_ascii(raw))
    if not match:
        return None
    head, inner = _normalize(match.group(1)), _normalize(match.group(2))
    return f"{inner} {head}".strip() if head and inner else None


def _unknown() -> BreedIdentity:
    return BreedIdentity(None, None, None, "Unknown", None, False, "unknown", 0.0)


def _mixed() -> BreedIdentity:
    return BreedIdentity(None, None, "mixed-breed", "Mixed", None, True, "mixed", 0.5)


def _from_records(primary: BreedRecord, secondary: BreedRecord | None, is_cross: bool, confidence: float) -> BreedIdentity:
    return BreedIdentity(
        primary=primary.canonical,
        secondary=secondary.canonical if secondary else None,
        slug=primary.slug,
        group=primary.group,
        size=primary.size,
        is_cross=is_cross,
        breed_type="crossbreed" if is_cross else "purebred",
        confidence=confidence,
        parents=primary.parents,
    )


def _provisional_breed(normalized: str) -> BreedIdentity | None:
    """Accept a short, clean, unrecognised name as a low-confidence breed.

    Losing a real breed the registry lacks is worse than carrying it at low
    confidence, but anything long or descriptive is noise rather than a name.
    """
    words = [word for word in normalized.split() if word not in QUALIFIER_WORDS]
    if not 1 <= len(words) <= 4:
        return None
    significant = [word for word in words if word not in PARTICLES]
    if not significant:
        return None
    if any(len(word) < 3 or not word.isalpha() for word in significant):
        return None
    if not any(word.isalpha() for word in words):
        return None
    if any(word in CROSS_MARKERS or word in GENERIC_BREED_WORDS for word in words):
        return None
    if len(words) == 1 and words[0] in NON_BREED_WORDS:
        return None
    name = " ".join(word.capitalize() for word in words)
    return BreedIdentity(
        primary=name,
        secondary=None,
        slug=generate_breed_slug(name),
        group="Unknown",
        size=None,
        is_cross=False,
        breed_type="unknown",
        confidence=0.4,
    )


def resolve_breed(raw: str | None, registry: BreedRegistry | None = None) -> BreedIdentity:
    """Resolve an organisation-supplied breed string to a canonical identity."""
    if not raw or not isinstance(raw, str):
        return _unknown()

    registry = registry or BreedRegistry.load()
    stripped = raw.strip()
    if _normalize(stripped) in JUNK_VALUES or len(stripped) > MAX_BREED_TEXT_LENGTH:
        return _unknown()

    # A designer breed is its own identity, not its parents'.
    designer_index = {alias: record for record in registry.designer_breeds for alias in (_normalize(record.canonical), *record.aliases)}
    normalized = _normalize(stripped)
    for alias, record in sorted(designer_index.items(), key=lambda kv: -len(kv[0])):
        if _find_word(normalized, alias) is not None:
            return _from_records(record, None, True, 0.85)

    expanded = _expand_parenthetical(stripped)
    if expanded:
        record = registry.match_exact(expanded)
        if record:
            return _from_records(record, None, False, 0.9)

    without_parens = _normalize(re.sub(r"\([^)]*\)", " ", stripped))
    for candidate in (normalized, without_parens):
        record = registry.match_exact(candidate)
        if record:
            return _from_records(record, None, False, 0.95)

    segments = [segment for segment in SEPARATOR_PATTERN.split(normalized) if segment.strip()]
    is_cross = len(segments) > 1
    records: list[BreedRecord] = []
    for segment in segments:
        text, marked = _strip_cross_markers(segment.strip())
        is_cross = is_cross or marked
        if not text:
            continue
        record = registry.match_exact(text)
        for found in [record] if record else registry.find_all(text):
            if found not in records:
                records.append(found)

    if not records:
        # A parenthetical aside can still name the breed, as in
        # "Mixed Breed (Podenco or Mastin, found with two mothers)".
        expansion = _expand_parenthetical(stripped)
        if expansion:
            records = registry.find_all(expansion)[:1]
    if not records:
        provisional = _provisional_breed(normalized)
        if provisional:
            return provisional
        return _mixed() if is_cross else _unknown()

    primary = records[0]
    secondary = records[1] if len(records) > 1 else None
    if secondary:
        is_cross = True
    confidence = 0.9 if not is_cross else (0.8 if secondary else 0.7)
    return _from_records(primary, secondary, is_cross, confidence)
