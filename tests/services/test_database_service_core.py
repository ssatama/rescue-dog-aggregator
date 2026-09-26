"""Every write path to the animals table runs through DatabaseService.

Coverage sat at 19%. These target the decisions rather than the SQL: whether an
existing animal is seen as changed, and whether a failing query degrades or
propagates. Both are silent when wrong - a dog simply stops updating, or a
scrape reports success having written nothing.

The change check is exercised through update_animal rather than a helper. An
earlier `_detect_animal_changes` method sat beside it comparing 11 of the 17
columns the live SELECT reads, with no caller at all; testing that would have
pinned a decision production never makes. It is deleted.
"""

import logging
from unittest.mock import Mock, patch

import pytest

from services.database_service import DatabaseService, _as_float

# Column order of update_animal's SELECT. A drift here shifts every later
# value, which is how #349's positional assertions rotted.
CURRENT_ROW = (
    "Bella",  # name
    "Beagle",  # breed
    "2 years",  # age_text
    "Female",  # sex
    "http://img/1.jpg",  # primary_image_url
    "available",  # status
    "Beagle",  # standardized_breed
    24,  # age_min_months
    24,  # age_max_months
    "Medium",  # standardized_size
    None,  # properties
    "purebred",  # breed_type
    "Beagle",  # primary_breed
    None,  # secondary_breed
    "beagle",  # breed_slug
    0.9,  # breed_confidence
    "Beagle",  # breed_raw
    [{"url": "https://images.rescuedogs.me/a.jpg", "original_url": "http://img/1.jpg", "width": 800, "height": 600}],  # images
)

INCOMING = {
    "name": "Bella",
    "breed": "Beagle",
    "age_text": "2 years",
    "sex": "Female",
    "primary_image_url": "http://img/1.jpg",
    "status": "available",
    "standardized_breed": "Beagle",
    "age_min_months": 24,
    "age_max_months": 24,
    "standardized_size": "Medium",
    "breed_type": "purebred",
    "primary_breed": "Beagle",
    "secondary_breed": None,
    "breed_slug": "beagle",
    "breed_confidence": 0.9,
    "breed_raw": "Beagle",
}


@pytest.fixture
def service():
    return DatabaseService(db_config={"host": "localhost", "database": "test"}, logger=logging.getLogger("test"))


def update_with(service, row=CURRENT_ROW, **overrides):
    """Drive update_animal against a mocked row and report its verdict."""
    cursor = Mock()
    cursor.fetchone.return_value = row
    service.conn = Mock(cursor=Mock(return_value=cursor))

    return service.update_animal(1, {**INCOMING, **overrides})[1]


@pytest.mark.unit
class TestUpdateAnimalChangeDetection:
    """The gate on every update. A false negative freezes a dog's data."""

    def test_identical_data_writes_nothing(self, service):
        assert update_with(service) == "no_change"

    @pytest.mark.parametrize(
        "field,new_value",
        [
            ("name", "Bello"),
            ("breed", "Labrador Retriever"),
            ("age_text", "3 years"),
            ("sex", "Male"),
            ("primary_image_url", "http://img/2.jpg"),
            ("status", "adopted"),
            ("standardized_size", "Large"),
            ("breed_type", "crossbreed"),
            ("primary_breed", "Labrador Retriever"),
            ("secondary_breed", "Poodle"),
            ("breed_slug", "labrador-retriever"),
            ("breed_raw", "Beagle Mix"),
        ],
    )
    def test_a_changed_field_is_written(self, service, field, new_value):
        assert update_with(service, **{field: new_value}) == "updated"

    def test_a_renamed_dog_keeps_its_slug(self, service):
        """#505 cleans names at scrape time ("Ally OVERLOOKED" -> "Ally"); the URL must not move."""
        cursor = Mock()
        cursor.fetchone.return_value = CURRENT_ROW
        service.conn = Mock(cursor=Mock(return_value=cursor))

        service.update_animal(1, {**INCOMING, "name": "Bell"})

        update_sql = next(c.args[0] for c in cursor.execute.call_args_list if "UPDATE animals" in c.args[0])
        assert "slug =" not in update_sql.replace("breed_slug =", "")

    def test_a_scrape_without_a_gallery_keeps_the_stored_one(self, service):
        """No "images" key means the gallery step had nothing new, not "delete it"."""
        assert update_with(service) == "no_change"

    def test_the_same_gallery_writes_nothing(self, service):
        assert update_with(service, images=list(CURRENT_ROW[-1])) == "no_change"

    def test_a_changed_gallery_is_written(self, service):
        second = {"url": "https://images.rescuedogs.me/b.jpg", "original_url": "http://img/2.jpg", "width": 800, "height": 600}
        assert update_with(service, images=[*CURRENT_ROW[-1], second]) == "updated"

    def test_an_age_that_was_never_known_and_still_is_not_writes_nothing(self, service):
        """Both sides NULL after the fabricated-age backfill. Must not churn."""
        row = (*CURRENT_ROW[:2], None, *CURRENT_ROW[3:])

        assert update_with(service, row=row, age_text=None) == "no_change"

    def test_clearing_a_fabricated_age_is_written(self, service):
        """A scraper that stopped inventing 'Unknown' must be able to write NULL."""
        row = (*CURRENT_ROW[:2], "Unknown", *CURRENT_ROW[3:])

        assert update_with(service, row=row, age_text=None) == "updated"

    def test_breed_confidence_compares_numerically_not_as_text(self, service):
        """The column used to hold text; '0.9' and 0.9 are the same confidence."""
        assert update_with(service, breed_confidence="0.9") == "no_change"

    def test_a_real_confidence_change_is_written(self, service):
        assert update_with(service, breed_confidence=0.4) == "updated"

    def test_a_missing_animal_is_an_error_not_a_silent_success(self, service):
        cursor = Mock()
        cursor.fetchone.return_value = None
        service.conn = Mock(cursor=Mock(return_value=cursor))

        assert service.update_animal(1, INCOMING) == (None, "error")

    def test_no_connection_is_an_error_not_a_silent_success(self, service):
        with patch.object(service, "connect", return_value=False):
            assert service.update_animal(1, INCOMING) == (None, "error")

    def test_a_short_row_is_an_error_rather_than_a_shifted_comparison(self, service):
        """If the SELECT loses a column, unpacking must not compare the wrong pairs."""
        assert update_with(service, row=CURRENT_ROW[:-1]) == "error"


@pytest.mark.unit
class TestAsFloat:
    """availability_confidence used to be text; comparisons must stay numeric."""

    @pytest.mark.parametrize("value,expected", [(1, 1.0), (0.5, 0.5), ("0.75", 0.75), ("1", 1.0)])
    def test_numeric_values_convert(self, value, expected):
        assert _as_float(value) == expected

    @pytest.mark.parametrize("value", [None, "high", "", object()])
    def test_anything_uncomparable_becomes_none_rather_than_raising(self, value):
        assert _as_float(value) is None


@pytest.mark.unit
class TestReadPathsDegradeRatherThanRaise:
    """A scrape must not die because a read failed, but it must not lie either."""

    def test_existing_animal_lookup_returns_none_on_a_query_error(self, service):
        service.conn = Mock()
        service.conn.cursor.side_effect = RuntimeError("connection reset")

        assert service.get_existing_animal("ext-1", 1) is None

    def test_existing_animal_lookup_returns_the_row_it_found(self, service):
        cursor = Mock()
        cursor.fetchone.return_value = (7, "Bella", "2026-08-22")
        service.conn = Mock(cursor=Mock(return_value=cursor))

        assert service.get_existing_animal("ext-1", 1) == (7, "Bella", "2026-08-22")

    def test_external_id_lookup_drops_nulls_rather_than_returning_them(self, service):
        cursor = Mock()
        cursor.fetchall.return_value = [("rean-a",), (None,), ("rean-b",)]
        service.conn = Mock(cursor=Mock(return_value=cursor))

        assert service.get_existing_external_ids(1) == {"rean-a", "rean-b"}

    def test_external_id_lookup_only_counts_available_animals(self, service):
        """An inactive dog back on the site must be processed so it can be reactivated."""
        cursor = Mock()
        cursor.fetchall.return_value = []
        service.conn = Mock(cursor=Mock(return_value=cursor))

        service.get_existing_external_ids(5)

        sql, params = cursor.execute.call_args.args
        assert "SELECT external_id FROM animals" in sql
        assert "status = 'available'" in sql
        assert params == (5,)

    def test_external_id_lookup_leaves_out_dogs_whose_image_is_not_on_the_cdn(self, service):
        """A skip-existing scrape must reprocess a dog whose image upload failed (#457)."""
        cursor = Mock()
        cursor.fetchall.return_value = []
        service.conn = Mock(cursor=Mock(return_value=cursor))

        service.get_existing_external_ids(28)

        sql, _ = cursor.execute.call_args.args
        assert "primary_image_url LIKE 'https://images.rescuedogs.me/%%'" in sql

    def test_external_id_lookup_returns_an_empty_set_on_a_query_error(self, service):
        """An empty set means 'nothing seen'; it must not be a partial answer."""
        service.conn = Mock()
        service.conn.cursor.side_effect = RuntimeError("connection reset")

        assert service.get_existing_external_ids(1) == set()

    def test_external_id_lookup_gives_up_when_it_cannot_connect(self, service):
        with patch.object(service, "connect", return_value=False):
            assert service.get_existing_external_ids(1) == set()

    def test_slug_lookup_short_circuits_on_an_empty_id_list(self, service):
        """Must not open a connection to resolve nothing."""
        with patch.object(service, "connect") as connect:
            assert service.get_slugs_for_animals([]) == []
            connect.assert_not_called()

    def test_slug_lookup_gives_up_when_it_cannot_connect(self, service):
        with patch.object(service, "connect", return_value=False):
            assert service.get_slugs_for_animals([1, 2]) == []

    def test_slug_lookup_delegates_to_the_shared_query(self, service):
        service.conn = Mock()
        with patch("services.database_service.fetch_slugs_by_ids", return_value=["bella", "bello"]) as fetch:
            assert service.get_slugs_for_animals([1, 2]) == ["bella", "bello"]
            fetch.assert_called_once_with(service.conn, [1, 2])
