#!/usr/bin/env python3
"""
Batch processor for dog profiling with progress tracking.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Comprehensive testing
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
from dotenv import load_dotenv
from tqdm import tqdm
from tqdm.asyncio import tqdm_asyncio

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from services.llm.dog_profiler import DogProfilerPipeline
from services.llm.quality_rubric import DogProfileQualityRubric

load_dotenv()

logger = logging.getLogger(__name__)


class DogProfilerBatchProcessor:
    """Process dogs in batches with progress tracking and monitoring."""
    
    def __init__(
        self,
        organization_id: int,
        chunk_size: int = 10,
        dry_run: bool = False,
        output_dir: Optional[Path] = None
    ):
        """
        Initialize batch processor.
        
        Args:
            organization_id: Organization to process
            chunk_size: Number of dogs per chunk
            dry_run: If True, don't save to database
            output_dir: Directory for output files
        """
        self.org_id = organization_id
        self.chunk_size = chunk_size
        self.dry_run = dry_run
        self.output_dir = output_dir or Path("services/llm/batch_results")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.pipeline = DogProfilerPipeline(
            organization_id=organization_id,
            dry_run=dry_run
        )
        self.rubric = DogProfileQualityRubric()
        
        self.results = []
        self.stats = {
            "total": 0,
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "quality_scores": [],
            "processing_times": [],
            "errors": []
        }
    
    def get_dogs_to_process(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get dogs that need processing from database.
        
        Args:
            limit: Maximum number of dogs to fetch
            
        Returns:
            List of dog dictionaries
        """
        conn = psycopg2.connect(
            host="localhost",
            database="rescue_dogs",
            user=os.environ.get("USER"),
            password=""
        )
        cursor = conn.cursor()
        
        query = """
            SELECT 
                id,
                name,
                breed,
                age_text,
                properties,
                external_id
            FROM animals
            WHERE organization_id = %s
            AND dog_profiler_data IS NULL
            AND name IS NOT NULL
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, (self.org_id,))
        rows = cursor.fetchall()
        
        dogs = []
        for row in rows:
            dogs.append({
                "id": row[0],
                "name": row[1],
                "breed": row[2] or "Mixed Breed",
                "age_text": row[3] or "Unknown",
                "properties": row[4] or {},
                "external_id": row[5]
            })
        
        cursor.close()
        conn.close()
        
        return dogs
    
    async def process_chunk(
        self,
        dogs: List[Dict[str, Any]],
        pbar: tqdm
    ) -> List[Dict[str, Any]]:
        """
        Process a chunk of dogs concurrently.
        
        Args:
            dogs: List of dogs to process
            pbar: Progress bar to update
            
        Returns:
            List of results
        """
        chunk_results = []
        
        # Process dogs concurrently within chunk
        tasks = []
        for dog in dogs:
            tasks.append(self.process_single_dog(dog))
        
        results = await asyncio.gather(*tasks)
        
        for dog, result in zip(dogs, results):
            if result:
                # Calculate quality score
                quality_score = self.rubric.calculate_quality_score(result)
                
                chunk_results.append({
                    "dog_id": dog["id"],
                    "name": dog["name"],
                    "breed": dog["breed"],
                    "success": True,
                    "quality_score": quality_score,
                    "processing_time_ms": result.get("processing_time_ms", 0),
                    "model_used": result.get("model_used", "unknown"),
                    "profile": result
                })
                
                self.stats["successful"] += 1
                self.stats["quality_scores"].append(quality_score)
                self.stats["processing_times"].append(result.get("processing_time_ms", 0))
            else:
                chunk_results.append({
                    "dog_id": dog["id"],
                    "name": dog["name"],
                    "breed": dog["breed"],
                    "success": False
                })
                self.stats["failed"] += 1
            
            self.stats["processed"] += 1
            pbar.update(1)
        
        return chunk_results
    
    async def process_single_dog(self, dog: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process a single dog with error handling.
        
        Args:
            dog: Dog data dictionary
            
        Returns:
            Profile data or None if failed
        """
        try:
            result = await self.pipeline.process_dog(dog)
            return result
        except Exception as e:
            logger.error(f"Failed to process {dog['name']}: {e}")
            self.stats["errors"].append({
                "dog_id": dog["id"],
                "name": dog["name"],
                "error": str(e)
            })
            return None
    
    async def run(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Run batch processing with progress tracking.
        
        Args:
            limit: Maximum number of dogs to process
            
        Returns:
            Summary statistics
        """
        # Get dogs to process
        dogs = self.get_dogs_to_process(limit)
        
        if not dogs:
            logger.info("No dogs found to process")
            return self.stats
        
        self.stats["total"] = len(dogs)
        
        print(f"{'=' * 80}")
        print(f"PROCESSING {len(dogs)} DOGS FROM ORGANIZATION {self.org_id}")
        print(f"{'=' * 80}")
        print(f"Chunk size: {self.chunk_size}")
        print(f"Dry run: {self.dry_run}")
        print()
        
        # Process in chunks with progress bar
        with tqdm(total=len(dogs), desc="Processing dogs") as pbar:
            for i in range(0, len(dogs), self.chunk_size):
                chunk = dogs[i:i + self.chunk_size]
                chunk_results = await self.process_chunk(chunk, pbar)
                self.results.extend(chunk_results)
                
                # Small delay between chunks
                if i + self.chunk_size < len(dogs):
                    await asyncio.sleep(1)
        
        # Calculate summary statistics
        if self.stats["quality_scores"]:
            self.stats["avg_quality"] = sum(self.stats["quality_scores"]) / len(self.stats["quality_scores"])
        else:
            self.stats["avg_quality"] = 0
        
        if self.stats["processing_times"]:
            self.stats["avg_time_ms"] = sum(self.stats["processing_times"]) / len(self.stats["processing_times"])
        else:
            self.stats["avg_time_ms"] = 0
        
        self.stats["success_rate"] = self.stats["successful"] / self.stats["total"] if self.stats["total"] > 0 else 0
        
        # Save results to file
        self.save_results()
        
        # Print summary
        self.print_summary()
        
        # Save successful profiles to database if not dry run
        if not self.dry_run and self.stats["successful"] > 0:
            await self.save_to_database()
        
        return self.stats
    
    def save_results(self):
        """Save results to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.output_dir / f"batch_{self.org_id}_{timestamp}.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump({
                "organization_id": self.org_id,
                "timestamp": timestamp,
                "stats": self.stats,
                "results": self.results[:100],  # First 100 for inspection
                "retry_stats": self.pipeline.retry_handler.get_stats()
            }, f, indent=2, default=str)
        
        print(f"\n✅ Results saved to {output_file}")
    
    def print_summary(self):
        """Print processing summary."""
        print(f"\n{'=' * 80}")
        print("SUMMARY")
        print(f"{'=' * 80}")
        print(f"Total dogs: {self.stats['total']}")
        print(f"Processed: {self.stats['processed']}")
        print(f"Successful: {self.stats['successful']} ({self.stats['success_rate']:.1%})")
        print(f"Failed: {self.stats['failed']}")
        
        if self.stats["successful"] > 0:
            print(f"\nQuality Metrics:")
            print(f"  Average quality score: {self.stats['avg_quality']:.2f}")
            print(f"  Average processing time: {self.stats['avg_time_ms']:.0f}ms ({self.stats['avg_time_ms']/1000:.1f}s)")
            
            # Quality distribution
            quality_dist = {
                "excellent (>0.9)": sum(1 for s in self.stats["quality_scores"] if s > 0.9),
                "good (0.8-0.9)": sum(1 for s in self.stats["quality_scores"] if 0.8 <= s <= 0.9),
                "fair (0.7-0.8)": sum(1 for s in self.stats["quality_scores"] if 0.7 <= s < 0.8),
                "poor (<0.7)": sum(1 for s in self.stats["quality_scores"] if s < 0.7)
            }
            print(f"  Quality distribution: {quality_dist}")
        
        # Retry statistics
        retry_stats = self.pipeline.retry_handler.get_stats()
        if retry_stats["total_attempts"] > 0:
            print(f"\nRetry Statistics:")
            print(f"  Total API attempts: {retry_stats['total_attempts']}")
            print(f"  Successful retries: {retry_stats['successful_retries']}")
            print(f"  Model fallbacks: {retry_stats['model_fallbacks']}")
            print(f"  Total delay time: {retry_stats['total_delay_seconds']:.1f}s")
        
        if self.stats["errors"]:
            print(f"\nFirst 5 errors:")
            for error in self.stats["errors"][:5]:
                print(f"  - {error['name']}: {error['error'][:100]}")
    
    async def save_to_database(self):
        """Save successful profiles to database."""
        successful_profiles = [r for r in self.results if r["success"]]
        
        if not successful_profiles:
            return
        
        conn = psycopg2.connect(
            host="localhost",
            database="rescue_dogs",
            user=os.environ.get("USER"),
            password=""
        )
        cursor = conn.cursor()
        
        saved_count = 0
        for result in successful_profiles:
            try:
                cursor.execute("""
                    UPDATE animals
                    SET dog_profiler_data = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(result["profile"]), result["dog_id"]))
                saved_count += 1
            except Exception as e:
                logger.error(f"Failed to save profile for dog {result['dog_id']}: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"\n✅ Saved {saved_count} profiles to database")


async def main():
    """Run batch processor."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Batch process dog profiles")
    parser.add_argument("--org-id", type=int, default=11, help="Organization ID")
    parser.add_argument("--limit", type=int, help="Maximum dogs to process")
    parser.add_argument("--chunk-size", type=int, default=10, help="Dogs per chunk")
    parser.add_argument("--dry-run", action="store_true", help="Don't save to database")
    
    args = parser.parse_args()
    
    processor = DogProfilerBatchProcessor(
        organization_id=args.org_id,
        chunk_size=args.chunk_size,
        dry_run=args.dry_run
    )
    
    await processor.run(limit=args.limit)


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    asyncio.run(main())