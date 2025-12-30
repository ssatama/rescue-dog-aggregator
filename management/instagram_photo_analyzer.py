"""
Instagram Photo Quality Analyzer - Batch Processing Script

Analyzes dog photos for Instagram suitability using Google Gemini 2.5 Flash Image API.
Processes 3,306 dogs concurrently in batches for optimal performance.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
- Comprehensive logging

Usage:
    python management/instagram_photo_analyzer.py --all
    python management/instagram_photo_analyzer.py --limit 100
    python management/instagram_photo_analyzer.py --limit 10 --dry-run
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from pydantic import ValidationError

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.llm.llm_client import LLMClient
from services.llm.photo_analysis_models import PhotoAnalysisResponse


class InstagramPhotoAnalyzer:
    """
    Batch analyzer for dog photo quality assessment.

    Processes photos concurrently in batches of 10 using asyncio.gather().
    Estimated time: ~16-33 minutes for 3,306 dogs.
    """

    def __init__(
        self,
        connection: psycopg2.extensions.connection,
        dry_run: bool = False,
        batch_size: int = 10,
        cost_per_request: float = 0.0015,
    ):
        """
        Initialize the photo analyzer.

        Args:
            connection: Database connection
            dry_run: If True, skip database writes
            batch_size: Number of dogs to process concurrently (default: 10)
            cost_per_request: Cost per API request in USD (default: $0.0015)
        """
        self.connection = connection
        self.cursor = connection.cursor()
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.cost_per_request = cost_per_request

        # Initialize LLM client
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        self.llm_client = LLMClient(api_key=api_key)

        # Load prompt
        self.prompt = self._load_prompt()

        # Model configuration
        self.model = "google/gemini-2.5-flash-image"
        self.temperature = 0.3  # Lower for consistent scoring
        self.max_tokens = 1000

    def _load_prompt(self) -> str:
        """Load the final photo analysis prompt from file."""
        prompt_path = (
            Path(__file__).parent.parent
            / "prompts"
            / "instagram"
            / "photo_quality_analysis_final.txt"
        )

        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()

    async def get_unanalyzed_dogs(
        self, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Query dogs without existing photo analysis.

        Args:
            limit: Optional limit on number of dogs to return

        Returns:
            List of dog dictionaries with id, name, primary_image_url
        """
        query = """
            SELECT a.id, a.name, a.primary_image_url
            FROM animals a
            LEFT JOIN dog_photo_analysis p ON a.id = p.dog_id
            WHERE a.primary_image_url IS NOT NULL
              AND a.active = true
              AND p.id IS NULL
            ORDER BY a.id
        """

        if limit:
            query += " LIMIT %s"
            self.cursor.execute(query, (limit,))
        else:
            self.cursor.execute(query)

        rows = self.cursor.fetchall()

        return [
            {"id": row[0], "name": row[1], "primary_image_url": row[2]} for row in rows
        ]

    async def analyze_single_dog(
        self, dog: Dict[str, Any]
    ) -> Optional[PhotoAnalysisResponse]:
        """
        Analyze a single dog's photo using vision API.

        Args:
            dog: Dog dictionary with id, name, primary_image_url

        Returns:
            PhotoAnalysisResponse or None if error
        """
        try:
            # Call vision API
            response = await self.llm_client.call_vision_api(
                image_url=dog["primary_image_url"],
                prompt=self.prompt,
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            # Validate with Pydantic
            analysis = PhotoAnalysisResponse(**response)
            return analysis

        except ValidationError as e:
            print(f"❌ Validation error for {dog['name']} (ID: {dog['id']}): {e}")
            return None
        except Exception as e:
            print(f"❌ Error analyzing {dog['name']} (ID: {dog['id']}): {e}")
            return None

    async def insert_analysis_result(
        self, dog_id: int, image_url: str, analysis: PhotoAnalysisResponse, cost: float
    ) -> bool:
        """
        Insert analysis result into database with UPSERT logic.

        Args:
            dog_id: Dog ID
            image_url: Image URL that was analyzed
            analysis: Photo analysis response
            cost: API cost for this request

        Returns:
            True if successful, False otherwise
        """
        if self.dry_run:
            return True

        try:
            # Calculate overall_score to match database constraint
            # The constraint checks: overall_score = (q + v + a + b) / 4.0
            # We must provide the EXACT unrounded value for the constraint check
            # The NUMERIC(3,1) column will round it after the constraint passes
            calculated_overall = (
                analysis.quality_score
                + analysis.visibility_score
                + analysis.appeal_score
                + analysis.background_score
            ) / 4.0

            query = """
                INSERT INTO dog_photo_analysis (
                    dog_id,
                    quality_score,
                    visibility_score,
                    appeal_score,
                    background_score,
                    overall_score,
                    ig_ready,
                    confidence,
                    reasoning,
                    flags,
                    image_url,
                    analyzed_at,
                    model_used,
                    api_cost_usd
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (dog_id)
                DO UPDATE SET
                    quality_score = EXCLUDED.quality_score,
                    visibility_score = EXCLUDED.visibility_score,
                    appeal_score = EXCLUDED.appeal_score,
                    background_score = EXCLUDED.background_score,
                    overall_score = EXCLUDED.overall_score,
                    ig_ready = EXCLUDED.ig_ready,
                    confidence = EXCLUDED.confidence,
                    reasoning = EXCLUDED.reasoning,
                    flags = EXCLUDED.flags,
                    image_url = EXCLUDED.image_url,
                    analyzed_at = EXCLUDED.analyzed_at,
                    model_used = EXCLUDED.model_used,
                    api_cost_usd = EXCLUDED.api_cost_usd
            """

            self.cursor.execute(
                query,
                (
                    dog_id,
                    analysis.quality_score,
                    analysis.visibility_score,
                    analysis.appeal_score,
                    analysis.background_score,
                    calculated_overall,  # Use recalculated value
                    analysis.ig_ready,
                    analysis.confidence,
                    analysis.reasoning,
                    analysis.flags,
                    image_url,
                    datetime.now(timezone.utc),
                    self.model,
                    cost,
                ),
            )

            self.connection.commit()
            return True

        except psycopg2.IntegrityError as e:
            print(f"❌ Database integrity error for dog {dog_id}: {e}")
            self.connection.rollback()
            return False
        except Exception as e:
            print(f"❌ Database error for dog {dog_id}: {e}")
            self.connection.rollback()
            return False

    async def analyze_photos(self, dogs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze photos for a list of dogs with concurrent batch processing.

        Args:
            dogs: List of dog dictionaries

        Returns:
            Statistics dictionary with total, processed, errors, total_cost
        """
        total = len(dogs)
        processed = 0
        errors = 0
        total_cost = 0.0

        if total == 0:
            return {"total": 0, "processed": 0, "errors": 0, "total_cost": 0.0}

        print(f"\n🔍 Analyzing {total} dogs in batches of {self.batch_size}...")

        # Process in batches
        for batch_start in range(0, total, self.batch_size):
            batch_end = min(batch_start + self.batch_size, total)
            batch = dogs[batch_start:batch_end]

            print(
                f"\n📦 Batch {batch_start // self.batch_size + 1}: Processing dogs {batch_start + 1}-{batch_end}..."
            )

            # Process batch concurrently using asyncio.gather()
            tasks = [self.analyze_single_dog(dog) for dog in batch]
            results = await asyncio.gather(*tasks)

            # Insert results and track statistics
            for dog, analysis in zip(batch, results):
                if analysis:
                    # Successful analysis
                    success = await self.insert_analysis_result(
                        dog_id=dog["id"],
                        image_url=dog["primary_image_url"],
                        analysis=analysis,
                        cost=self.cost_per_request,
                    )

                    if success:
                        processed += 1
                        total_cost += self.cost_per_request

                        # Log result
                        ig_status = (
                            "✅ IG-ready" if analysis.ig_ready else "⚠️  Not ready"
                        )
                        print(
                            f"  {ig_status} - {dog['name']}: Overall {analysis.overall_score}/10"
                        )
                    else:
                        errors += 1
                else:
                    # Analysis failed
                    errors += 1

            # Progress update
            print(
                f"  ✓ Processed {batch_end}/{total} dogs ({processed} successful, {errors} errors)"
            )

        return {
            "total": total,
            "processed": processed,
            "errors": errors,
            "total_cost": round(total_cost, 4),
        }

    async def run(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Main entry point for batch processing.

        Args:
            limit: Optional limit on number of dogs to process

        Returns:
            Statistics dictionary
        """
        print("\n" + "=" * 60)
        print("  Instagram Photo Quality Analyzer")
        print("=" * 60)

        if self.dry_run:
            print("⚠️  DRY RUN MODE - No database writes")

        # Get unanalyzed dogs
        print("\n📊 Querying unanalyzed dogs...")
        dogs = await self.get_unanalyzed_dogs(limit=limit)

        if not dogs:
            print("✅ No dogs to analyze!")
            return {"total": 0, "processed": 0, "errors": 0, "total_cost": 0.0}

        print(f"Found {len(dogs)} dogs to analyze")

        # Analyze photos
        result = await self.analyze_photos(dogs)

        # Print summary
        print("\n" + "=" * 60)
        print("  Summary")
        print("=" * 60)
        print(f"Total dogs:      {result['total']}")
        print(f"Processed:       {result['processed']}")
        print(f"Errors:          {result['errors']}")
        print(f"Success rate:    {result['processed'] / result['total'] * 100:.1f}%")
        print(f"Total cost:      ${result['total_cost']:.4f}")
        print("=" * 60 + "\n")

        return result


def parse_args(args: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Analyze dog photos for Instagram suitability",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze all unanalyzed dogs
  python management/instagram_photo_analyzer.py --all

  # Analyze 100 dogs
  python management/instagram_photo_analyzer.py --limit 100

  # Dry run (no database writes)
  python management/instagram_photo_analyzer.py --limit 10 --dry-run
        """,
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Process all unanalyzed dogs")
    group.add_argument("--limit", type=int, help="Process N dogs")

    parser.add_argument(
        "--dry-run", action="store_true", help="Don't write to database"
    )
    parser.add_argument(
        "--batch-size", type=int, default=10, help="Concurrent batch size (default: 10)"
    )

    return parser.parse_args(args)


async def main():
    """Main entry point."""
    args = parse_args()

    # Connect to database
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME", "rescue_dogs"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )

    try:
        # Create analyzer
        analyzer = InstagramPhotoAnalyzer(
            connection=conn, dry_run=args.dry_run, batch_size=args.batch_size
        )

        # Run analysis
        limit = None if args.all else args.limit
        await analyzer.run(limit=limit)

    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(main())
