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
# the place each one names on the rescue's own pages. Whole words only, so
# "Kaspar" is not ASPA.
SHELTER_PLACES = tuple(
    (re.compile(pattern), place)
    for pattern, place in (
        (r"\bmie? fiel amigo\b", "Andújar, Spain"),
        (r"\band[úu]jar\b", "Andújar, Spain"),
        (r"\bhogar de asis\b", "La Carolina, Spain"),
        (r"\bla carolina\b", "La Carolina, Spain"),
        (r"\bbajo arag[óo]n\b", "Bajo Aragón, Spain"),
        (r"\bapap\b", "Bajo Aragón, Spain"),
        (r"\bvillena\b", "Villena, Spain"),
        (r"\badpca\b", "Zaragoza, Spain"),
        (r"\bzaragoza\b", "Zaragoza, Spain"),
        (r"\bperros con alma\b", "Zaragoza, Spain"),
        (r"\bada canals\b", "Canals, Spain"),
        (r"\b(?:al[\s-]?)?bayy?as", "Baeza, Spain"),  # spelled a dozen ways
        (r"\bbaeza\b", "Baeza, Spain"),
        (r"\bhuella de ja[ée]n\b", "Jaén, Spain"),
        (r"\badoromimos\b", "Mafra, Portugal"),
        (r"\bmafra\b", "Mafra, Portugal"),
        (r"\baspa\b", "Bucharest, Romania"),
        (r"\bbukarest\b", "Bucharest, Romania"),
        (r"\bodai\b", "Romania"),
    )
)

_GERMAN_POSTCODE = re.compile(r"\b\d{5}\s+(.+)")
# Words after a postcode that name the kind of place, not the town:
# "79312 Tierheim Emmendingen" is in Emmendingen.
_FACILITY_WORDS = {"tierheim", "pflegestelle", "pflegefamilie", "tierpension", "hundepension", "tierschutzverein"}
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


def _german_town(text: str) -> str | None:
    """The capitalised words after a postcode, minus facility words, up to "bei" or a bracket."""
    words = []
    for word in re.sub(r"-\s+", "-", text).split():
        if word.lower() in _FACILITY_WORDS:
            continue
        if not word[0].isupper():
            break
        words.append(word.rstrip(",;."))
        if word[-1] in ",;":
            break
    return " ".join(words) or None


def _aufenthaltsort(value: str) -> str | None:
    if match := _SWISS_POSTCODE_TOWN.search(value):
        return f"{match.group(1)}, Switzerland"
    lowered = value.lower()
    shelter = next((place for pattern, place in SHELTER_PLACES if pattern.search(lowered)), None)
    # A foster home in Germany gives its postcode; Spanish postcodes also have
    # five digits, so a partner shelter's name wins over one.
    if not shelter and (match := _GERMAN_POSTCODE.search(value)):
        town = _german_town(match.group(1))
        return f"{town}, Germany" if town else None
    return shelter


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
