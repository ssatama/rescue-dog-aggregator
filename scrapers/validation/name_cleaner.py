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

# Breed nouns a rescue appends, which must also be in the dog's breed. Only
# these: breeds also hold colours and names ("Snow White" the Westie, "King
# Charles", "Jack Russell"), and those are real names.
BREED_NOUNS = {
    "akita", "beagle", "boxer", "bulldog", "chihuahua", "cocker", "collie", "dachshund",
    "doberman", "greyhound", "hound", "husky", "lurcher", "malamute", "mastiff", "pointer",
    "podenco", "poodle", "pug", "retriever", "rottweiler", "setter", "shepherd", "spaniel",
    "springer", "terrier", "whippet",
}  # fmt: skip


def _is_appended_breed_word(word: str, breed: str) -> bool:
    word = word.lower()
    if word in BREED_ABBREVIATIONS:
        return BREED_ABBREVIATIONS[word] in breed
    return word in BREED_NOUNS and word in breed.split()


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
