"""One shoulder-height scale for every rescue that gives a height (#631)."""

import pytest

from scrapers.daisy_family_rescue.dog_detail_scraper import DaisyFamilyRescueDogDetailScraper
from utils.dog_size import size_from_height_cm


@pytest.mark.unit
@pytest.mark.parametrize(
    ("height_cm", "size"),
    [(20, "Small"), (39.5, "Small"), (40, "Medium"), (59, "Medium"), (60, "Large"), (105, "Large"), (0, None), (-3, None)],
)
def test_the_scale(height_cm, size):
    assert size_from_height_cm(height_cm) == size


@pytest.mark.unit
def test_daisy_uses_the_same_scale():
    """Daisy split at 40/60 and Tierschutzverein at 35/55 for the same question."""
    daisy = DaisyFamilyRescueDogDetailScraper()
    assert [daisy._determine_size(cm) for cm in (39, 40, 59, 60)] == ["Small", "Medium", "Medium", "Large"]
