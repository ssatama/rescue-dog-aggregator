"""Photo galleries in animals.images (#487): order, cap, quality floor, idempotence."""

from io import BytesIO
from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError
from PIL import Image

from services.image_processing_service import MAX_GALLERY_PHOTOS, ImageProcessingService, build_gallery
from utils.r2_service import R2Service

HERO = "https://rescue.example/dogs/rex/hero.jpg"


def photo(source: str, width: int = 800, height: int = 600) -> dict:
    return {"url": f"https://images.rescuedogs.me/{source.rsplit('/', 1)[-1]}", "original_url": source, "width": width, "height": height}


def service_uploading(photos_by_source: dict) -> tuple[ImageProcessingService, Mock]:
    r2 = Mock()
    r2.upload_image_with_size.side_effect = lambda source, name, org: photos_by_source.get(source)
    return ImageProcessingService(r2_service=r2), r2


@pytest.mark.unit
class TestBuildGallery:
    def test_keeps_the_rescue_order_hero_first(self):
        sources = [HERO, "https://rescue.example/2.jpg", "https://rescue.example/3.jpg"]
        photos = {s: photo(s) for s in sources}

        assert [p["original_url"] for p in build_gallery(sources, photos)] == sources

    def test_caps_at_eight_photos(self):
        sources = [f"https://rescue.example/{i}.jpg" for i in range(12)]

        gallery = build_gallery(sources, {s: photo(s) for s in sources})

        assert len(gallery) == MAX_GALLERY_PHOTOS
        assert gallery[-1]["original_url"] == sources[7]

    def test_drops_photos_under_the_quality_floor(self):
        small = "https://rescue.example/thumb.jpg"
        photos = {HERO: photo(HERO), small: photo(small, 280, 210)}

        assert [p["original_url"] for p in build_gallery([HERO, small], photos)] == [HERO]

    def test_keeps_a_small_photo_when_it_is_the_only_one(self):
        assert build_gallery([HERO], {HERO: photo(HERO, 200, 150)}) == [photo(HERO, 200, 150)]

    def test_skips_photos_that_could_not_be_fetched(self):
        second = "https://rescue.example/2.jpg"

        assert build_gallery([HERO, second], {second: photo(second)}) == [photo(second)]

    def test_nothing_usable_means_no_gallery(self):
        assert build_gallery([HERO], {}) is None


@pytest.mark.unit
class TestBatchProcessGalleries:
    def test_a_dog_with_one_photo_gets_a_one_element_array(self):
        service, _ = service_uploading({HERO: photo(HERO)})
        dog = {"name": "Rex", "external_id": "rex", "primary_image_url": HERO}

        service.batch_process_galleries([dog], {})

        assert dog["images"] == [photo(HERO)]

    def test_the_hero_source_comes_from_original_image_url_after_upload(self):
        service, r2 = service_uploading({HERO: photo(HERO)})
        dog = {"name": "Rex", "primary_image_url": "https://images.rescuedogs.me/rex.jpg", "original_image_url": HERO}

        service.batch_process_galleries([dog], {})

        r2.upload_image_with_size.assert_called_once_with(HERO, "Rex", "unknown")

    def test_stored_photos_are_reused_without_any_network_call(self):
        second = "https://rescue.example/2.jpg"
        stored = [photo(HERO), photo(second)]
        service, r2 = service_uploading({})
        dog = {"name": "Rex", "external_id": "rex", "primary_image_url": HERO, "image_urls": [HERO, second]}

        service.batch_process_galleries([dog], {"rex": stored})

        r2.upload_image_with_size.assert_not_called()
        assert dog["images"] == stored

    def test_a_changed_gallery_is_rewritten_not_appended(self):
        gone = "https://rescue.example/old.jpg"
        new = "https://rescue.example/new.jpg"
        service, _ = service_uploading({new: photo(new)})
        dog = {"name": "Rex", "external_id": "rex", "primary_image_url": HERO, "image_urls": [HERO, new]}

        service.batch_process_galleries([dog], {"rex": [photo(HERO), photo(gone)]})

        assert [p["original_url"] for p in dog["images"]] == [HERO, new]

    def test_a_photo_shared_by_two_dogs_is_uploaded_once(self):
        shared = "https://rescue.example/litter.jpg"
        service, r2 = service_uploading({shared: photo(shared)})
        dogs = [{"name": n, "primary_image_url": shared} for n in ("Rex", "Max")]

        service.batch_process_galleries(dogs, {})

        assert r2.upload_image_with_size.call_count == 1
        assert all(d["images"] == [photo(shared)] for d in dogs)

    def test_a_dog_without_photos_keeps_what_is_stored(self):
        service, _ = service_uploading({})
        dog = {"name": "Rex", "external_id": "rex"}

        service.batch_process_galleries([dog], {"rex": [photo(HERO)]})

        assert "images" not in dog


def _jpeg(width: int, height: int, orientation: int | None = None) -> bytes:
    buffer = BytesIO()
    image = Image.new("RGB", (width, height))
    exif = Image.Exif()
    if orientation:
        exif[0x0112] = orientation
    image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


@pytest.mark.unit
class TestUploadImageWithSize:
    @pytest.fixture
    def s3(self):
        client = Mock()
        with (
            patch.object(R2Service, "_check_configuration", return_value=True),
            patch.object(R2Service, "is_circuit_breaker_open", return_value=False),
            patch.object(R2Service, "_get_s3_client", return_value=client),
            patch.object(R2Service, "_build_custom_domain_url", side_effect=lambda key: f"https://images.rescuedogs.me/{key}"),
        ):
            yield client

    def test_an_already_measured_photo_costs_one_head_request(self, s3):
        s3.head_object.return_value = {"Metadata": {"width": "640", "height": "480"}}

        with patch("utils.r2_service.requests.get") as download:
            result = R2Service.upload_image_with_size(HERO, "Rex", "Rescue")

        download.assert_not_called()
        s3.upload_fileobj.assert_not_called()
        assert (result["width"], result["height"], result["original_url"]) == (640, 480, HERO)

    def test_a_new_photo_is_measured_and_stored_with_its_size(self, s3):
        s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        response = Mock(content=_jpeg(1200, 900), headers={"content-type": "image/jpeg"})

        with patch("utils.r2_service.requests.get", return_value=response):
            result = R2Service.upload_image_with_size(HERO, "Rex", "Rescue")

        assert (result["width"], result["height"]) == (1200, 900)
        metadata = s3.upload_fileobj.call_args.kwargs["ExtraArgs"]["Metadata"]
        assert (metadata["width"], metadata["height"]) == ("1200", "900")

    def test_a_photo_stored_by_the_hero_upload_gets_its_size_recorded_not_reuploaded(self, s3):
        s3.head_object.return_value = {"Metadata": {"original_url": HERO}}
        response = Mock(content=_jpeg(1024, 768), headers={"content-type": "image/jpeg"})

        with patch("utils.r2_service.requests.get", return_value=response):
            result = R2Service.upload_image_with_size(HERO, "Rex", "Rescue")

        assert (result["width"], result["height"]) == (1024, 768)
        s3.upload_fileobj.assert_not_called()
        metadata = s3.copy_object.call_args.kwargs["Metadata"]
        assert (metadata["width"], metadata["height"]) == ("1024", "768")

    def test_a_non_image_response_is_skipped(self, s3):
        s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        response = Mock(content=b"<html>", headers={"content-type": "text/html"})

        with patch("utils.r2_service.requests.get", return_value=response):
            assert R2Service.upload_image_with_size(HERO, "Rex", "Rescue") is None

        s3.upload_fileobj.assert_not_called()

    def test_an_unexpected_error_skips_the_photo_not_the_run(self, s3):
        s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        s3.upload_fileobj.side_effect = ConnectionError("R2 endpoint unreachable")
        response = Mock(content=_jpeg(1200, 900), headers={"content-type": "image/jpeg"})

        with patch("utils.r2_service.requests.get", return_value=response):
            assert R2Service.upload_image_with_size(HERO, "Rex", "Rescue") is None

    def test_a_connection_error_on_the_head_request_skips_the_photo(self, s3):
        from botocore.exceptions import EndpointConnectionError

        s3.head_object.side_effect = EndpointConnectionError(endpoint_url="https://r2.example")

        assert R2Service.upload_image_with_size(HERO, "Rex", "Rescue") is None

    def test_bad_size_metadata_skips_the_photo(self, s3):
        s3.head_object.return_value = {"Metadata": {"width": "wide", "height": "480"}}

        assert R2Service.upload_image_with_size(HERO, "Rex", "Rescue") is None


@pytest.mark.unit
def test_one_failing_photo_does_not_cost_the_rest_of_the_batch():
    second = "https://rescue.example/2.jpg"
    third = "https://rescue.example/3.jpg"

    def upload(source, name, org):
        if source == second:
            raise RuntimeError("boom")
        return photo(source)

    r2 = Mock()
    r2.upload_image_with_size.side_effect = upload
    dog = {"name": "Rex", "primary_image_url": HERO, "image_urls": [HERO, second, third]}

    ImageProcessingService(r2_service=r2).batch_process_galleries([dog], {})

    assert dog["images"] == [photo(HERO), photo(third)]


@pytest.mark.unit
def test_a_dog_whose_hero_failed_this_run_keeps_its_stored_gallery():
    second = "https://rescue.example/2.jpg"
    r2 = Mock()
    r2.upload_image_with_size.side_effect = lambda source, name, org: None if source == HERO else photo(source)
    dog = {"name": "Rex", "primary_image_url": HERO, "image_urls": [HERO, second]}

    ImageProcessingService(r2_service=r2).batch_process_galleries([dog], {})

    assert "images" not in dog


@pytest.mark.unit
def test_a_hero_upload_records_its_size_so_the_gallery_step_needs_no_second_write():
    s3 = Mock()
    s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
    response = Mock(content=_jpeg(640, 480), headers={"content-type": "image/jpeg"}, status_code=200)
    with (
        patch.object(R2Service, "_check_configuration", return_value=True),
        patch.object(R2Service, "_get_s3_client", return_value=s3),
        patch.object(R2Service, "_enforce_rate_limit"),
        patch("utils.r2_service.requests.get", return_value=response),
    ):
        R2Service.upload_image_from_url(HERO, "Rex", "Rescue")

    metadata = s3.upload_fileobj.call_args.kwargs["ExtraArgs"]["Metadata"]
    assert (metadata["width"], metadata["height"]) == ("640", "480")


@pytest.mark.unit
def test_galleries_are_skipped_when_r2_is_not_configured():
    r2 = Mock()
    r2.prepare_for_parallel_uploads.return_value = False
    dog = {"name": "Rex", "primary_image_url": HERO}

    ImageProcessingService(r2_service=r2).batch_process_galleries([dog], {})

    r2.upload_image_with_size.assert_not_called()
    assert "images" not in dog


@pytest.mark.unit
def test_a_dog_without_a_gallery_is_not_skipped_by_a_skip_existing_scrape():
    """Galleries fill in, and failed ones retry, on normal runs, not only forced ones."""
    from services.database_service import DatabaseService

    cursor = Mock()
    cursor.fetchall.return_value = [("has-gallery",)]
    service = DatabaseService(db_config={"host": "localhost", "database": "test"})
    service.conn = Mock(cursor=Mock(return_value=cursor))

    assert service.get_existing_external_ids(1) == {"has-gallery"}
    assert "images IS NOT NULL" in cursor.execute.call_args.args[0]


@pytest.mark.unit
def test_a_phone_photo_rotated_by_exif_is_measured_as_displayed():
    """Stored 4:3 landscape with "rotate 90°": a browser shows it portrait."""
    s3 = Mock()
    s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
    response = Mock(content=_jpeg(1200, 900, orientation=6), headers={"content-type": "image/jpeg"})
    with (
        patch.object(R2Service, "_check_configuration", return_value=True),
        patch.object(R2Service, "is_circuit_breaker_open", return_value=False),
        patch.object(R2Service, "_get_s3_client", return_value=s3),
        patch("utils.r2_service.requests.get", return_value=response),
    ):
        result = R2Service.upload_image_with_size(HERO, "Rex", "Rescue")

    assert (result["width"], result["height"]) == (900, 1200)
