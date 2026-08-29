"""Age category filter semantics.

Two defects motivated these tests, both of which silently hid dogs:

1. The bucket conditions required a dog's whole estimated age range to sit
   inside the bucket (``age_min >= lo AND age_max <= hi``). A dog recorded as
   "6 - 12 months" matched nothing: ``age_max < 12`` fails at exactly 12, and
   ``age_min >= 12`` fails at 6. 253 available dogs sat in no bucket.
2. A NULL age failed every comparison, so 230 dogs with no age data were
   excluded from every age-filtered query with no way to reach them.
"""

import pytest

from api.services.animal_service import AGE_CATEGORIES, age_category_condition

pytestmark = pytest.mark.unit


def matches(category: str, age_min: int | None, age_max: int | None) -> bool:
    """Evaluate the generated SQL predicate in Python.

    The condition is a SQL fragment over a.age_min_months / a.age_max_months,
    so this mirrors it rather than executing it, keeping the test a unit test.
    """
    condition = age_category_condition(category)
    assert condition is not None, f"no condition for {category!r}"

    expression = condition.replace("a.age_min_months", "age_min").replace("a.age_max_months", "age_max").replace(" IS NULL", " is None").replace(" AND ", " and ").replace(" OR ", " or ")
    if age_min is None or age_max is None:
        # NULL propagates in SQL: any comparison against NULL is not true.
        if "is None" not in expression:
            return False
    return bool(eval(expression, {"age_min": age_min, "age_max": age_max}))  # noqa: S307


class TestKnownCategories:
    def test_every_category_has_a_condition(self):
        for category in AGE_CATEGORIES:
            assert age_category_condition(category) is not None

    def test_unrecognised_category_returns_none(self):
        assert age_category_condition("Middle-aged") is None
        assert age_category_condition("") is None


class TestOverlapNotContainment:
    def test_six_to_twelve_month_dog_is_a_puppy(self):
        """The regression that motivated this: a literal puppy matched nothing."""
        assert matches("Puppy", 6, 12) is True

    def test_dog_spanning_two_buckets_appears_in_both(self):
        """A dog estimated at 2-4 years is honestly both Young and Adult."""
        assert matches("Young", 24, 48) is True
        assert matches("Adult", 24, 48) is True

    def test_no_dog_with_an_age_falls_through_every_bucket(self):
        spans = [(0, 3), (6, 12), (11, 13), (12, 12), (12, 24), (24, 48), (36, 36), (90, 100), (96, 96), (120, 200)]
        for age_min, age_max in spans:
            hits = [c for c in AGE_CATEGORIES if matches(c, age_min, age_max)]
            assert hits, f"({age_min}, {age_max}) matched no age category"


class TestBoundaries:
    def test_puppy_upper_bound_is_exclusive_at_twelve_months(self):
        assert matches("Puppy", 11, 11) is True
        assert matches("Puppy", 12, 12) is False

    def test_exactly_twelve_months_is_young(self):
        assert matches("Young", 12, 12) is True

    def test_exactly_ninety_six_months_is_senior_not_adult(self):
        assert matches("Senior", 96, 96) is True
        assert matches("Adult", 96, 96) is False

    def test_senior_has_no_upper_bound(self):
        assert matches("Senior", 200, 240) is True


class TestUnknownAge:
    def test_unknown_is_a_selectable_category(self):
        assert "Unknown" in AGE_CATEGORIES
        assert age_category_condition("Unknown") is not None

    def test_unknown_matches_a_dog_with_no_age(self):
        assert matches("Unknown", None, None) is True

    def test_unknown_does_not_match_a_dog_with_an_age(self):
        assert matches("Unknown", 24, 48) is False

    def test_a_dog_with_no_age_is_not_swept_into_the_real_buckets(self):
        """The product decision: buckets stay honest, unknowns are reachable
        through their own option rather than diluting every other one."""
        for category in ("Puppy", "Young", "Adult", "Senior"):
            assert matches(category, None, None) is False
