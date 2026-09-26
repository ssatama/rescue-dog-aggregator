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
# Charles", "Jack Russell"), and those are real names. Boxer, hound, pointer,
# setter and springer are left out too: they double as surnames and puns
# ("Jerry Springer"), and no rescue has appended them.
BREED_NOUNS = {
    "akita", "beagle", "bulldog", "chihuahua", "cocker", "collie", "dachshund", "doberman",
    "greyhound", "husky", "lurcher", "malamute", "mastiff", "podenco", "poodle", "pug",
    "retriever", "rottweiler", "shepherd", "spaniel", "terrier", "whippet",
}  # fmt: skip


# "Mr Beagle" and "Big Lab" are the whole name, not "Mr" plus a breed.
NAME_PREFIXES = {"mr", "mrs", "miss", "ms", "lady", "lord", "sir", "little", "big", "baby", "old", "young"}


def _is_appended_breed_word(word: str, breed: str) -> bool:
    word = word.lower()
    if word in BREED_ABBREVIATIONS:
        return BREED_ABBREVIATIONS[word] in breed
    return word in BREED_NOUNS and word in breed.split()


def _is_tidy(name: str) -> bool:
    """Non-empty, brackets balanced, no punctuation dangling at either end."""
    if not name or name.count("(") != name.count(")") or name.count("[") != name.count("]"):
        return False
    return not re.search(r"(^[\s,;:&/*+-]|[\s,;:&/*+-]$|\s[,;:])", name)


def _is_a_name(rest: str, breed: str) -> bool:
    """What's left after the breed word must be one word that is a name.

    Every real case is "Lola Lab" or "Rex GSD". Longer names ("Buddy the
    Beagle", "Benji & Lab") are left whole rather than guessed at, and so are
    a title ("Mr Beagle") or the start of the breed ("Siberian Husky").
    """
    words = rest.lower().split()
    if len(words) != 1:
        return False
    word = words[0].rstrip(".")
    return word not in NAME_PREFIXES and word not in breed.split() and not _is_appended_breed_word(word, breed)


def _label_replacement(match: re.Match) -> str:
    """A label between two kept parts leaves its separator behind:
    "Max - URGENT - RESERVED" becomes "Max - RESERVED", not "Max RESERVED"."""
    if match.start() == 0 or match.end() == len(match.string):
        return " "
    matched = match.group(0)
    before = re.search(r"[-–—|]", re.match(r"[^\w]*", matched).group(0))
    after = re.search(r"[-–—|]", re.search(r"[^\w]*$", matched).group(0))
    return f" {before.group(0)} " if before and after else " "


def clean_name(name: str, breed: str | None) -> tuple[str, bool]:
    """Return the display name and whether the rescue labelled the dog overlooked.

    The name is returned unchanged when cleaning would leave nothing or
    leave stray punctuation behind.
    """
    overlooked = bool(re.search(r"\boverlooked\b", name, re.IGNORECASE))
    cleaned = " ".join(_LABEL_PATTERN.sub(_label_replacement, name).split())
    if not _is_tidy(cleaned):
        # A label that shared brackets or a list with other text
        # ("Luna (Urgent, Reserved)"): keep the rescue's name as it was.
        cleaned = name

    words = cleaned.split()
    breed_text = (breed or "").lower()
    if len(words) > 1 and breed_text and _is_appended_breed_word(words[-1], breed_text):
        rest = " ".join(words[:-1]).rstrip(",;-– ")
        if _is_a_name(rest, breed_text):
            cleaned = rest

    return cleaned, overlooked
