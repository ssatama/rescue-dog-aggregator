# monitoring/quality/metrics.py

import json
from dataclasses import dataclass
from typing import Any


@dataclass
class QualityScore:
    """Individual quality score for a specific category."""

    points_earned: int
    max_points: int
    percentage: float
    issues: list[str]


@dataclass
class QualityAssessment:
    """Complete quality assessment for an animal or organization."""

    completeness: QualityScore
    standardization: QualityScore
    rich_content: QualityScore
    visual_appeal: QualityScore
    overall_score: float
    overall_percentage: float
    critical_issues: list[str]


class DataQualityMetrics:
    """Defines data quality criteria and scoring algorithms."""

    # Quality scoring weights (must sum to 100)
    WEIGHTS = {
        "completeness": 40,  # Essential fields present
        "standardization": 30,  # Normalized data available
        "rich_content": 20,  # Description and detailed info
        "visual_appeal": 10,  # Images available
    }

    # Completeness criteria (40 points total)
    COMPLETENESS_CRITERIA = {
        "name": {
            "points": 20,
            "required": True,
            "description": "Animal name must be present",
        },
        "age_data": {
            "points": 10,
            "required": False,
            "description": "At least one age field (age_text, age_min_months, or age_max_months)",
        },
        "breed": {
            "points": 5,
            "required": True,
            "description": "Breed information must be present",
        },
        "sex": {
            "points": 3,
            "required": False,
            "description": "Sex/gender information",
        },
        "size": {"points": 2, "required": False, "description": "Size information"},
    }

    # Standardization criteria (30 points total)
    STANDARDIZATION_CRITERIA = {
        "standardized_breed": {
            "points": 15,
            "description": "Normalized breed classification",
        },
        "standardized_size": {
            "points": 15,
            "description": "Standardized size category",
        },
    }

    # Rich content criteria (20 points total)
    RICH_CONTENT_CRITERIA = {
        "description": {
            "points": 20,
            "description": "Detailed description in properties field",
        }
    }

    # Visual appeal criteria (10 points total)
    VISUAL_CRITERIA = {"primary_image": {"points": 10, "description": "Primary image URL present"}}

    @classmethod
    def assess_animal_completeness(cls, animal: dict[str, Any]) -> QualityScore:
        """Assess completeness of animal data."""
        points_earned = 0
        max_points = sum(criteria["points"] for criteria in cls.COMPLETENESS_CRITERIA.values())
        issues = []

        # Name check
        if not animal.get("name") or not animal.get("name").strip():
            issues.append("Missing or empty name")
        else:
            points_earned += cls.COMPLETENESS_CRITERIA["name"]["points"]

        # Age data check (any age field counts)
        has_age = any(
            [
                animal.get("age_text"),
                animal.get("age_min_months") is not None,
                animal.get("age_max_months") is not None,
            ]
        )
        if has_age:
            points_earned += cls.COMPLETENESS_CRITERIA["age_data"]["points"]
        else:
            issues.append("Missing age information")

        # Breed check
        if not animal.get("breed") or not animal.get("breed").strip():
            issues.append("Missing or empty breed")
        else:
            points_earned += cls.COMPLETENESS_CRITERIA["breed"]["points"]

        # Sex check
        if animal.get("sex") and animal.get("sex").strip():
            points_earned += cls.COMPLETENESS_CRITERIA["sex"]["points"]
        else:
            issues.append("Missing sex information")

        # Size check
        if animal.get("size") and animal.get("size").strip():
            points_earned += cls.COMPLETENESS_CRITERIA["size"]["points"]
        else:
            issues.append("Missing size information")

        percentage = (points_earned / max_points * 100) if max_points > 0 else 0

        return QualityScore(
            points_earned=points_earned,
            max_points=max_points,
            percentage=percentage,
            issues=issues,
        )

    @classmethod
    def assess_animal_standardization(cls, animal: dict[str, Any]) -> QualityScore:
        """Assess standardization quality of animal data."""
        points_earned = 0
        max_points = sum(criteria["points"] for criteria in cls.STANDARDIZATION_CRITERIA.values())
        issues = []

        # Standardized breed check
        if animal.get("standardized_breed") and animal.get("standardized_breed").strip():
            points_earned += cls.STANDARDIZATION_CRITERIA["standardized_breed"]["points"]
        else:
            issues.append("Missing standardized breed")

        # Standardized size check
        if animal.get("standardized_size") and animal.get("standardized_size").strip():
            points_earned += cls.STANDARDIZATION_CRITERIA["standardized_size"]["points"]
        else:
            issues.append("Missing standardized size")

        percentage = (points_earned / max_points * 100) if max_points > 0 else 0

        return QualityScore(
            points_earned=points_earned,
            max_points=max_points,
            percentage=percentage,
            issues=issues,
        )

    @classmethod
    def assess_animal_rich_content(cls, animal: dict[str, Any]) -> QualityScore:
        """Assess rich content quality of animal data."""
        points_earned = 0
        max_points = sum(criteria["points"] for criteria in cls.RICH_CONTENT_CRITERIA.values())
        issues = []

        # Description check (from properties JSON)
        properties = animal.get("properties", {})
        if isinstance(properties, str):
            try:
                properties = json.loads(properties)
            except (json.JSONDecodeError, TypeError):
                properties = {}

        description = properties.get("description", "") if isinstance(properties, dict) else ""

        if description and len(description.strip()) > 50:  # Meaningful description
            points_earned += cls.RICH_CONTENT_CRITERIA["description"]["points"]
        else:
            issues.append("Missing or insufficient description")

        percentage = (points_earned / max_points * 100) if max_points > 0 else 0

        return QualityScore(
            points_earned=points_earned,
            max_points=max_points,
            percentage=percentage,
            issues=issues,
        )

    @classmethod
    def assess_animal_visual_appeal(cls, animal: dict[str, Any]) -> QualityScore:
        """Assess visual appeal quality of animal data."""
        points_earned = 0
        max_points = sum(criteria["points"] for criteria in cls.VISUAL_CRITERIA.values())
        issues = []

        # Primary image check
        if animal.get("primary_image_url") and animal.get("primary_image_url").strip():
            points_earned += cls.VISUAL_CRITERIA["primary_image"]["points"]
        else:
            issues.append("Missing primary image URL")

        percentage = (points_earned / max_points * 100) if max_points > 0 else 0

        return QualityScore(
            points_earned=points_earned,
            max_points=max_points,
            percentage=percentage,
            issues=issues,
        )

    @classmethod
    def assess_animal_overall(cls, animal: dict[str, Any]) -> QualityAssessment:
        """Perform complete quality assessment of animal data."""

        # Get individual category scores
        completeness = cls.assess_animal_completeness(animal)
        standardization = cls.assess_animal_standardization(animal)
        rich_content = cls.assess_animal_rich_content(animal)
        visual_appeal = cls.assess_animal_visual_appeal(animal)

        # Calculate weighted overall score
        overall_score = (
            (completeness.percentage * cls.WEIGHTS["completeness"])
            + (standardization.percentage * cls.WEIGHTS["standardization"])
            + (rich_content.percentage * cls.WEIGHTS["rich_content"])
            + (visual_appeal.percentage * cls.WEIGHTS["visual_appeal"])
        ) / 100

        # Identify critical issues (missing required fields)
        critical_issues = []
        if not animal.get("name") or not animal.get("name").strip():
            critical_issues.append("Missing required field: name")
        if not animal.get("breed") or not animal.get("breed").strip():
            critical_issues.append("Missing required field: breed")

        return QualityAssessment(
            completeness=completeness,
            standardization=standardization,
            rich_content=rich_content,
            visual_appeal=visual_appeal,
            overall_score=overall_score,
            overall_percentage=overall_score,
            critical_issues=critical_issues,
        )
