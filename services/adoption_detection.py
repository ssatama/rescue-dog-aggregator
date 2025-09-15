"""
Adoption Detection Service using Firecrawl API.

This service checks if dogs marked as 'unknown' status have been adopted,
reserved, or are still available by analyzing their shelter pages.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Dependency injection for testability
- TDD approach with comprehensive error handling
"""

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from firecrawl import FirecrawlApp


@dataclass
class AdoptionCheckResult:
    """Result of an adoption status check."""

    animal_id: int
    animal_name: str
    previous_status: str
    detected_status: str  # 'adopted', 'reserved', 'available', 'unknown'
    evidence: str
    confidence: float
    checked_at: datetime
    raw_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AdoptionDetectionService:
    """Service for detecting dog adoption status using Firecrawl API."""

    # Status mapping patterns to look for in pages
    ADOPTION_PATTERNS = ["adopted", "rehomed", "found their forever home", "found a home", "has been adopted", "gone home"]

    RESERVED_PATTERNS = ["reserved", "on hold", "adoption pending", "application approved", "pending adoption"]

    AVAILABLE_PATTERNS = ["available", "looking for a home", "ready for adoption", "waiting for their forever home", "could you give"]

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with Firecrawl API key.

        Args:
            api_key: Firecrawl API key. If not provided, reads from FIRECRAWL_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("FIRECRAWL_API_KEY")
        self.logger = logging.getLogger(__name__)

        if not self.api_key:
            self.logger.warning("FIRECRAWL_API_KEY not set - adoption detection service disabled")
            self.client = None
        else:
            try:
                self.client = FirecrawlApp(api_key=self.api_key)
                self.logger.info("AdoptionDetectionService initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize FirecrawlApp: {e}")
                self.client = None

    def check_adoption_status(self, animal, timeout: int = 10000) -> AdoptionCheckResult:
        """Check a single dog's adoption status.

        Args:
            animal: The Animal model instance to check
            timeout: Max time to wait for page load in milliseconds

        Returns:
            AdoptionCheckResult with the detection outcome
        """
        if not self.client:
            return AdoptionCheckResult(
                animal_id=animal.id,
                animal_name=animal.name,
                previous_status=animal.status,
                detected_status="unknown",
                evidence="Adoption detection service not available",
                confidence=0.0,
                checked_at=datetime.now(timezone.utc),
                error="FIRECRAWL_API_KEY not configured",
            )

        if not animal.url:
            return AdoptionCheckResult(
                animal_id=animal.id,
                animal_name=animal.name,
                previous_status=animal.status,
                detected_status="unknown",
                evidence="No URL available for this animal",
                confidence=0.0,
                checked_at=datetime.now(timezone.utc),
                error="Missing URL",
            )

        try:
            self.logger.info(f"Checking adoption status for {animal.name} (ID: {animal.id}) at {animal.url}")

            # Use Firecrawl's extract API with correct parameters
            extraction_result = self.client.extract(
                urls=[animal.url],
                prompt="""Analyze this rescue dog adoption page (may be in German, Spanish, or English).

ONLY return 'adopted' if you find CLEAR evidence the dog found a new home, such as:
- 'Adopted', 'Rehomed', 'Found their forever home'
- 'Zuhause gefunden', 'Vermittelt' (German for found home/placed)
- 'Adoptado', 'Encontró hogar' (Spanish for adopted/found home)

ONLY return 'reserved' if explicitly marked as:
- 'Reserved', 'On hold', 'Adoption pending'
- 'Reserviert', 'Vorgemerkt' (German)
- 'Reservado' (Spanish)

Return 'unknown' for ALL other cases including:
- Page marked as 'DELETED' or removed
- Dog died/deceased ('gestorben', 'tot', 'murió', 'died')
- Dog missing or lost
- Page not found or error
- Status unclear or ambiguous
- Any other status not explicitly adopted or reserved

Be very careful: death, deletion, or disappearance is NOT adoption!""",
                schema={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "enum": ["adopted", "reserved", "unknown"], "description": "The current adoption status of the dog"},
                        "evidence": {"type": "string", "description": "The text that indicates the status"},
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1, "description": "Confidence score for the detection"},
                    },
                    "required": ["status", "evidence", "confidence"],
                },
            )

            # The extract API returns the data directly (not wrapped in 'data' array)
            if extraction_result:
                # Check if it's a successful extraction
                # The response comes back as an object with a 'data' field
                if hasattr(extraction_result, "data") and extraction_result.data:
                    # FirecrawlResponse object with data attribute
                    data = extraction_result.data
                elif isinstance(extraction_result, dict) and "data" in extraction_result:
                    # Dict with 'data' key
                    data = extraction_result["data"]
                elif isinstance(extraction_result, dict):
                    # Direct dict result
                    data = extraction_result
                elif isinstance(extraction_result, list) and len(extraction_result) > 0:
                    # If it returns a list, take the first item
                    data = extraction_result[0]
                else:
                    data = {}

                return AdoptionCheckResult(
                    animal_id=animal.id,
                    animal_name=animal.name,
                    previous_status=animal.status,
                    detected_status=data.get("status", "unknown"),
                    evidence=data.get("evidence", "")[:200],  # Limit evidence length
                    confidence=data.get("confidence", 0.0),
                    checked_at=datetime.now(timezone.utc),
                    raw_response=extraction_result if isinstance(extraction_result, dict) else str(extraction_result),
                )
            else:
                return AdoptionCheckResult(
                    animal_id=animal.id,
                    animal_name=animal.name,
                    previous_status=animal.status,
                    detected_status="unknown",
                    evidence="Failed to extract data from page",
                    confidence=0.0,
                    checked_at=datetime.now(timezone.utc),
                    error="Extraction failed",
                )

        except Exception as e:
            self.logger.error(f"Error checking adoption status for {animal.name}: {str(e)}")
            return AdoptionCheckResult(
                animal_id=animal.id,
                animal_name=animal.name,
                previous_status=animal.status,
                detected_status="unknown",
                evidence=f"Error: {str(e)[:100]}",
                confidence=0.0,
                checked_at=datetime.now(timezone.utc),
                error=str(e),
            )

    def _extract_with_retry(self, url: str, timeout: int, max_retries: int = 2) -> Optional[Dict[str, Any]]:
        """Extract data from URL with retry logic.

        Args:
            url: The URL to extract from
            timeout: Timeout in milliseconds
            max_retries: Maximum number of retry attempts

        Returns:
            Extraction result or None if failed
        """
        # This method is no longer needed since we're using the simpler extract API
        # Keeping for backwards compatibility but will be deprecated
        return None

    def batch_check_adoptions(self, db_connection, organization_id: int, threshold: int = 3, limit: int = 50, check_interval_hours: int = 24, dry_run: bool = False) -> List[AdoptionCheckResult]:
        """Check adoption status for eligible dogs in batch.

        Args:
            db_connection: Database connection or cursor
            organization_id: Organization to check dogs for
            threshold: Minimum consecutive_scrapes_missing to be eligible
            limit: Maximum number of dogs to check in this batch
            check_interval_hours: Minimum hours between rechecks
            dry_run: If True, don't update database

        Returns:
            List of AdoptionCheckResult for processed dogs
        """
        # Calculate cutoff time for rechecking
        recheck_cutoff = datetime.now(timezone.utc) - timedelta(hours=check_interval_hours)

        # Query eligible dogs using raw SQL
        query = """
            SELECT id, name, status, url, organization_id, 
                   consecutive_scrapes_missing, adoption_checked_at
            FROM animals 
            WHERE organization_id = %s
            AND consecutive_scrapes_missing >= %s
            AND status NOT IN ('adopted', 'reserved')
            AND (adoption_checked_at IS NULL OR adoption_checked_at < %s)
            LIMIT %s
        """

        cursor = db_connection.cursor() if hasattr(db_connection, "cursor") else db_connection
        cursor.execute(query, (organization_id, threshold, recheck_cutoff, limit))
        eligible_dogs = cursor.fetchall()

        self.logger.info(f"Found {len(eligible_dogs)} eligible dogs for organization {organization_id}")

        results = []

        for dog_row in eligible_dogs:
            # Create a simple object to hold dog data
            dog = type(
                "Animal",
                (),
                {
                    "id": dog_row[0],
                    "name": dog_row[1],
                    "status": dog_row[2],
                    "url": dog_row[3],
                    "organization_id": dog_row[4],
                    "consecutive_scrapes_missing": dog_row[5],
                    "adoption_checked_at": dog_row[6],
                },
            )()

            result = self.check_adoption_status(dog)
            results.append(result)

            if not dry_run and not result.error:
                # Update the database with results
                update_query = """
                    UPDATE animals 
                    SET status = %s,
                        adoption_checked_at = %s,
                        adoption_check_data = %s
                    WHERE id = %s
                """

                adoption_data = {
                    "evidence": result.evidence,
                    "confidence": result.confidence,
                    "previous_status": result.previous_status,
                    "checked_at": result.checked_at.isoformat(),
                    "error": result.error if result.error else None,
                }

                cursor.execute(update_query, (result.detected_status, result.checked_at, json.dumps(adoption_data), dog.id))

                self.logger.info(f"Updated {dog.name}: {result.previous_status} → {result.detected_status} " f"(confidence: {result.confidence:.2f})")

        if not dry_run and hasattr(db_connection, "commit"):
            db_connection.commit()

        return results

    def get_eligible_dogs_count(self, db_connection, organization_id: int, threshold: int = 3, check_interval_hours: int = 24) -> int:
        """Get count of dogs eligible for adoption checking.

        Args:
            db_connection: Database connection or cursor
            organization_id: Organization to check
            threshold: Minimum consecutive_scrapes_missing
            check_interval_hours: Minimum hours between rechecks

        Returns:
            Count of eligible dogs
        """
        recheck_cutoff = datetime.now(timezone.utc) - timedelta(hours=check_interval_hours)

        query = """
            SELECT COUNT(*) 
            FROM animals 
            WHERE organization_id = %s
            AND consecutive_scrapes_missing >= %s
            AND status NOT IN ('adopted', 'reserved')
            AND (adoption_checked_at IS NULL OR adoption_checked_at < %s)
        """

        cursor = db_connection.cursor() if hasattr(db_connection, "cursor") else db_connection
        cursor.execute(query, (organization_id, threshold, recheck_cutoff))
        count = cursor.fetchone()[0]

        return count
