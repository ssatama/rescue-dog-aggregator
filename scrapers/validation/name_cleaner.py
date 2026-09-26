"""Strip rescue labels and appended breed words from dog names (#505).

Rescues decorate names for their own listings: "Ally OVERLOOKED",
"Vinnie HOME NEEDED", "Lola Lab", "Rex GSD". Cards should show the dog's
name. The original is kept in properties.raw_name by the validator.
"""

import re

# Appeal labels rescues append or prepend. Matched case-insensitively as whole
# phrases, together with the dashes, stars and brackets around them.
# RESERVED, ON HOLD and APPLICATIONS CLOSED stay in the name: nothing else
# records them, and without them a dog nobody can adopt looks available.
LABELS = (
    "OVERLOOKED",
    "URGENT",
    "HOME NEEDED",
    "FOSTER NEEDED",
    "FOSTER OR ADOPTER NEEDED",
    "EXPERIENCED HOME NEEDED",
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


# "Mr Beagle" and "Big Lab" are the whole name, not "Mr" plus a breed.
NAME_PREFIXES = {"mr", "mrs", "miss", "ms", "lady", "lord", "sir", "little", "big", "baby", "old", "young"}


def _is_appended_breed_word(word: str, breed: str) -> bool:
    word = word.lower()
    if word in BREED_ABBREVIATIONS:
        return BREED_ABBREVIATIONS[word] in breed
    return word in BREED_NOUNS and word in breed.split()


def _is_a_name(rest: str, breed: str) -> bool:
    """What's left after the breed word must stand alone as a name.

    Not a title ("Mr Beagle"), not the start of the breed ("Siberian Husky"),
    and not half of a pair ("Benji & Lab").
    """
    words = rest.lower().split()
    if not words or words[-1] in {"&", "/", "and", "+"}:
        return False
    if rest.lower().rstrip(".") in NAME_PREFIXES:
        return False
    return not all(word in breed.split() for word in words)


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
        rest = " ".join(words[:-1]).rstrip(",;-– ")
        if _is_a_name(rest, breed_text):
            cleaned = rest

    return cleaned, overlooked
