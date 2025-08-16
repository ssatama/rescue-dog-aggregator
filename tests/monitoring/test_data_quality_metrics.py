# tests/monitoring/test_data_quality_metrics.py

import json

import pytest

from monitoring.quality.metrics import DataQualityMetrics, QualityAssessment, QualityScore


@pytest.mark.unit
@pytest.mark.fast
class TestDataQualityMetrics:
    """Test suite for DataQualityMetrics class."""

    def test_completeness_perfect_animal(self):
        """Test completeness assessment for perfect animal data."""
        animal = {"name": "Bella", "breed": "Labrador Mix", "age_text": "3 years", "age_min_months": 36, "age_max_months": 36, "sex": "Female", "size": "Large"}

        score = DataQualityMetrics.assess_animal_completeness(animal)

        assert score.points_earned == score.max_points
        assert score.percentage == 100.0
        assert len(score.issues) == 0

    def test_completeness_minimal_animal(self):
        """Test completeness assessment for minimal required data."""
        animal = {
            "name": "Max",
            "breed": "German Shepherd",
            # Missing optional fields
        }

        score = DataQualityMetrics.assess_animal_completeness(animal)

        # Should get points for name (20) and breed (5) = 25 out of 40
        assert score.points_earned == 25
        assert score.percentage == 62.5
        assert len(score.issues) == 3  # Missing age, sex, size
        assert "Missing age information" in score.issues
        assert "Missing sex information" in score.issues
        assert "Missing size information" in score.issues

    def test_completeness_empty_animal(self):
        """Test completeness assessment for empty animal data."""
        animal = {}

        score = DataQualityMetrics.assess_animal_completeness(animal)

        assert score.points_earned == 0
        assert score.percentage == 0.0
        assert len(score.issues) == 5  # All fields missing

    def test_completeness_partial_age_data(self):
        """Test that any age field counts for age completeness."""
        test_cases = [
            ({"age_text": "2 years"}, True),
            ({"age_min_months": 24}, True),
            ({"age_max_months": 36}, True),
            ({"age_min_months": 24, "age_max_months": 36}, True),
            ({}, False),
        ]

        for age_data, should_have_age_points in test_cases:
            animal = {"name": "Test Dog", "breed": "Mixed", **age_data}

            score = DataQualityMetrics.assess_animal_completeness(animal)

            expected_points = 25  # name (20) + breed (5)
            if should_have_age_points:
                expected_points += 10  # age_data points

            assert score.points_earned == expected_points, f"Failed for age_data: {age_data}"

    def test_standardization_perfect_animal(self):
        """Test standardization assessment for perfect animal data."""
        animal = {"standardized_breed": "Labrador Retriever Mix", "standardized_size": "Large"}

        score = DataQualityMetrics.assess_animal_standardization(animal)

        assert score.points_earned == score.max_points
        assert score.percentage == 100.0
        assert len(score.issues) == 0

    def test_standardization_missing_fields(self):
        """Test standardization assessment with missing fields."""
        animal = {"breed": "Lab Mix", "size": "big"}  # Raw breed but no standardized  # Raw size but no standardized

        score = DataQualityMetrics.assess_animal_standardization(animal)

        assert score.points_earned == 0
        assert score.percentage == 0.0
        assert len(score.issues) == 2
        assert "Missing standardized breed" in score.issues
        assert "Missing standardized size" in score.issues

    def test_rich_content_with_description(self):
        """Test rich content assessment with good description."""
        properties_dict = {
            "description": "Bella is a wonderful, energetic Labrador mix who loves playing fetch and swimming. She gets along great with children and other dogs, making her perfect for an active family."
        }

        animal = {"properties": properties_dict}

        score = DataQualityMetrics.assess_animal_rich_content(animal)

        assert score.points_earned == score.max_points
        assert score.percentage == 100.0
        assert len(score.issues) == 0

    def test_rich_content_with_json_string_properties(self):
        """Test rich content assessment with properties as JSON string."""
        properties_dict = {"description": "Max is a loyal German Shepherd who would make an excellent guard dog and family companion."}

        animal = {"properties": json.dumps(properties_dict)}  # JSON string

        score = DataQualityMetrics.assess_animal_rich_content(animal)

        assert score.points_earned == score.max_points
        assert score.percentage == 100.0
        assert len(score.issues) == 0

    def test_rich_content_short_description(self):
        """Test rich content assessment with too-short description."""
        animal = {"properties": {"description": "Nice dog"}}  # Too short

        score = DataQualityMetrics.assess_animal_rich_content(animal)

        assert score.points_earned == 0
        assert score.percentage == 0.0
        assert "Missing or insufficient description" in score.issues

    def test_rich_content_no_description(self):
        """Test rich content assessment with no description."""
        animal = {"properties": {"other_field": "value"}}  # No description field

        score = DataQualityMetrics.assess_animal_rich_content(animal)

        assert score.points_earned == 0
        assert score.percentage == 0.0
        assert "Missing or insufficient description" in score.issues

    def test_visual_appeal_with_image(self):
        """Test visual appeal assessment with primary image."""
        animal = {"primary_image_url": "https://images.rescuedogs.me/bella.jpg"}

        score = DataQualityMetrics.assess_animal_visual_appeal(animal)

        assert score.points_earned == score.max_points
        assert score.percentage == 100.0
        assert len(score.issues) == 0

    def test_visual_appeal_no_image(self):
        """Test visual appeal assessment without primary image."""
        animal = {}

        score = DataQualityMetrics.assess_animal_visual_appeal(animal)

        assert score.points_earned == 0
        assert score.percentage == 0.0
        assert "Missing primary image URL" in score.issues

    def test_overall_assessment_perfect_animal(self):
        """Test overall assessment for perfect animal."""
        animal = {
            "name": "Bella",
            "breed": "Labrador Mix",
            "standardized_breed": "Labrador Retriever Mix",
            "age_text": "3 years",
            "age_min_months": 36,
            "sex": "Female",
            "size": "Large",
            "standardized_size": "Large",
            "primary_image_url": "https://images.rescuedogs.me/bella.jpg",
            "properties": {"description": "Bella is a wonderful, energetic Labrador mix who loves playing fetch and swimming. She gets along great with children and other dogs."},
        }

        assessment = DataQualityMetrics.assess_animal_overall(animal)

        assert isinstance(assessment, QualityAssessment)
        assert assessment.completeness.percentage == 100.0
        assert assessment.standardization.percentage == 100.0
        assert assessment.rich_content.percentage == 100.0
        assert assessment.visual_appeal.percentage == 100.0
        assert assessment.overall_score == 100.0
        assert len(assessment.critical_issues) == 0

    def test_overall_assessment_minimal_animal(self):
        """Test overall assessment for minimal animal."""
        animal = {"name": "Max", "breed": "Mixed"}

        assessment = DataQualityMetrics.assess_animal_overall(animal)

        # Should have some completeness (name + breed) but low overall
        assert assessment.completeness.percentage > 0
        assert assessment.standardization.percentage == 0
        assert assessment.rich_content.percentage == 0
        assert assessment.visual_appeal.percentage == 0
        assert assessment.overall_score < 50  # Should be low overall
        assert len(assessment.critical_issues) == 0  # Has required fields

    def test_overall_assessment_critical_issues(self):
        """Test overall assessment identifies critical issues."""
        animal = {
            # Missing name and breed - critical issues
            "size": "Large",
            "primary_image_url": "https://example.com/image.jpg",
        }

        assessment = DataQualityMetrics.assess_animal_overall(animal)

        assert len(assessment.critical_issues) == 2
        assert "Missing required field: name" in assessment.critical_issues
        assert "Missing required field: breed" in assessment.critical_issues

    def test_weights_sum_to_100(self):
        """Test that quality weights sum to 100."""
        total_weight = sum(DataQualityMetrics.WEIGHTS.values())
        assert total_weight == 100

    def test_points_consistency(self):
        """Test that category points match expected totals."""
        completeness_total = sum(criteria["points"] for criteria in DataQualityMetrics.COMPLETENESS_CRITERIA.values())
        standardization_total = sum(criteria["points"] for criteria in DataQualityMetrics.STANDARDIZATION_CRITERIA.values())
        rich_content_total = sum(criteria["points"] for criteria in DataQualityMetrics.RICH_CONTENT_CRITERIA.values())
        visual_total = sum(criteria["points"] for criteria in DataQualityMetrics.VISUAL_CRITERIA.values())

        assert completeness_total == 40
        assert standardization_total == 30
        assert rich_content_total == 20
        assert visual_total == 10

    def test_edge_cases_empty_strings(self):
        """Test handling of empty strings vs None values."""
        animal = {
            "name": "",  # Empty string
            "breed": None,  # None value
            "age_text": "   ",  # Whitespace only
        }

        assessment = DataQualityMetrics.assess_animal_overall(animal)

        # All should be treated as missing
        assert len(assessment.critical_issues) == 2  # Missing name and breed
        assert "Missing or insufficient description" in assessment.rich_content.issues

    def test_properties_malformed_json(self):
        """Test handling of malformed JSON in properties field."""
        animal = {"name": "Test Dog", "breed": "Mixed", "properties": '{"invalid": json}'}  # Malformed JSON

        score = DataQualityMetrics.assess_animal_rich_content(animal)

        # Should handle gracefully and treat as no description
        assert score.points_earned == 0
        assert "Missing or insufficient description" in score.issues
