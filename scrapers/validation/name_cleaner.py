"""Strip rescue labels and appended breed words from dog names (#505).

Rescues decorate names for their own listings: "Ally OVERLOOKED",
"Vinnie HOME NEEDED", "Lola Lab", "Rex GSD". Cards should show the dog's
name. The original is kept in properties.raw_name by the validator.
"""

import re

# Status labels rescues append or prepend. Matched case-insensitively as whole
# phrases, together with the dashes, stars and brackets around them.
LABELS = (
    "OVERLOOKED",
    "URGENT",
    "RESERVED",
    "ON HOLD",
    "HOME NEEDED",
    "FOSTER NEEDED",
    "FOSTER OR ADOPTER NEEDED",
    "EXPERIENCED HOME NEEDED",
    "APPLICATIONS CLOSED",
)
_LABEL_PATTERN = re.compile(
    r"[\s\-–—*:|!(\[]*\b(?:" + "|".join(re.escape(label).replace(r"\ ", r"\s+") for label in sorted(LABELS, key=len, reverse=True)) + r")\b[\s\-–—*:|!)\]]*",
    re.IGNORECASE,
)

# Short forms rescues append, mapped to text the dog's breed contains.
BREED_ABBREVIATIONS = {
    "lab": "labrador",
    "gsd": "german shepherd",
    "staffy": "staffordshire",
    "staffie": "staffordshire",
    "sbt": "staffordshire",
    "jrt": "jack russell",
    "fbd": "french bulldog",
}

# Words in a breed that say nothing about the breed; "Max Cross" stays.
GENERIC_BREED_WORDS = {"cross", "mix", "mixed", "breed", "dog", "unknown"}


def _is_appended_breed_word(word: str, breed: str) -> bool:
    word = word.lower()
    if word in GENERIC_BREED_WORDS:
        return False
    if word in BREED_ABBREVIATIONS:
        return BREED_ABBREVIATIONS[word] in breed
    return word in breed.split()


def clean_name(name: str, breed: str | None) -> tuple[str, bool]:
    """Return the display name and whether the rescue labelled the dog overlooked.

    The name is returned unchanged when cleaning would leave nothing.
    """
    overlooked = bool(re.search(r"\boverlooked\b", name, re.IGNORECASE))
    cleaned = " ".join(_LABEL_PATTERN.sub(" ", name).split())
    if not cleaned:
        return name, overlooked

    words = cleaned.split()
    breed_text = (breed or "").lower()
    if len(words) > 1 and breed_text and _is_appended_breed_word(words[-1], breed_text):
        cleaned = " ".join(words[:-1])

    return cleaned, overlooked
