"""Pre-generated WebP variants replace Cloudflare's billed transformations (#761)."""

from io import BytesIO
from unittest.mock import MagicMock

import pytest
from PIL import Image

from utils.image_variants import VARIANT_WIDTHS, make_variants, nearest_variant_width, variant_key
from utils.r2_service import R2Service

pytestmark = pytest.mark.unit


def _jpeg(width: int, height: int) -> bytes:
    out = BytesIO()
    Image.new("RGB", (width, height), "tan").save(out, format="JPEG")
    return out.getvalue()


def test_variant_key_sits_next_to_the_original():
    assert variant_key("rescue_dogs/dogs_trust/dulci_734f1006.jpg", 640) == "rescue_dogs/dogs_trust/dulci_734f1006_w640.webp"


@pytest.mark.parametrize(("requested", "width"), [(1, 320), (320, 320), (321, 640), (1080, 1200), (3000, 1200)])
def test_nearest_variant_is_the_smallest_wide_enough(requested, width):
    assert nearest_variant_width(requested) == width


def test_variants_scale_down_keep_aspect_and_never_upscale():
    variants = make_variants(_jpeg(800, 600))
    assert set(variants) == set(VARIANT_WIDTHS)
    sizes = {w: Image.open(BytesIO(data)).size for w, data in variants.items()}
    assert sizes[320] == (320, 240)
    assert sizes[640] == (640, 480)
    # Narrower than 1200: stored at its own size, so the 1200 key still exists
    assert sizes[1200] == (800, 600)
    assert all(Image.open(BytesIO(data)).format == "WEBP" for data in variants.values())


def test_transparent_logos_keep_their_alpha():
    out = BytesIO()
    Image.new("RGBA", (100, 100), (0, 0, 0, 0)).save(out, format="PNG")
    assert Image.open(BytesIO(make_variants(out.getvalue())[320])).mode == "RGBA"


def test_upload_variants_writes_one_object_per_width():
    s3 = MagicMock()
    assert R2Service.upload_variants(s3, "bucket", "rescue_dogs/org/rex_1.jpg", _jpeg(1600, 1200))
    keys = sorted(call.kwargs["Key"] for call in s3.put_object.call_args_list)
    assert keys == sorted(f"rescue_dogs/org/rex_1_w{w}.webp" for w in VARIANT_WIDTHS)
    assert {call.kwargs["ContentType"] for call in s3.put_object.call_args_list} == {"image/webp"}


def test_upload_variants_never_raises():
    s3 = MagicMock()
    assert R2Service.upload_variants(s3, "bucket", "k.jpg", b"not an image") is False
    s3.put_object.assert_not_called()


def _client_error(code: str):
    from botocore.exceptions import ClientError

    return ClientError({"Error": {"Code": code}}, "op")


def test_backfill_skips_images_that_already_have_variants():
    from management.backfill_image_variants import backfill_one

    s3 = MagicMock()
    assert backfill_one(s3, "bucket", "rescue_dogs/org/rex_1.jpg") == "skipped"
    s3.get_object.assert_not_called()


def test_backfill_creates_missing_variants_and_reports_missing_originals():
    from management.backfill_image_variants import backfill_one

    s3 = MagicMock()
    s3.head_object.side_effect = _client_error("404")
    s3.get_object.return_value = {"Body": BytesIO(_jpeg(900, 600))}
    assert backfill_one(s3, "bucket", "rescue_dogs/org/rex_1.jpg") == "created"
    assert s3.put_object.call_count == len(VARIANT_WIDTHS)

    s3.get_object.side_effect = _client_error("NoSuchKey")
    assert backfill_one(s3, "bucket", "rescue_dogs/org/gone.jpg") == "missing"


def test_png_logos_with_trns_transparency_stay_transparent():
    out = BytesIO()
    img = Image.new("RGB", (100, 100), (255, 255, 255))
    img.save(out, format="PNG", transparency=(255, 255, 255))
    assert Image.open(BytesIO(make_variants(out.getvalue())[320])).mode == "RGBA"


def test_colour_profile_is_kept():
    from PIL import ImageCms

    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    out = BytesIO()
    Image.new("RGB", (400, 300), "tan").save(out, format="JPEG", icc_profile=profile)
    assert Image.open(BytesIO(make_variants(out.getvalue())[320])).info.get("icc_profile") == profile


def test_ensure_variants_only_heads_when_they_exist():
    s3 = MagicMock()
    assert R2Service.ensure_variants(s3, "bucket", "rescue_dogs/org/rex_1.jpg")
    s3.get_object.assert_not_called()


def test_ensure_variants_creates_missing_ones_from_the_stored_original():
    s3 = MagicMock()
    s3.head_object.side_effect = _client_error("404")
    s3.get_object.return_value = {"Body": BytesIO(_jpeg(900, 600))}
    assert R2Service.ensure_variants(s3, "bucket", "rescue_dogs/org/rex_1.jpg")
    assert s3.put_object.call_count == len(VARIANT_WIDTHS)
