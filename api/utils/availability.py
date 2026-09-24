"""The one definition of "available" for anything the public site counts or lists.

The dog lists default to high+medium availability confidence, so every public count
must use the same filter or pages contradict each other: /organizations/dogs-trust said
"448 Dogs Available" while its list returned 411 (#451).
"""


def publicly_available(alias: str | None = "a") -> str:
    """SQL predicate for dogs a visitor can actually browse, for ``animals`` aliased as ``alias``."""
    col = f"{alias}." if alias else ""
    return f"{col}status = 'available' AND {col}active = true AND {col}availability_confidence IN ('high', 'medium')"
