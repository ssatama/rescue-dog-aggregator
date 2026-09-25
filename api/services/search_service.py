"""Search suggestions across breeds, rescues, dogs and a few filter phrases (#491).

Breeds and rescues are small sets (about a hundred breeds and a dozen rescues
with dogs listed), so they are counted in one query each and matched here,
where the breed registry's aliases live. Dog names are the only large set, so
they are matched in SQL, with pg_trgm similarity catching typos.
"""

from difflib import SequenceMatcher

from psycopg2.extras import RealDictCursor

from api.utils.availability import publicly_available
from api.utils.sql_utils import escape_like_pattern
from utils.breed_registry import BreedRecord, BreedRegistry, _normalize

# A fuzzy match must be this close, and the query this long, or short queries
# match half the list.
MIN_FUZZY_RATIO = 0.8
MIN_FUZZY_LENGTH = 4
MIN_NAME_SIMILARITY = 0.4
# match_score of a query that starts a word of the term; anything lower is a typo.
WORD_MATCH = 0.8

# Never a useful suggestion: it is where unresolvable breed text ends up.
HIDDEN_BREEDS = frozenset({"Unknown"})

# Phrases people type for things the catalog can filter on. Params are
# /api/animals filter params.
FILTER_PHRASES: list[tuple[str, tuple[str, ...], dict[str, str]]] = [
    ("Good with cats", ("good with cats", "cat friendly", "cats"), {"good_with_cats": "true"}),
    ("Good with children", ("good with kids", "good with children", "kids", "children", "family dog"), {"good_with_kids": "true"}),
    ("Good with other dogs", ("good with dogs", "good with other dogs", "dog friendly"), {"good_with_dogs": "true"}),
    ("Small dogs", ("small dogs", "small"), {"standardized_size": "Small"}),
    ("Puppies", ("puppies", "puppy"), {"age_category": "Puppy"}),
    ("Seniors", ("seniors", "senior dogs", "senior", "old dogs"), {"age_category": "Senior"}),
]


def match_score(query: str, term: str) -> float:
    """How well a normalised query names a normalised term; 0 means no match.

    Whole-term and prefix matches outrank a match on a later word ("collie"
    finds Collie before Border Collie); a typo still matches the start of the
    term ("labardor" finds "labrador").
    """
    if not query or not term:
        return 0.0
    if term == query:
        return 1.0
    if term.startswith(query):
        return 0.9
    if f" {query}" in f" {term}":
        return WORD_MATCH
    if len(query) >= MIN_FUZZY_LENGTH:
        ratio = max(SequenceMatcher(None, query, term).ratio(), SequenceMatcher(None, query, term[: len(query)]).ratio())
        if ratio >= MIN_FUZZY_RATIO:
            return ratio * 0.7
    return 0.0


def breed_for_query(text: str) -> BreedRecord | None:
    """The breed a whole search query names through an alias, e.g. "staffy"."""
    return BreedRegistry.load().match_exact(_normalize(text))


def search_condition(search: str, params: list) -> str:
    """The catalog's `search` predicate: name or breed text, plus the breed a
    synonym stands for, so "staffy" finds Staffordshire Bull Terriers."""
    term = f"%{escape_like_pattern(search)}%"
    params.extend([term, term, term])
    clauses = ["a.name ILIKE %s", "a.breed ILIKE %s", "a.standardized_breed ILIKE %s"]
    breed = breed_for_query(search)
    if breed:
        clauses.append("a.primary_breed = %s")
        params.append(breed.canonical)
    return f"({' OR '.join(clauses)})"


def _breed_terms(registry: BreedRegistry) -> dict[str, BreedRecord]:
    return {record.canonical: record for record in [*registry.breeds, *registry.designer_breeds]}


def _match_breeds(query: str, rows: list[dict], limit: int) -> list[dict]:
    records = _breed_terms(BreedRegistry.load())
    matches = []
    for row in rows:
        if row["name"] in HIDDEN_BREEDS:
            continue
        record = records.get(row["name"])
        by_name = match_score(query, _normalize(row["name"]))
        by_alias = max(((match_score(query, _normalize(alias)), alias) for alias in (record.aliases if record else ())), default=(0.0, None))
        best = max(by_name, by_alias[0])
        if best:
            # Name the synonym only when the breed's own name matched no better
            # than a typo would, so "gsd" explains German Shepherd Dog but
            # "lab" does not explain Labrador Retriever.
            synonym = by_alias[1] if by_alias[0] > by_name and by_name < WORD_MATCH else None
            matches.append((best, {**row, "matched_synonym": synonym}))
    return _best(matches, limit)


def _match_rescues(query: str, rows: list[dict], limit: int) -> list[dict]:
    scored = [(match_score(query, _normalize(row["name"])), dict(row)) for row in rows]
    return _best([(score, row) for score, row in scored if score], limit)


def _best(scored: list[tuple[float, dict]], limit: int) -> list[dict]:
    """Best matches first, busiest first among equals. Typo matches only count
    when nothing matched properly, so "alsatian" does not offer Dalmatian."""
    if any(score >= WORD_MATCH for score, _ in scored):
        scored = [(score, row) for score, row in scored if score >= WORD_MATCH]
    scored.sort(key=lambda s: (-s[0], -s[1]["count"], s[1]["name"]))
    return [row for _, row in scored[:limit]]


def _match_filters(query: str, limit: int) -> list[dict]:
    found = []
    for label, phrases, params in FILTER_PHRASES:
        # "pup" suggests Puppies; "friendly with cats" contains "cats"
        if any((len(query) >= 3 and phrase.startswith(query)) or f" {phrase} " in f" {query} " for phrase in phrases):
            found.append({"label": label, "params": params})
    return found[:limit]


def suggest(cursor: RealDictCursor, q: str, limit: int) -> dict:
    """Grouped suggestions for a search box; each group holds at most `limit`."""
    query = _normalize(q)
    if not query:
        return {"breeds": [], "rescues": [], "dogs": [], "filters": []}

    cursor.execute(
        f"""
        SELECT a.primary_breed AS name, a.breed_slug AS slug, COUNT(*) AS count
        FROM animals a JOIN organizations o ON o.id = a.organization_id
        WHERE {publicly_available("a")} AND a.animal_type = 'dog' AND o.active
          AND a.primary_breed IS NOT NULL AND a.breed_slug IS NOT NULL
        GROUP BY a.primary_breed, a.breed_slug
        """
    )
    breeds = _match_breeds(query, cursor.fetchall(), limit)

    cursor.execute(
        f"""
        SELECT o.name, o.slug, COUNT(a.id) AS count
        FROM organizations o
        JOIN animals a ON a.organization_id = o.id AND {publicly_available("a")} AND a.animal_type = 'dog'
        WHERE o.active
        GROUP BY o.id
        """
    )
    rescues = _match_rescues(query, cursor.fetchall(), limit)

    escaped = escape_like_pattern(q.strip())
    cursor.execute(
        f"""
        SELECT a.name, a.slug, a.standardized_breed AS breed, o.name AS rescue, a.primary_image_url AS image
        FROM animals a JOIN organizations o ON o.id = a.organization_id
        WHERE {publicly_available("a")} AND a.animal_type = 'dog' AND o.active AND a.name IS NOT NULL
          AND (
            a.name ILIKE %(prefix)s OR a.name ILIKE %(word)s
            OR (%(fuzzy)s AND similarity(lower(a.name), lower(%(q)s)) >= %(similarity)s)
          )
        ORDER BY a.name ILIKE %(prefix)s DESC, a.name ILIKE %(word)s DESC,
                 similarity(lower(a.name), lower(%(q)s)) DESC, char_length(a.name), a.name
        LIMIT %(limit)s
        """,
        {
            "prefix": f"{escaped}%",
            "word": f"% {escaped}%",
            "q": q.strip(),
            "fuzzy": len(query) >= MIN_FUZZY_LENGTH,
            "similarity": MIN_NAME_SIMILARITY,
            "limit": limit,
        },
    )
    dogs = [dict(row) for row in cursor.fetchall()]

    return {"breeds": breeds, "rescues": rescues, "dogs": dogs, "filters": _match_filters(query, limit)}
