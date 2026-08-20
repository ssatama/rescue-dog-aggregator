"""Tests for breed slug generation.

Slugs become URL path segments on /breeds/[slug], so any character that
survives into the output has to be safe there.
"""

import pytest

from utils.breed_utils import generate_breed_slug


@pytest.mark.unit
class TestGenerateBreedSlugAscii:
    """Accented and non-ASCII breed names must transliterate, not lose characters."""

    @pytest.mark.parametrize(
        ("breed", "expected"),
        [
            ("Galgo Español", "galgo-espanol"),
            ("Schäferhundmix", "schaferhundmix"),
            ("Vermutlich Grand Basset Griffon Vendéen", "vermutlich-grand-basset-griffon-vendeen"),
            ("Pyrenäenberghund", "pyrenaenberghund"),
            ("Rumänischer Hirtenhund", "rumanischer-hirtenhund"),
            ("Labrador + Bretón Español Mix", "labrador-breton-espanol-mix"),
        ],
    )
    def test_accents_transliterate_to_ascii(self, breed, expected):
        assert generate_breed_slug(breed) == expected

    def test_sharp_s_becomes_ss(self):
        assert generate_breed_slug("Bayrischer Gebirgsschweißhund") == "bayrischer-gebirgsschweisshund"

    @pytest.mark.parametrize(
        "breed",
        [
            "Galgo Español",
            'Mixed Breed "quoted“ name',
            "​​spanischer Water Dog",
            "Yugoslavian Shepherd Dog Â Sharplanina",
            "Mixed Breed (körperbau Ist Der Eines Podencos)",
        ],
    )
    def test_output_is_always_url_safe(self, breed):
        """Only lowercase alphanumerics and single hyphens may reach a URL."""
        slug = generate_breed_slug(breed)
        assert slug.isascii(), f"non-ascii survived: {slug!r}"
        assert all(c.islower() or c.isdigit() or c == "-" for c in slug), f"unsafe char in {slug!r}"
        assert not slug.startswith("-") and not slug.endswith("-")
        assert "--" not in slug

    def test_quotes_are_stripped_not_passed_through(self):
        assert generate_breed_slug('"mini“ Border Collie Mix') == "mini-border-collie-mix"

    def test_zero_width_characters_removed(self):
        assert generate_breed_slug("​​spanischer Water Dog") == "spanischer-water-dog"


@pytest.mark.unit
class TestGenerateBreedSlugUnchangedBehaviour:
    """Existing ASCII behaviour must not regress."""

    @pytest.mark.parametrize(
        ("breed", "expected"),
        [
            ("Collie Mix", "collie-mix"),
            ("German Shepherd", "german-shepherd"),
            ("Jack Russell Terrier", "jack-russell-terrier"),
            ("Staffordshire Bull Terrier", "staffordshire-bull-terrier"),
            ("Mixed Breed", "mixed-breed"),
        ],
    )
    def test_ascii_breeds_unchanged(self, breed, expected):
        assert generate_breed_slug(breed) == expected

    def test_empty_input_returns_empty_string(self):
        assert generate_breed_slug("") == ""

    def test_name_that_reduces_to_nothing_returns_empty_string(self):
        assert generate_breed_slug("###") == ""
