"""One readable place per dog, from whatever the rescue publishes (#505).

Stored as properties.display_location ("Snetterton, Norfolk", "Baeza,
Spain"). Sources, by the property the scraper already stores:

- location: Dogs Trust "Snetterton (Norfolk) (Snetterton)" (centre, region,
  town), Woof Project "Cyprus in foster care", Many Tears "Wales, UK"
- Aufenthaltsort: Tierschutzverein Europa, a German postcode and town or the
  partner shelter's name ("Pflegestelle in 10119 Berlin", "Tierheim Odai")
- current_location(_translated): Daisy Family and REAN ("bei Münster", "Norfolk")

A value that can't be read as a place is left out, never guessed.
"""

import re

# Tierschutzverein's partner shelters, as they appear in Aufenthaltsort, with
# the place each one names on the rescue's own pages.
SHELTER_PLACES = (
    ("mi fiel amigo", "Andújar, Spain"),
    ("andújar", "Andújar, Spain"),
    ("hogar de asis", "La Carolina, Spain"),
    ("la carolina", "La Carolina, Spain"),
    ("bajo aragón", "Bajo Aragón, Spain"),
    ("apap", "Bajo Aragón, Spain"),
    ("villena", "Villena, Spain"),
    ("adpca", "Zaragoza, Spain"),
    ("zaragoza", "Zaragoza, Spain"),
    ("ada canals", "Canals, Spain"),
    ("bayyasa", "Baeza, Spain"),
    ("baeza", "Baeza, Spain"),
    ("huella de jaén", "Jaén, Spain"),
    ("adoromimos", "Mafra, Portugal"),
    ("mafra", "Mafra, Portugal"),
    ("aspa", "Bucharest, Romania"),
    ("bukarest", "Bucharest, Romania"),
    ("odai", "Romania"),
)

_GERMAN_POSTCODE_TOWN = re.compile(r"\b\d{5}\s+([A-ZÄÖÜ][\wäöüß]*(?:[-\s][A-ZÄÖÜ][\wäöüß]*)*)")
_SWISS_POSTCODE_TOWN = re.compile(r"\bCH-\d{4}\s+([A-ZÄÖÜ][\wäöüß-]*)", re.IGNORECASE)
_TRAILING_NOTE = re.compile(r"\s+(?:in foster care|since\b.*|\(ab\b.*)$", re.IGNORECASE)


def _dogs_trust_style(value: str) -> str | None:
    """ "Centre (Region) (Town)" -> "Centre, Region"; a single group is the town."""
    groups = [g.strip() for g in re.findall(r"\(([^)]*)\)", value)]
    centre = re.sub(r"\s*\([^)]*\)", "", value).strip()
    if not centre:
        return None
    region = groups[0] if len(groups) > 1 else ""
    if region and region.lower() not in centre.lower():
        return f"{centre}, {region}"
    return centre


def _aufenthaltsort(value: str) -> str | None:
    if match := _SWISS_POSTCODE_TOWN.search(value):
        return f"{match.group(1)}, Switzerland"
    if match := _GERMAN_POSTCODE_TOWN.search(value):
        return f"{match.group(1).strip()}, Germany"
    lowered = value.lower()
    for key, place in SHELTER_PLACES:
        if key in lowered:
            return place
    return None


def _current_location(value: str) -> str | None:
    value = value.strip()
    if match := re.match(r"(?:bei|near)\s+(.+)", value, re.IGNORECASE):
        return f"near {match.group(1)}"
    value = re.sub(r"^(?:bald\s+)?in\s+", "", value, flags=re.IGNORECASE)
    return value or None


def display_location(properties: dict) -> str | None:
    if location := (properties.get("location") or "").strip():
        if "(" in location:
            return _dogs_trust_style(location)
        return _TRAILING_NOTE.sub("", location).strip() or None
    if ort := (properties.get("Aufenthaltsort") or "").strip():
        return _aufenthaltsort(ort)
    current = properties.get("current_location_translated") or properties.get("current_location")
    if current:
        return _current_location(current)
    return None
