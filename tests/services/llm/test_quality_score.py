"""Tests for quality score computation in the dog profiler pipeline.

Regression coverage for the scale mismatch between the profiler (which wrote a
hardcoded 80) and the swipe endpoint (which filtered on > 0.7), a comparison
that admitted every profile regardless of quality.
"""

import pytest

from services.llm.quality_rubric import QUALITY_SCORE_MAX, DogProfileQualityRubric


@pytest.fixture
def rich_profile():
    """A profile that should score well against every rubric criterion."""
    return {
        "description": (
            "Bella is a gentle and playful companion whose warm personality wins over "
            "everyone she meets. She loves long walks and quiet evenings curled up beside "
            "her family. She needs a patient home with someone around during the day."
        ),
        "tagline": "A gentle soul looking for her forever family",
        "energy_level": "medium",
        "trainability": "easy",
        "sociability": "social",
        "confidence": "confident",
        "home_type": "house_with_garden",
        "exercise_needs": "moderate",
        "personality_traits": ["gentle", "playful", "loyal"],
        "favorite_activities": ["walks", "cuddling"],
        "confidence_scores": {"description": 0.9, "energy_level": 0.9, "trainability": 0.9},
        "source_references": {"description": "from listing"},
    }


@pytest.fixture
def poor_profile():
    """A profile missing most fields, with a stub description."""
    return {"description": "Dog.", "confidence_scores": {"description": 0.1}}


class TestQualityRubricScale:
    def test_max_constant_is_one_hundred(self):
        assert QUALITY_SCORE_MAX == 100

    def test_rich_profile_scores_high_on_zero_to_one_hundred(self, rich_profile):
        score = DogProfileQualityRubric().calculate_quality_score(rich_profile, {})
        assert 70 < score <= 100

    def test_poor_profile_scores_below_threshold(self, poor_profile):
        score = DogProfileQualityRubric().calculate_quality_score(poor_profile, {})
        assert score < 70

    def test_rich_profile_outscores_poor_profile(self, rich_profile, poor_profile):
        rubric = DogProfileQualityRubric()
        assert rubric.calculate_quality_score(rich_profile, {}) > rubric.calculate_quality_score(poor_profile, {})

    def test_score_never_exceeds_max(self, rich_profile):
        assert DogProfileQualityRubric().calculate_quality_score(rich_profile, {}) <= QUALITY_SCORE_MAX


class TestGermanFragmentDetection:
    """The German check matched bare substrings, so ordinary English words
    containing them ('hundred' contains 'hund') were penalised as German."""

    def test_english_word_containing_hund_is_not_flagged(self, rich_profile):
        rich_profile["description"] = "Bella is a gentle and playful dog who is a hundred percent devoted to her family. She loves long walks and needs a patient home of her own."
        scores = DogProfileQualityRubric.score_profile(rich_profile, {})["scores"]
        assert scores["language_quality"] == 1.0

    def test_actual_german_fragment_is_flagged(self, rich_profile):
        rich_profile["description"] = "Dieser Hund ist ein gentle und playful Rüde, der ein Zuhause sucht."
        scores = DogProfileQualityRubric.score_profile(rich_profile, {})["scores"]
        assert scores["language_quality"] < 1.0


class TestPipelineUsesRubric:
    def test_pipeline_computes_score_rather_than_hardcoding(self, rich_profile, poor_profile):
        """The pipeline previously stamped 80 on every profile unconditionally."""
        from services.llm.dog_profiler import DogProfilerPipeline

        pipeline = DogProfilerPipeline.__new__(DogProfilerPipeline)
        pipeline.quality_rubric = DogProfileQualityRubric()

        rich = pipeline._calculate_quality_score(rich_profile, {})
        poor = pipeline._calculate_quality_score(poor_profile, {})

        assert rich != 80
        assert rich > poor
        assert 0 <= poor <= QUALITY_SCORE_MAX


class TestSwipeThresholdConsistency:
    """The swipe filter and the profiler must agree on the score scale.

    The endpoint filtered on `> 0.7` while the profiler wrote scores on a
    0-100 scale, so the comparison admitted every profile ever written.
    """

    def test_threshold_is_on_the_rubric_scale(self):
        from api.routes.swipe import MIN_SWIPE_QUALITY_SCORE

        assert 1 < MIN_SWIPE_QUALITY_SCORE < QUALITY_SCORE_MAX

    def test_no_sub_one_threshold_remains_in_swipe_sql(self):
        """Guards against a fractional threshold creeping back in."""
        from pathlib import Path

        source = Path("api/routes/swipe.py").read_text()
        assert "'quality_score')::float > 0." not in source

    def test_every_threshold_reference_is_interpolated(self):
        """A missing f-prefix would ship a literal brace to Postgres."""
        import ast
        from pathlib import Path

        source = Path("api/routes/swipe.py").read_text()
        assert source.count("{MIN_SWIPE_QUALITY_SCORE}") == 4

        interpolated = 0
        for node in ast.walk(ast.parse(source)):
            if not isinstance(node, ast.JoinedStr):
                continue
            for part in node.values:
                if isinstance(part, ast.FormattedValue) and isinstance(part.value, ast.Name) and part.value.id == "MIN_SWIPE_QUALITY_SCORE":
                    interpolated += 1

        assert interpolated == 4, f"only {interpolated} of 4 thresholds are interpolated"

    def test_threshold_sits_below_the_well_formed_cluster(self):
        """Complete profiles score ~66.7 at the low end; the gate must sit under
        them so stylistic rubric penalties do not hide adoptable dogs."""
        from api.routes.swipe import MIN_SWIPE_QUALITY_SCORE

        assert MIN_SWIPE_QUALITY_SCORE < 66.7

    def test_poor_profile_would_be_excluded_by_swipe(self, poor_profile):
        from api.routes.swipe import MIN_SWIPE_QUALITY_SCORE

        score = DogProfileQualityRubric().calculate_quality_score(poor_profile, {})
        assert score <= MIN_SWIPE_QUALITY_SCORE

    def test_rich_profile_would_be_admitted_by_swipe(self, rich_profile):
        from api.routes.swipe import MIN_SWIPE_QUALITY_SCORE

        score = DogProfileQualityRubric().calculate_quality_score(rich_profile, {})
        assert score > MIN_SWIPE_QUALITY_SCORE
