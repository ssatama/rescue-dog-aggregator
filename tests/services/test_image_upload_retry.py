"""A failed CDN upload must be retried on the next scrape, not kept forever (#457)."""

from unittest.mock import Mock

import pytest

from services.image_processing_service import ImageProcessingService

SOURCE = "https://www.dogstrust.org.uk/images/800x600/dogs/3662774/068Tf00000eYhBiIAK.jpg"
CDN = "https://images.rescuedogs.me/dogs-trust/dolly.jpg"


def _service_and_connection(stored_primary, stored_original):
    r2 = Mock()
    r2.upload_image_with_circuit_breaker.return_value = (CDN, True)
    cursor = Mock()
    cursor.fetchone.return_value = (stored_primary, stored_original)
    connection = Mock(cursor=Mock(return_value=cursor))
    return ImageProcessingService(r2_service=r2), r2, connection


@pytest.mark.unit
class TestPrimaryImageUploadRetry:
    def test_unchanged_source_already_on_cdn_is_reused(self):
        service, r2, connection = _service_and_connection(CDN, SOURCE)

        result = service.process_primary_image({"name": "Dolly", "primary_image_url": SOURCE}, (11271,), connection)

        assert result["primary_image_url"] == CDN
        r2.upload_image_with_circuit_breaker.assert_not_called()

    def test_unchanged_source_left_off_cdn_by_a_failed_upload_is_retried(self):
        service, r2, connection = _service_and_connection(SOURCE, SOURCE)

        result = service.process_primary_image({"name": "Dolly", "primary_image_url": SOURCE}, (11271,), connection)

        r2.upload_image_with_circuit_breaker.assert_called_once()
        assert result["primary_image_url"] == CDN
        assert result["original_image_url"] == SOURCE

    def test_changed_source_is_uploaded(self):
        service, r2, connection = _service_and_connection(CDN, SOURCE)
        new_source = SOURCE.replace("eYhBiIAK", "egy92IAA")

        result = service.process_primary_image({"name": "Dolly", "primary_image_url": new_source}, (11271,), connection)

        r2.upload_image_with_circuit_breaker.assert_called_once()
        assert result["original_image_url"] == new_source
