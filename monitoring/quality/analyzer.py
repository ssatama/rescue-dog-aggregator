# monitoring/quality/analyzer.py

import logging
import os
import sys
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from psycopg2.extras import RealDictCursor

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from contextlib import contextmanager

from api.dependencies import get_database_connection
from monitoring.quality.metrics import DataQualityMetrics, QualityAssessment


@dataclass
class OrganizationQuality:
    """Quality metrics for a complete organization."""

    org_id: int
    org_name: str
    total_animals: int
    animals_analyzed: int
    overall_score: float
    animals_at_100: int
    animals_below_70: int
    completeness_avg: float
    standardization_avg: float
    rich_content_avg: float
    visual_appeal_avg: float
    critical_issues_count: int
    common_issues: dict[str, int]


class DataQualityAnalyzer:
    """Main analyzer for data quality assessment."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics = DataQualityMetrics()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        connection_generator = get_database_connection()
        connection = next(connection_generator)
        try:
            yield connection
        finally:
            try:
                next(connection_generator, None)  # Allow generator to cleanup
            except StopIteration:
                pass

    def get_organization_animals(self, cursor, org_id: int | None = None) -> list[dict[str, Any]]:
        """Fetch animals from database for analysis."""
        try:
            if org_id:
                # Get animals for specific organization
                query = """
                    SELECT a.id, a.name, a.breed, a.standardized_breed, a.age_text, 
                           a.age_min_months, a.age_max_months, a.sex, a.size, 
                           a.standardized_size, a.properties, a.primary_image_url,
                           a.organization_id, o.name as organization_name
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE a.organization_id = %s
                    AND a.status = 'available'
                    ORDER BY a.created_at DESC
                """
                cursor.execute(query, (org_id,))
            else:
                # Get all available animals
                query = """
                    SELECT a.id, a.name, a.breed, a.standardized_breed, a.age_text, 
                           a.age_min_months, a.age_max_months, a.sex, a.size, 
                           a.standardized_size, a.properties, a.primary_image_url,
                           a.organization_id, o.name as organization_name
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE a.status = 'available'
                    ORDER BY a.organization_id, a.created_at DESC
                """
                cursor.execute(query)

            # Convert to list of dictionaries
            animals = []
            for row in cursor.fetchall():
                animals.append(
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "breed": row["breed"],
                        "standardized_breed": row["standardized_breed"],
                        "age_text": row["age_text"],
                        "age_min_months": row["age_min_months"],
                        "age_max_months": row["age_max_months"],
                        "sex": row["sex"],
                        "size": row["size"],
                        "standardized_size": row["standardized_size"],
                        "properties": row["properties"],
                        "primary_image_url": row["primary_image_url"],
                        "organization_id": row["organization_id"],
                        "organization_name": row["organization_name"],
                    }
                )

            return animals

        except Exception as e:
            self.logger.error(f"Error fetching animals: {e}")
            return []

    def analyze_animal(self, animal: dict[str, Any]) -> QualityAssessment:
        """Analyze a single animal's data quality."""
        return self.metrics.assess_animal_overall(animal)

    def analyze_organization_quality(self, animals: list[dict[str, Any]]) -> OrganizationQuality:
        """Analyze overall quality for an organization."""
        if not animals:
            return None

        # Get organization info from first animal
        org_id = animals[0]["organization_id"]
        org_name = animals[0]["organization_name"]

        # Analyze each animal
        assessments = []
        issue_counts = defaultdict(int)
        critical_issues_count = 0

        for animal in animals:
            assessment = self.analyze_animal(animal)
            assessments.append(assessment)

            # Count issues
            for issue in assessment.completeness.issues + assessment.standardization.issues + assessment.rich_content.issues + assessment.visual_appeal.issues:
                issue_counts[issue] += 1

            critical_issues_count += len(assessment.critical_issues)

        # Calculate aggregated metrics
        overall_scores = [a.overall_score for a in assessments]
        completeness_scores = [a.completeness.percentage for a in assessments]
        standardization_scores = [a.standardization.percentage for a in assessments]
        rich_content_scores = [a.rich_content.percentage for a in assessments]
        visual_appeal_scores = [a.visual_appeal.percentage for a in assessments]

        overall_avg = sum(overall_scores) / len(overall_scores) if overall_scores else 0
        animals_at_100 = sum(1 for score in overall_scores if score >= 100)
        animals_below_70 = sum(1 for score in overall_scores if score < 70)

        # Get top 5 common issues
        common_issues = dict(sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5])

        return OrganizationQuality(
            org_id=org_id,
            org_name=org_name,
            total_animals=len(animals),
            animals_analyzed=len(animals),
            overall_score=overall_avg,
            animals_at_100=animals_at_100,
            animals_below_70=animals_below_70,
            completeness_avg=sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0,
            standardization_avg=sum(standardization_scores) / len(standardization_scores) if standardization_scores else 0,
            rich_content_avg=sum(rich_content_scores) / len(rich_content_scores) if rich_content_scores else 0,
            visual_appeal_avg=sum(visual_appeal_scores) / len(visual_appeal_scores) if visual_appeal_scores else 0,
            critical_issues_count=critical_issues_count,
            common_issues=common_issues,
        )

    def analyze_all_organizations(self) -> list[OrganizationQuality]:
        """Analyze data quality for all organizations."""
        results = []

        with self.get_connection() as connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)

            # Get all organizations with animals
            query = """
                SELECT DISTINCT o.id, o.name 
                FROM organizations o
                JOIN animals a ON o.id = a.organization_id
                WHERE a.status = 'available'
                ORDER BY o.name
            """
            cursor.execute(query)
            orgs = cursor.fetchall()

            for org_row in orgs:
                org_id = org_row["id"]
                org_name = org_row["name"]

                self.logger.info(f"Analyzing organization: {org_name} (ID: {org_id})")

                # Get animals for this organization
                animals = self.get_organization_animals(cursor, org_id)

                if animals:
                    org_quality = self.analyze_organization_quality(animals)
                    if org_quality:
                        results.append(org_quality)
                    self.logger.info(f"Analyzed {len(animals)} animals for {org_name}")
                else:
                    self.logger.warning(f"No animals found for {org_name}")

        return results

    def analyze_single_organization(self, org_id: int) -> tuple[OrganizationQuality, list[tuple[dict[str, Any], QualityAssessment]]]:
        """Analyze data quality for a single organization with detailed animal data."""

        with self.get_connection() as connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)

            # Get organization info
            org_query = "SELECT id, name FROM organizations WHERE id = %s"
            cursor.execute(org_query, (org_id,))
            org_result = cursor.fetchone()

            if not org_result:
                raise ValueError(f"Organization with ID {org_id} not found")

            # Get animals for this organization
            animals = self.get_organization_animals(cursor, org_id)

            if not animals:
                raise ValueError(f"No animals found for organization ID {org_id}")

            # Analyze organization overall
            org_quality = self.analyze_organization_quality(animals)

            # Analyze each animal individually for detailed report
            detailed_results = []
            for animal in animals:
                assessment = self.analyze_animal(animal)
                detailed_results.append((animal, assessment))

            return org_quality, detailed_results
