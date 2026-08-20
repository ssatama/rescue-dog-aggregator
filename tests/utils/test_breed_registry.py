"""Tests for the canonical breed registry and resolver.

The resolver replaces a branch chain that title-cased raw text for crossbreeds,
so "Podenco-labrador-mix" became a breed name and a breed page slug.
"""

import pytest

from utils.breed_registry import BreedRegistry, resolve_breed


@pytest.fixture(scope="module")
def registry():
    return BreedRegistry.load()


@pytest.mark.unit
class TestRegistryData:
    def test_registry_loads_breeds_and_designer_breeds(self, registry):
        assert len(registry.breeds) > 100
        assert len(registry.designer_breeds) >= 10

    def test_every_canonical_has_a_unique_slug(self, registry):
        slugs = [b.slug for b in registry.breeds]
        assert len(slugs) == len(set(slugs)), "duplicate slugs collapse distinct breeds"

    def test_no_alias_maps_to_two_different_breeds(self, registry):
        seen: dict[str, str] = {}
        for breed in registry.breeds:
            for alias in breed.aliases:
                assert alias not in seen or seen[alias] == breed.canonical, f"{alias!r} is ambiguous"
                seen[alias] = breed.canonical


@pytest.mark.unit
class TestPurebredResolution:
    @pytest.mark.parametrize(
        ("raw", "canonical"),
        [
            ("Lurcher", "Lurcher"),
            ("Greyhound", "Greyhound"),
            ("german shepherd dog", "German Shepherd Dog"),
            ("  Beagle  ", "Beagle"),
            ("Rottweiller", "Rottweiler"),
            ("staffie", "Staffordshire Bull Terrier"),
            ("SBT", "Staffordshire Bull Terrier"),
            ("amstaff", "American Staffordshire Terrier"),
        ],
    )
    def test_purebred_resolves_to_canonical(self, raw, canonical):
        identity = resolve_breed(raw)
        assert identity.primary == canonical
        assert identity.is_cross is False
        assert identity.breed_type == "purebred"
        assert identity.secondary is None


@pytest.mark.unit
class TestParentheticalForms:
    """Dogs Trust sends 'Type (Variant)', which is 149 distinct values in production."""

    @pytest.mark.parametrize(
        ("raw", "canonical"),
        [
            ("Terrier (Staffordshire Bull)", "Staffordshire Bull Terrier"),
            ("Collie (Border)", "Border Collie"),
            ("Retriever (Labrador)", "Labrador Retriever"),
            ("Spaniel (Cocker)", "Cocker Spaniel"),
            ("Terrier (Jack Russell)", "Jack Russell Terrier"),
            ("Poodle (Miniature)", "Miniature Poodle"),
            ("Chihuahua (Smooth Coat)", "Chihuahua"),
        ],
    )
    def test_parenthetical_resolves(self, raw, canonical):
        assert resolve_breed(raw).primary == canonical

    def test_parenthetical_cross_keeps_the_root_breed(self):
        """The old code produced primary_breed 'Staffordshire Bull Terrier Mix'."""
        identity = resolve_breed("Terrier (Staffordshire Bull) Cross")
        assert identity.primary == "Staffordshire Bull Terrier"
        assert identity.is_cross is True
        assert identity.breed_type == "crossbreed"


@pytest.mark.unit
class TestCrossSuffixDoesNotForkTheBreed:
    @pytest.mark.parametrize("suffix", ["Cross", "cross", "Mix", "mix", "X"])
    def test_suffix_variants_share_one_primary(self, suffix):
        identity = resolve_breed(f"Border Collie {suffix}")
        assert identity.primary == "Border Collie"
        assert identity.is_cross is True

    def test_cross_and_purebred_share_a_slug(self):
        """This is what merges /breeds/border-collie-cross into /breeds/border-collie."""
        assert resolve_breed("Border Collie Cross").slug == resolve_breed("Border Collie").slug


@pytest.mark.unit
class TestTwoBreedCrosses:
    @pytest.mark.parametrize(
        ("raw", "primary", "secondary"),
        [
            ("Bichon Frise x Maltese", "Bichon Frise", "Maltese"),
            ("Maltese x Poodle", "Maltese", "Poodle"),
            ("Beagle X Cavalier King Charles Spaniel", "Beagle", "Cavalier King Charles Spaniel"),
            ("Mastiff x Great Dane", "Mastiff", "Great Dane"),
            ("Collie x Dachshund x Jack Russell Terrier", "Collie", "Dachshund"),
        ],
    )
    def test_both_parents_are_captured(self, raw, primary, secondary):
        identity = resolve_breed(raw)
        assert identity.primary == primary
        assert identity.secondary == secondary
        assert identity.is_cross is True

    def test_third_breed_is_dropped_rather_than_guessed(self):
        """Two slots exist; a third parent has nowhere to go."""
        identity = resolve_breed("Collie x Dachshund x Jack Russell Terrier")
        assert (identity.primary, identity.secondary) == ("Collie", "Dachshund")

    def test_secondary_is_never_the_literal_mixed_breed(self):
        """Every crossbreed row in production had secondary_breed = 'Mixed Breed'."""
        assert resolve_breed("Labrador Retriever Cross").secondary is None


@pytest.mark.unit
class TestDesignerBreedsKeepTheirIdentity:
    """Cockapoos were filed under /breeds/cocker-spaniel and displayed as Cocker Spaniel."""

    @pytest.mark.parametrize(
        ("raw", "canonical", "parents"),
        [
            ("Cockapoo", "Cockapoo", ("Cocker Spaniel", "Poodle")),
            ("Cavachon", "Cavachon", ("Cavalier King Charles Spaniel", "Bichon Frise")),
            ("Labradoodle", "Labradoodle", ("Labrador Retriever", "Poodle")),
        ],
    )
    def test_designer_breed_is_its_own_primary(self, raw, canonical, parents):
        identity = resolve_breed(raw)
        assert identity.primary == canonical
        assert identity.parents == parents
        assert identity.is_cross is True

    def test_designer_slug_is_not_the_parent_slug(self):
        assert resolve_breed("Cockapoo").slug == "cockapoo"
        assert resolve_breed("Cockapoo").slug != resolve_breed("Cocker Spaniel").slug


@pytest.mark.unit
class TestGenericAndUnknown:
    @pytest.mark.parametrize("raw", ["Mixed Breed", "Crossbreed", "Mix", "mongrel", "Cross"])
    def test_generic_mixed_has_no_identifiable_breed(self, raw):
        identity = resolve_breed(raw)
        assert identity.primary is None
        assert identity.breed_type == "mixed"
        assert identity.is_cross is True

    @pytest.mark.parametrize("raw", ["Can be the only dog", "N/A", "TBC", "not specified", "", None])
    def test_junk_resolves_to_unknown(self, raw):
        identity = resolve_breed(raw)
        assert identity.primary is None
        assert identity.breed_type == "unknown"

    def test_unrecognised_breed_is_unknown_not_titlecased_raw_text(self):
        """The old code returned 'Mixed Breed (possibly Brittany Spaniel-pointer Mix)'."""
        identity = resolve_breed("Mixed Breed (possibly Brittany Spaniel-pointer Mix)")
        assert identity.primary != "Mixed Breed (Possibly Brittany Spaniel-Pointer Mix)"


@pytest.mark.unit
class TestNoiseInRealInputs:
    def test_leading_qualifier_is_ignored(self):
        assert resolve_breed("Vermutlich Grand Basset Griffon Vendéen").is_cross is False

    def test_embedded_breed_in_a_sentence_is_found(self):
        identity = resolve_breed("Mixed Breed (Podenco or Mastin, found with two mothers)")
        assert identity.primary == "Podenco"

    def test_hyphenated_lowercase_input(self):
        identity = resolve_breed("podenco-labrador-mix")
        assert identity.primary == "Podenco"
        assert identity.secondary == "Labrador Retriever"
        assert identity.is_cross is True


@pytest.mark.unit
class TestUnregisteredBreedsAreNotLost:
    """A clean, unrecognised breed name must survive rather than become Unknown.

    The previous implementation title-cased any unmatched text, which produced
    junk breed pages, but it did keep real breeds the registry lacks.
    """

    @pytest.mark.parametrize("raw", ["Korean Jindo", "Carrea Castellano", "Perro de Agua"])
    def test_clean_unregistered_name_is_kept_with_low_confidence(self, raw):
        identity = resolve_breed(raw)
        assert identity.primary is not None
        assert identity.confidence <= 0.5
        assert identity.breed_type == "unknown"

    @pytest.mark.parametrize("raw", ["Unlisted", "European", "Tofu", "Can be the only dog"])
    def test_non_breed_text_still_resolves_to_unknown(self, raw):
        assert resolve_breed(raw).primary is None

    def test_long_descriptive_text_is_not_promoted_to_a_breed(self):
        identity = resolve_breed("Mixed Breed (possibly Brittany Spaniel-pointer Mix)")
        assert identity.primary in (None, "Brittany", "Pointer")


@pytest.mark.unit
class TestRegistryCoversProductionBreeds:
    @pytest.mark.parametrize(
        ("raw", "canonical"),
        [
            ("Schnauzer", "Schnauzer"),
            ("Newfoundland", "Newfoundland"),
            ("Bullmastiff", "Bullmastiff"),
            ("Deerhound", "Deerhound"),
            ("Old English Sheepdog", "Old English Sheepdog"),
            ("Boerboel", "Boerboel"),
            ("Chinese Crested", "Chinese Crested"),
            ("Hungarian Vizsla", "Hungarian Vizsla"),
            ("Dackel", "Dachshund"),
            ("Dalmatiner", "Dalmatian"),
            ("Deutsch Kurzhaar", "German Shorthaired Pointer"),
            ("Cavashon", "Cavachon"),
        ],
    )
    def test_breed_seen_in_production_resolves(self, raw, canonical):
        assert resolve_breed(raw).primary == canonical

    def test_german_mischling_is_a_cross_marker(self):
        identity = resolve_breed("Labradormischling")
        assert identity.primary == "Labrador Retriever"
        assert identity.is_cross is True

    @pytest.mark.parametrize("qualifier", ["Vermutlich", "Wahrscheinlich", "Similar", "Possibly"])
    def test_leading_qualifier_does_not_block_the_match(self, qualifier):
        assert resolve_breed(f"{qualifier} Newfoundland").primary == "Newfoundland"


@pytest.mark.unit
class TestBreedTypeTaxonomy:
    """breed_type says how the breed was arrived at, never what kind it is."""

    def test_resolver_never_emits_a_category_as_a_type(self, registry):
        """Lurchers used to carry breed_type 'sighthound', so the Crossbreed
        filter silently excluded every Lurcher cross."""
        for raw in ["Lurcher", "Lurcher Cross", "Greyhound", "Whippet", "Galgo"]:
            assert resolve_breed(raw).breed_type in {"purebred", "crossbreed", "mixed", "unknown"}

    def test_lurcher_cross_is_a_crossbreed(self):
        identity = resolve_breed("Lurcher Cross")
        assert identity.breed_type == "crossbreed"
        assert identity.is_cross is True

    def test_every_registry_group_has_one_spelling(self, registry):
        """'Designer' and 'Designer/Hybrid' both existed for the same concept."""
        groups = {b.group for b in registry.breeds} | {b.group for b in registry.designer_breeds}
        assert "Designer" not in groups
        assert "Designer/Hybrid" in groups

    def test_designer_breeds_share_one_group(self, registry):
        assert {b.group for b in registry.designer_breeds} == {"Designer/Hybrid"}
