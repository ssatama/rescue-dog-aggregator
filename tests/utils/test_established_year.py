"""Founding years before 1900 are real: Dogs Trust was founded in 1891 (#443)."""

import pytest
from pydantic import ValidationError

from utils.config_loader import ConfigLoader
from utils.config_models import OrganizationMetadata


@pytest.mark.unit
def test_dogs_trust_config_carries_its_real_founding_year():
    assert ConfigLoader().load_config("dogstrust").metadata.established_year == 1891


@pytest.mark.unit
@pytest.mark.parametrize("year", [1891, 1800, 2030])
def test_accepts_years_from_1800(year):
    assert OrganizationMetadata.validate_established_year(year) == year


@pytest.mark.unit
@pytest.mark.parametrize("year", [1799, 2031])
def test_rejects_years_outside_the_range(year):
    with pytest.raises((ValueError, ValidationError)):
        OrganizationMetadata.validate_established_year(year)
