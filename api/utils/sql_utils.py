def escape_like_pattern(pattern: str) -> str:
    """Escape special characters for safe use in SQL LIKE/ILIKE clauses.

    Escapes \\, %, and _ so user input cannot act as wildcards.
    """
    return pattern.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
