"""German to English translations for Daisy Family Rescue dog data.

This module provides translation functions for all German text found in the
Daisy Family Rescue database. Includes caching to avoid re-translating content.
"""

import hashlib
import re
from functools import lru_cache
from typing import Any

# Global translation cache to persist across function calls
_translation_cache: dict[str, str] = {}


def _get_cache_key(text: str, translation_type: str) -> str:
    """Generate a cache key for translation results."""
    return f"{translation_type}:{hashlib.md5(text.encode()).hexdigest()[:8]}"


def _cached_translate(text: str, translation_type: str, translator_func) -> str | None:
    """Generic cached translation wrapper."""
    if not text or not text.strip():
        return None

    cache_key = _get_cache_key(text.strip(), translation_type)

    # Check cache first
    if cache_key in _translation_cache:
        return _translation_cache[cache_key]

    # Perform translation
    result = translator_func(text.strip())

    # Cache the result
    if result:
        _translation_cache[cache_key] = result

    return result


def normalize_name(name: str | None) -> str | None:
    """Normalize dog names to proper capitalization.

    Handles German dog names that might be in various cases.

    Args:
        name: Dog name

    Returns:
        Properly capitalized name
    """
    if not name:
        return None

    name = name.strip()

    # Handle hyphenated names
    if "-" in name:
        parts = name.split("-")
        return "-".join(part.capitalize() for part in parts)

    # Handle multi-word names
    if " " in name:
        parts = name.split()
        return " ".join(part.capitalize() for part in parts)

    # Simple capitalization for single words
    return name.capitalize()


def translate_gender(gender: str | None) -> str | None:
    """Translate German gender terms to English standard values.

    Args:
        gender: German gender string

    Returns:
        Standardized English gender ('Male' or 'Female') or None
    """
    if not gender:
        return None

    def _translate_gender_impl(text: str) -> str | None:
        text_lower = text.lower().strip()

        gender_map = {
            "rüde": "Male",
            "hündin": "Female",
            "weiblich": "Female",
            "männlich": "Male",
        }

        for german, english in gender_map.items():
            if german in text_lower:
                return english

        return None

    return _cached_translate(gender, "gender", _translate_gender_impl)


def translate_age(age_text: str | None) -> str | None:
    """Translate German age text to English format.

    Handles patterns like:
    - "03/2020" -> "Born 03/2020"
    - "5 Jahre" -> "5 years"
    - "18 Monate" -> "18 months"

    Args:
        age_text: German age string

    Returns:
        English age string or None if unknown/invalid
    """
    if not age_text:
        return None

    def _translate_age_impl(text: str) -> str | None:
        # Handle birth date format MM/YYYY
        date_match = re.search(r"(\d{1,2})/(\d{4})", text)
        if date_match:
            return f"Born {date_match.group(1)}/{date_match.group(2)}"

        # Handle years
        years_match = re.search(r"(\d+)\s*Jahre?", text)
        if years_match:
            years = int(years_match.group(1))
            return f"{years} year{'s' if years != 1 else ''}"

        # Handle months
        months_match = re.search(r"(\d+)\s*Monate?", text)
        if months_match:
            months = int(months_match.group(1))
            return f"{months} month{'s' if months != 1 else ''}"

        return None

    return _cached_translate(age_text, "age", _translate_age_impl)


def translate_breed(breed: str | None) -> str | None:
    """Translate German breed names to English.

    Args:
        breed: German breed name

    Returns:
        English breed name or original if no translation needed
    """
    if not breed:
        return None

    def _translate_breed_impl(text: str) -> str | None:
        # Word translations
        breed_translations = {
            "Mischling": "Mixed Breed",
            "Deutscher Schäferhund": "German Shepherd",
            "Schäferhund": "German Shepherd",
            "Golden Retriever": "Golden Retriever",
            "Labrador": "Labrador",
            "Terrier": "Terrier",
            "Pudel": "Poodle",
            "Dackel": "Dachshund",
            "Border Collie": "Border Collie",
            "Husky": "Husky",
            "Rottweiler": "Rottweiler",
            "Dobermann": "Doberman",
            "Boxer": "Boxer",
            "Beagle": "Beagle",
            "Jack Russell": "Jack Russell",
            "Chihuahua": "Chihuahua",
            "Spaniel": "Spaniel",
            "Setter": "Setter",
            "Pointer": "Pointer",
        }

        result = text

        # Apply translations
        for german, english in breed_translations.items():
            if german in result:
                result = result.replace(german, english)

        return result

    return _cached_translate(breed, "breed", _translate_breed_impl)


def translate_location(location: str | None) -> str | None:
    """Translate German location names to English.

    Args:
        location: German location name

    Returns:
        English location name
    """
    if not location:
        return None

    def _translate_location_impl(text: str) -> str | None:
        location_translations = {
            # Countries
            "Nordmazedonien": "North Macedonia",
            "Deutschland": "Germany",
            "Spanien": "Spain",
            "Italien": "Italy",
            "Griechenland": "Greece",
            "Rumänien": "Romania",
            "Bulgarien": "Bulgaria",
            "Türkei": "Turkey",
            # German cities
            "München": "Munich",
            "Berlin": "Berlin",
            "Hamburg": "Hamburg",
            "Köln": "Cologne",
            "Frankfurt": "Frankfurt",
            "Stuttgart": "Stuttgart",
            "Düsseldorf": "Düsseldorf",
            "Dortmund": "Dortmund",
            "Essen": "Essen",
            "Leipzig": "Leipzig",
            "Bremen": "Bremen",
            "Dresden": "Dresden",
            "Hannover": "Hanover",
            "Nürnberg": "Nuremberg",
            "Duisburg": "Duisburg",
            # Regional terms
            "Stadtrand": "city outskirts",
            "Land": "countryside",
            "auf dem Land": "in the countryside",
        }

        result = text

        for german, english in location_translations.items():
            if german in result:
                result = result.replace(german, english)

        return result

    return _cached_translate(location, "location", _translate_location_impl)


def translate_character_traits(traits: str | None) -> str | None:
    """Translate German character trait descriptions to English.

    Args:
        traits: German character description

    Returns:
        English character description
    """
    if not traits:
        return None

    def _translate_traits_impl(text: str) -> str | None:
        trait_translations = {
            # Character traits
            "menschenbezogen": "people-oriented",
            "verschmust": "cuddly",
            "liebevoll": "loving",
            "neugierig": "curious",
            "aufmerksam": "attentive",
            "zugänglich": "approachable",
            "freundlich": "friendly",
            "verspielt": "playful",
            "ruhig": "calm",
            "aktiv": "active",
            "energisch": "energetic",
            "sanft": "gentle",
            "geduldig": "patient",
            "intelligent": "intelligent",
            "gehorsam": "obedient",
            "loyal": "loyal",
            "treu": "loyal",
            "anhänglich": "affectionate",
            "schüchtern": "shy",
            "ängstlich": "anxious",
            "selbstbewusst": "confident",
            "dominant": "dominant",
            "territorial": "territorial",
            "wachsam": "alert",
            "beschützend": "protective",
            # Activity levels
            "sehr aktiv": "very active",
            "mäßig aktiv": "moderately active",
            "wenig aktiv": "low activity",
            # Social traits
            "sozial": "social",
            "gesellig": "sociable",
            "einzelgänger": "loner",
        }

        result = text

        # Apply translations
        for german, english in trait_translations.items():
            # Use word boundaries for more precise matching
            pattern = r"\b" + re.escape(german) + r"\b"
            result = re.sub(pattern, english, result, flags=re.IGNORECASE)

        return result

    return _cached_translate(traits, "traits", _translate_traits_impl)


def translate_compatibility(compatibility: str | None) -> str | None:
    """Translate German compatibility descriptions to English.

    Args:
        compatibility: German compatibility text

    Returns:
        English compatibility description
    """
    if not compatibility:
        return None

    def _translate_compatibility_impl(text: str) -> str | None:
        compatibility_translations = {
            # Animals
            "Hunden": "dogs",
            "Hunde": "dogs",
            "Katzen": "cats",
            "Katze": "cats",
            "Kindern": "children",
            "Kinder": "children",
            # Responses
            "ja": "yes",
            "nein": "no",
            "bedingt": "conditionally",
            "mit Eingewöhnung": "with introduction",
            "nach Eingewöhnung": "after introduction",
            "gut": "well",
            "sehr gut": "very well",
            "schlecht": "poorly",
            # Phrases
            "Verträgt sich mit": "Gets along with",
            "verträgt sich": "gets along",
            "kommt zurecht mit": "gets along with",
            "mag": "likes",
            "mag keine": "doesn't like",
        }

        result = text

        for german, english in compatibility_translations.items():
            if german in result:
                result = result.replace(german, english)

        return result

    return _cached_translate(compatibility, "compatibility", _translate_compatibility_impl)


def translate_ideal_home(home_description: str | None) -> str | None:
    """Translate German ideal home descriptions to English.

    Args:
        home_description: German home description

    Returns:
        English home description
    """
    if not home_description:
        return None

    def _translate_home_impl(text: str) -> str | None:
        home_translations = {
            # Home types
            "Haus": "house",
            "Wohnung": "apartment",
            "Garten": "garden",
            "Hof": "yard",
            "Balkon": "balcony",
            # Environment
            "ruhig": "quiet",
            "ruhiger": "quiet",
            "ruhiges": "quiet",
            "Stadtrand": "city outskirts",
            "Land": "countryside",
            "ländlich": "rural",
            "städtisch": "urban",
            # Family type
            "Familie": "family",
            "Single": "single person",
            "Paar": "couple",
            "Rentner": "retirees",
            "Senioren": "seniors",
            # Experience level
            "erfahren": "experienced",
            "erfahrene": "experienced",
            "Anfänger": "beginners",
            "hundeerfahren": "dog-experienced",
            # Characteristics
            "aktive": "active",
            "sportliche": "sporty",
            "geduldige": "patient",
            "konsequente": "consistent",
            "liebevolle": "loving",
            "souveräne": "confident",
            "ruhige": "quiet",
            "Halter": "owners",
            "mit": "with",
            "ländliche": "rural",
            "Gegend": "area",
            "aktive": "active",
        }

        result = text

        for german, english in home_translations.items():
            # Use word boundaries for better matching
            pattern = r"\b" + re.escape(german) + r"\b"
            result = re.sub(pattern, english, result, flags=re.IGNORECASE)

        return result

    return _cached_translate(home_description, "home", _translate_home_impl)


@lru_cache(maxsize=1000)
def translate_description(description: str | None) -> str | None:
    """Translate German dog descriptions to English.

    This handles longer text blocks like adoption descriptions.
    Uses LRU cache for performance.

    Args:
        description: German description text

    Returns:
        English description or original if translation fails
    """
    if not description:
        return None

    # Common phrases in Daisy Family Rescue descriptions
    phrase_translations = {
        "Vermittelt werde ich über": "I am being rehomed through",
        "mit der entsprechenden Erlaubnis nach §11 TierSchG": "with the appropriate permit under §11 Animal Welfare Act",
        "Ich bin gemäß der gesetzlichen Auflagen": "According to legal requirements, I am",
        "mit einem Mikrochip gekennzeichnet": "microchipped",
        "habe einen Heimtierausweis": "have a pet passport",
        "samt gültiger Tollwutimpfung": "with valid rabies vaccination",
        "und Erstimmunisierung": "and primary immunization",
        "Dazu noch ein Blutbild": "Additionally, blood work",
        "sowie Schnelltestung auf Mittelmeerkrankheiten": "as well as rapid testing for Mediterranean diseases",
        "Die Einreise nach Deutschland erfolgt": "Entry to Germany is done",
        "mit einem geprüften und zertifizierten Transport": "with a tested and certified transport",
        "sowie TRACES Papieren": "as well as TRACES papers",
        "Wenn du dich nun in mich verliebt hast": "If you have now fallen in love with me",
        "und mir ein Zuhause schenken möchtest": "and want to give me a home",
        "dann lies einmal aufmerksam alle Infos auf": "then please read all the info carefully at",
        "und fülle dort die Selbstauskunft für mich aus": "and fill out the self-assessment form for me there",
        # Medical terms
        "Leishmaniose": "Leishmaniasis",
        "Herzwurm": "Heartworm",
        "Babesiose": "Babesiosis",
        "Anaplasmose": "Anaplasmosis",
        "Ehrlichiose": "Ehrlichiosis",
        "Borreliose": "Lyme disease",
        "Mikrofilarien": "Microfilaria",
        # Adoption process terms
        "Adoptionsverfahren": "adoption process",
        "Selbstauskunft": "self-assessment",
        "Schutzgebühr": "adoption fee",
        "Vorkontrolle": "pre-check",
        "Nachkontrolle": "follow-up check",
    }

    result = description

    # Apply phrase translations
    for german, english in phrase_translations.items():
        if german in result:
            result = result.replace(german, english)

    return result


def translate_dog_data(dog_data: dict[str, Any]) -> dict[str, Any]:
    """Translate all German content in a dog data dictionary.

    This is the main function to call after scraping to translate all content.
    Preserves original German text alongside translations.

    Args:
        dog_data: Dictionary containing dog information

    Returns:
        Updated dictionary with translated content
    """
    if not dog_data or not isinstance(dog_data, dict):
        return dog_data

    translated_data = dog_data.copy()
    properties = translated_data.get("properties", {})

    # Normalize name
    if translated_data.get("name"):
        normalized_name = normalize_name(translated_data["name"])
        if normalized_name:
            translated_data["name"] = normalized_name

    # Translate main fields
    if translated_data.get("breed"):
        translated_breed = translate_breed(translated_data["breed"])
        if translated_breed and translated_breed != translated_data["breed"]:
            translated_data["breed"] = translated_breed

    if translated_data.get("sex"):
        translated_sex = translate_gender(translated_data["sex"])
        if translated_sex:
            translated_data["sex"] = translated_sex

    if translated_data.get("age_text"):
        translated_age = translate_age(translated_data["age_text"])
        if translated_age:
            translated_data["age_text"] = translated_age

    # Translate properties
    if "german_description" in properties:
        translated_desc = translate_description(properties["german_description"])
        if translated_desc:
            properties["description"] = translated_desc

    if "character_german" in properties:
        translated_char = translate_character_traits(properties["character_german"])
        if translated_char:
            properties["character"] = translated_char

    if "compatibility_german" in properties:
        translated_compat = translate_compatibility(properties["compatibility_german"])
        if translated_compat:
            properties["compatibility"] = translated_compat

    if "origin" in properties:
        translated_origin = translate_location(properties["origin"])
        if translated_origin:
            properties["origin_translated"] = translated_origin

    if "current_location" in properties:
        translated_location = translate_location(properties["current_location"])
        if translated_location:
            properties["current_location_translated"] = translated_location

    if "ideal_home_german" in properties:
        translated_home = translate_ideal_home(properties["ideal_home_german"])
        if translated_home:
            properties["ideal_home"] = translated_home

    # Update properties
    translated_data["properties"] = properties

    return translated_data


def get_translation_cache_stats() -> dict[str, int]:
    """Get statistics about the translation cache.

    Returns:
        Dictionary with cache statistics
    """
    return {
        "cache_size": len(_translation_cache),
        "cache_types": len(set(key.split(":")[0] for key in _translation_cache.keys())),
    }


def clear_translation_cache() -> None:
    """Clear the translation cache."""
    _translation_cache.clear()
