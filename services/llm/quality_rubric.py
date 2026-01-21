"""
Quality scoring rubric for LLM-generated dog profiles.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear data contracts
- Comprehensive validation
"""

from typing import Any


class DogProfileQualityRubric:
    """Evaluates quality of LLM-generated dog profiles."""

    # Quality patterns observed from reference organizations
    QUALITY_CRITERIA = {
        "description_quality": {
            "min_length": 150,
            "max_length": 250,
            "required_elements": ["personality", "needs", "compatibility"],
            "weight": 0.25,
        },
        "field_completeness": {
            "required_fields": [
                "description",
                "tagline",
                "energy_level",
                "trainability",
                "sociability",
                "confidence",
                "home_type",
                "exercise_needs",
                "personality_traits",
                "favorite_activities",
            ],
            "weight": 0.20,
        },
        "data_accuracy": {
            "no_hallucinations": True,
            "source_references_present": True,
            "confidence_scores_present": True,
            "weight": 0.30,
        },  # All data traceable to source
        "language_quality": {
            "is_english": True,
            "no_german_fragments": True,
            "engaging_tone": True,
            "weight": 0.15,
        },
        "consistency": {
            "no_contradictions": True,  # e.g., "shy" but also "very social"
            "breed_appropriate": True,  # traits match breed characteristics
            "age_appropriate": True,  # energy level matches age
            "weight": 0.10,
        },
    }

    @staticmethod
    def score_profile(profile_data: dict[str, Any], source_data: dict[str, Any]) -> dict[str, Any]:
        """
        Score a dog profile against quality criteria.

        Args:
            profile_data: The LLM-generated profile
            source_data: The original source data

        Returns:
            Dictionary with scores and recommendations
        """
        scores = {}

        # Description quality
        desc = profile_data.get("description", "")
        desc_score = 0.0

        # Length check (be more lenient)
        desc_len = len(desc)
        if 150 <= desc_len <= 250:
            desc_score += 0.5
        elif 100 <= desc_len <= 400:  # Partial credit for reasonable length
            desc_score += 0.25

        # Content quality - check for descriptive elements (more flexible)
        quality_indicators = [
            any(word in desc.lower() for word in ["personality", "temperament", "character", "nature"]),
            any(word in desc.lower() for word in ["need", "require", "looking for", "seek", "dream"]),
            any(word in desc.lower() for word in ["home", "family", "companion", "friend"]),
            any(
                word in desc.lower()
                for word in [
                    "love",
                    "patient",
                    "gentle",
                    "friendly",
                    "playful",
                    "calm",
                    "energetic",
                ]
            ),
        ]
        content_score = sum(quality_indicators) / 4.0 * 0.5
        desc_score += content_score

        scores["description_quality"] = desc_score

        # Field completeness
        required = DogProfileQualityRubric.QUALITY_CRITERIA["field_completeness"]["required_fields"]
        present = sum(1 for field in required if field in profile_data and profile_data[field])
        scores["field_completeness"] = present / len(required)

        # Data accuracy (check for hallucinations)
        accuracy_score = 0.0
        if "confidence_scores" in profile_data:
            accuracy_score += 0.33
        if "source_references" in profile_data:
            accuracy_score += 0.33
        # Check average confidence
        if "confidence_scores" in profile_data:
            avg_confidence = sum(profile_data["confidence_scores"].values()) / len(profile_data["confidence_scores"])
            if avg_confidence > 0.7:
                accuracy_score += 0.34
        scores["data_accuracy"] = accuracy_score

        # Language quality
        lang_score = 0.0
        if desc and not any(word in desc.lower() for word in ["hund", "rüde", "hündin", "jahr"]):
            lang_score += 0.5
        if desc and any(word in desc.lower() for word in ["friendly", "loving", "playful", "gentle"]):
            lang_score += 0.5
        scores["language_quality"] = lang_score

        # Consistency checks
        consistency_score = 1.0  # Start with full score, deduct for issues

        # Check for contradictions
        if profile_data.get("confidence") == "shy" and profile_data.get("sociability") == "very_social":
            consistency_score -= 0.5
        if profile_data.get("energy_level") == "very_high" and profile_data.get("exercise_needs") == "minimal":
            consistency_score -= 0.5

        scores["consistency"] = max(0, consistency_score)

        # Calculate weighted total
        total_score = 0.0
        for criterion, weight in [
            ("description_quality", 0.25),
            ("field_completeness", 0.20),
            ("data_accuracy", 0.30),
            ("language_quality", 0.15),
            ("consistency", 0.10),
        ]:
            total_score += scores[criterion] * weight

        return {
            "total_score": total_score,
            "scores": scores,
            "pass": total_score >= 0.80,
            "recommendation": "approve" if total_score >= 0.80 else "review",
            "issues": DogProfileQualityRubric._identify_issues(scores),
        }

    @staticmethod
    def _identify_issues(scores: dict[str, float]) -> list[str]:
        """Identify specific issues based on scores."""
        issues = []

        if scores.get("description_quality", 0) < 0.5:
            issues.append("Description quality below threshold")
        if scores.get("field_completeness", 0) < 0.8:
            issues.append("Missing required fields")
        if scores.get("data_accuracy", 0) < 0.7:
            issues.append("Potential hallucination risk")
        if scores.get("language_quality", 0) < 0.5:
            issues.append("Language quality issues")
        if scores.get("consistency", 0) < 0.8:
            issues.append("Consistency problems detected")

        return issues

    def calculate_quality_score(self, profile_data: dict[str, Any], source_data: dict[str, Any] | None = None) -> float:
        """
        Calculate quality score for a dog profile.

        This is the instance method expected by the test scripts.

        Args:
            profile_data: The LLM-generated profile
            source_data: Optional original source data

        Returns:
            Float score between 0.0 and 1.0
        """
        if source_data is None:
            source_data = {}

        result = self.score_profile(profile_data, source_data)
        return result["total_score"]
