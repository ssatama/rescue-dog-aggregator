"""
Service layer for enhanced animal data operations.

Handles:
- Efficient JSONB queries
- Caching strategies
- Graceful degradation for non-enriched data
- Performance optimization for common use cases

Following CLAUDE.md principles:
- Pure functions
- Immutable data
- Early returns
"""

import hashlib
import json
import logging
import time
from collections import Counter
from typing import Any

from cachetools import TTLCache
from psycopg2 import InterfaceError, OperationalError
from psycopg2.extras import RealDictCursor

from api.exceptions import DatabaseRetryExhaustedError, DataNormalizationError
from api.models.enhanced_animal import (
    DetailContentResponse,
    EnhancedAnimalResponse,
    EnhancedAttributes,
)

logger = logging.getLogger(__name__)


class EnhancedAnimalService:
    """Service for handling enhanced animal data operations."""

    def _execute_with_retry(self, query: str, params: tuple | None = None) -> None:
        """
        Execute database query with retry logic for transient failures.

        Uses exponential backoff: 0.1s, 0.2s, 0.4s
        """
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                if params:
                    self.cursor.execute(query, params)
                else:
                    self.cursor.execute(query)
                return  # Success

            except (OperationalError, InterfaceError) as e:
                # These are transient errors that can be retried
                last_exception = e
                if attempt < self.max_retries - 1:
                    sleep_time = 0.1 * (2**attempt)  # Exponential backoff
                    logger.warning(f"Database query failed (attempt {attempt + 1}/{self.max_retries}), retrying in {sleep_time}s: {e}")
                    time.sleep(sleep_time)
                else:
                    logger.error(f"Database query failed after {self.max_retries} attempts: {e}")

            except Exception as e:
                # Non-transient errors should not be retried
                logger.error(f"Non-transient database error: {e}")
                raise

        # If we get here, all retries failed
        if last_exception:
            raise DatabaseRetryExhaustedError(
                f"Database operation failed after {self.max_retries} retries",
                operation="execute_query",
                details={"query": query[:100], "error": str(last_exception)},
            )

    def __init__(self, cursor: RealDictCursor, max_retries: int = 3):
        """Initialize with database cursor and caches."""
        self.cursor = cursor
        self.max_retries = max_retries
        # Separate caches for different use cases
        self._detail_cache = TTLCache(maxsize=500, ttl=300)  # 5 min for detail pages
        self._bulk_cache = TTLCache(maxsize=200, ttl=60)  # 1 min for bulk ops
        self._content_cache = TTLCache(maxsize=1000, ttl=300)  # 5 min for descriptions

        # Metrics counters
        self._metrics = {
            "cache_hits": Counter(),
            "cache_misses": Counter(),
            "db_queries": Counter(),
            "db_retries": Counter(),
            "errors": Counter(),
            "response_times": [],  # Store last 100 response times
        }

    def get_enhanced_detail(self, animal_id: int) -> EnhancedAnimalResponse | None:
        """
        Get enhanced data for single animal - optimized for detail pages.

        Performance target: <100ms
        """
        start_time = time.time()

        # Check cache first
        if animal_id in self._detail_cache:
            self._metrics["cache_hits"]["detail"] += 1
            cached = self._detail_cache[animal_id]
            if cached and cached.metadata:
                cached.metadata["cached"] = True
            self._track_response_time(start_time)
            return cached

        self._metrics["cache_misses"]["detail"] += 1
        logger.debug(f"Cache miss for animal {animal_id}, fetching from database")

        query = """
            SELECT 
                id, 
                name, 
                slug,
                dog_profiler_data,
                CASE 
                    WHEN dog_profiler_data IS NOT NULL 
                    AND dog_profiler_data != '{}'::jsonb 
                    THEN true 
                    ELSE false 
                END as has_data
            FROM animals
            WHERE id = %s
        """

        self._execute_with_retry(query, (animal_id,))
        result = self.cursor.fetchone()

        if not result:
            return None

        response = self._build_enhanced_response(dict(result))

        # Cache the response
        self._detail_cache[animal_id] = response
        logger.debug(f"Cached enhanced data for animal {animal_id}")

        self._track_response_time(start_time)
        return response

    def get_detail_content(self, animal_ids: list[int]) -> list[DetailContentResponse]:
        """
        Ultra-optimized for description + tagline (primary use case).

        Performance target: <50ms for single, <200ms for batch
        """
        start_time = time.time()

        # Check cache for individual items
        cached_results = []
        uncached_ids = []

        for aid in animal_ids:
            cache_key = f"content_{aid}"
            if cache_key in self._content_cache:
                self._metrics["cache_hits"]["content"] += 1
                cached_results.append(self._content_cache[cache_key])
            else:
                self._metrics["cache_misses"]["content"] += 1
                uncached_ids.append(aid)

        # Fetch uncached items if any
        fresh_results = []
        if uncached_ids:
            query = """
                SELECT 
                    id,
                    dog_profiler_data->>'description' as description,
                    dog_profiler_data->>'tagline' as tagline,
                    CASE 
                        WHEN dog_profiler_data IS NOT NULL 
                        AND dog_profiler_data != '{}'::jsonb
                        THEN true 
                        ELSE false 
                    END as has_enhanced_data
                FROM animals
                WHERE id = ANY(%s)
            """

            self._metrics["db_queries"]["content"] += 1
            self._execute_with_retry(query, (uncached_ids,))
            results = self.cursor.fetchall()

            for row in results:
                response = DetailContentResponse(
                    id=row["id"],
                    description=row["description"],
                    tagline=row["tagline"],
                    has_enhanced_data=row["has_enhanced_data"],
                )
                fresh_results.append(response)
                # Cache individual results
                self._content_cache[f"content_{row['id']}"] = response

        # Combine cached and fresh results
        all_results = cached_results + fresh_results

        # Sort by original ID order for consistency
        id_order = {aid: i for i, aid in enumerate(animal_ids)}
        all_results.sort(key=lambda x: id_order.get(x.id, float("inf")))

        self._track_response_time(start_time)
        return all_results

    def get_bulk_enhanced(self, animal_ids: list[int]) -> list[EnhancedAnimalResponse]:
        """
        Bulk retrieval with efficient batching.

        Performance target: <500ms for 100 animals
        """
        start_time = time.time()

        # Use hash of sorted IDs as cache key for memory efficiency
        cache_key = self._generate_bulk_cache_key(animal_ids)

        # Check bulk cache
        if cache_key in self._bulk_cache:
            self._metrics["cache_hits"]["bulk"] += 1
            cached = self._bulk_cache[cache_key]
            # Mark as cached in metadata
            for item in cached:
                if item.metadata:
                    item.metadata["cached"] = True
            self._track_response_time(start_time)
            return cached

        self._metrics["cache_misses"]["bulk"] += 1
        self._metrics["db_queries"]["bulk"] += 1
        logger.debug(f"Bulk cache miss for {len(animal_ids)} animals, fetching from database")

        query = """
            SELECT 
                id, 
                name, 
                slug,
                dog_profiler_data,
                CASE 
                    WHEN dog_profiler_data IS NOT NULL 
                    AND dog_profiler_data != '{}'::jsonb 
                    THEN true 
                    ELSE false 
                END as has_data
            FROM animals
            WHERE id = ANY(%s)
            ORDER BY id
        """

        self._execute_with_retry(query, (animal_ids,))
        results = self.cursor.fetchall()

        responses = []
        for row in results:
            response = self._build_enhanced_response(dict(row))
            responses.append(response)

        # Cache the bulk result
        if len(responses) <= 100:  # Only cache reasonable sized requests
            self._bulk_cache[cache_key] = responses
            logger.debug(f"Cached bulk result for {len(responses)} animals with key {cache_key}")

        self._track_response_time(start_time)
        return responses

    def get_attributes(self, animal_ids: list[int], attributes: list[str]) -> dict[int, dict[str, Any]]:
        """
        Fetch specific attributes using JSONB operators.

        Optimized for filter population and attribute comparison.
        """
        start_time = time.time()
        self._metrics["db_queries"]["attributes"] += 1

        # Validate attributes to prevent SQL injection
        safe_attributes = [
            attr
            for attr in attributes
            if attr
            in {
                "description",
                "tagline",
                "personality_traits",
                "energy_level",
                "trainability",
                "experience_level",
                "grooming_needs",
                "exercise_needs",
                "good_with_kids",
                "good_with_dogs",
                "good_with_cats",
                "good_with_strangers",
                "special_needs",
                "ideal_home",
            }
        ]

        if not safe_attributes:
            self._track_response_time(start_time)
            return {}

        # Build dynamic attribute extraction
        attr_extracts = []
        for attr in safe_attributes:
            # Handle array fields differently
            if attr in ["personality_traits", "special_needs"]:
                attr_extracts.append(f"dog_profiler_data->'{attr}' as {attr}")
            else:
                attr_extracts.append(f"dog_profiler_data->>'{attr}' as {attr}")

        query = f"""
            SELECT 
                id,
                {", ".join(attr_extracts)}
            FROM animals
            WHERE id = ANY(%s)
            AND dog_profiler_data IS NOT NULL
            AND dog_profiler_data != '{{}}'::jsonb
        """

        self._execute_with_retry(query, (animal_ids,))
        results = self.cursor.fetchall()

        # Build response dictionary
        response = {}
        for row in results:
            row_dict = dict(row)
            animal_id = row_dict.pop("id")

            # Process array fields
            for attr in ["personality_traits", "special_needs"]:
                if attr in row_dict and row_dict[attr] is not None:
                    # Convert JSONB array to Python list
                    if isinstance(row_dict[attr], str):
                        try:
                            row_dict[attr] = json.loads(row_dict[attr])
                        except json.JSONDecodeError:
                            row_dict[attr] = []

            # Filter out None values
            response[animal_id] = {k: v for k, v in row_dict.items() if v is not None}

        self._track_response_time(start_time)
        return response

    def _build_enhanced_response(self, row: dict) -> EnhancedAnimalResponse:
        """Transform database row to response model."""

        profiler_data = row.get("dog_profiler_data") or {}
        has_data = row.get("has_data", False)

        # Calculate completeness score
        completeness = self._calculate_completeness_score(profiler_data)

        # Build enhanced attributes if data exists
        enhanced_attrs = None
        if has_data and profiler_data:
            try:
                # Safely extract and normalize attributes
                enhanced_attrs = EnhancedAttributes(
                    description=profiler_data.get("description"),
                    tagline=profiler_data.get("tagline"),
                    personality_traits=self._ensure_list(profiler_data.get("personality_traits", [])),
                    energy_level=profiler_data.get("energy_level"),
                    trainability=profiler_data.get("trainability"),
                    experience_level=profiler_data.get("experience_level"),
                    grooming_needs=profiler_data.get("grooming_needs"),
                    exercise_needs=profiler_data.get("exercise_needs"),
                    good_with_kids=self._normalize_boolean(profiler_data.get("good_with_kids")),
                    good_with_dogs=self._normalize_boolean(profiler_data.get("good_with_dogs")),
                    good_with_cats=self._normalize_boolean(profiler_data.get("good_with_cats")),
                    good_with_strangers=self._normalize_boolean(profiler_data.get("good_with_strangers")),
                    special_needs=self._ensure_list(profiler_data.get("special_needs", [])),
                    ideal_home=profiler_data.get("ideal_home"),
                )
            except Exception as e:
                logger.warning(f"Error parsing enhanced attributes for animal {row['id']}: {e}")
                # Raise specific error for data normalization issues
                raise DataNormalizationError(
                    f"Failed to normalize enhanced data for animal {row['id']}",
                    animal_id=row["id"],
                    operation="parse_enhanced_attributes",
                    details={"error": str(e), "data_keys": list(profiler_data.keys())},
                )

        return EnhancedAnimalResponse(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            enhanced_data_available=has_data,
            enhanced_attributes=enhanced_attrs,
            data_completeness_score=completeness,
            metadata={
                "cached": False,
                "profiled_at": profiler_data.get("profiled_at") if profiler_data else None,
                "model_used": profiler_data.get("model_used") if profiler_data else None,
                "quality_score": profiler_data.get("quality_score") if profiler_data else None,
            },
        )

    def _calculate_completeness_score(self, data: dict[str, Any]) -> float:
        """
        Calculate how complete the enhanced data is (0-100).

        Weights important fields more heavily.
        """
        if not data or data == {}:
            return 0.0

        # Define required fields and their weights
        field_weights = {
            "description": 25,  # Most important for detail pages
            "tagline": 15,  # Important for engagement
            "personality_traits": 10,
            "energy_level": 10,
            "trainability": 10,
            "experience_level": 10,
            "good_with_kids": 5,
            "good_with_dogs": 5,
            "good_with_cats": 5,
            "ideal_home": 5,
        }

        score = 0.0
        for field, weight in field_weights.items():
            value = data.get(field)
            if value:
                # Check if value is meaningful (not empty list/string)
                if isinstance(value, list) and len(value) > 0:
                    score += weight
                elif isinstance(value, str) and value.strip():
                    score += weight
                elif isinstance(value, bool):
                    score += weight
                elif value is not None and not isinstance(value, (list, str)):
                    score += weight

        return min(score, 100.0)

    def _normalize_boolean(self, value: Any) -> bool | None:
        """
        Normalize various boolean representations from LLM data.

        Handles: true/false, yes/no, unknown, selective, etc.
        """
        if value is None:
            return None

        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            value_lower = value.lower().strip()

            # True values
            if value_lower in ["true", "yes", "1", "y", "t"]:
                return True

            # False values
            if value_lower in ["false", "no", "0", "n", "f"]:
                return False

            # Unknown/uncertain values - return None for optional field
            if value_lower in ["unknown", "uncertain", "unclear", "n/a", "na"]:
                return None

            # Selective/conditional values - default to None
            if value_lower in [
                "selective",
                "sometimes",
                "depends",
                "maybe",
                "possibly",
            ]:
                return None

        # If we can't parse it, return None
        return None

    def _generate_bulk_cache_key(self, animal_ids: list[int]) -> str:
        """
        Generate memory-efficient cache key for bulk operations.

        Uses SHA256 hash of sorted IDs to reduce memory footprint.
        """
        # Sort IDs for consistent hashing
        sorted_ids = sorted(animal_ids)
        # Create string representation
        ids_str = ",".join(map(str, sorted_ids))
        # Generate hash (first 16 chars is sufficient for uniqueness)
        return hashlib.sha256(ids_str.encode()).hexdigest()[:16]

    def _ensure_list(self, value: Any) -> list[str]:
        """
        Ensure value is a list, converting strings if necessary.

        Handles both list values and comma-separated strings.
        """
        if value is None:
            return []

        if isinstance(value, list):
            # Filter out None values and ensure all items are strings
            return [str(item) for item in value if item is not None]

        if isinstance(value, str):
            # Handle comma-separated strings
            if "," in value:
                items = [item.strip() for item in value.split(",")]
                return [item for item in items if item]
            # Single string value becomes single-item list
            return [value.strip()] if value.strip() else []

        # Fallback to empty list
        return []

    def invalidate_cache(self, animal_id: int | None = None) -> None:
        """
        Invalidate cache entries.

        Args:
            animal_id: Specific animal to invalidate. If None, clears all caches.
        """
        if animal_id is None:
            # Clear all caches
            self._detail_cache.clear()
            self._bulk_cache.clear()
            self._content_cache.clear()
            logger.info("Cleared all enhanced data caches")
        else:
            # Clear specific animal from caches
            if animal_id in self._detail_cache:
                del self._detail_cache[animal_id]

            # Clear content cache for this animal
            content_key = f"content_{animal_id}"
            if content_key in self._content_cache:
                del self._content_cache[content_key]

            # Clear bulk cache (we can't efficiently check which hashes contain this ID)
            # This is a trade-off for memory efficiency
            self._bulk_cache.clear()

            logger.info(f"Invalidated cache for animal {animal_id}")

    def invalidate_bulk_cache(self) -> None:
        """Clear only the bulk cache."""
        self._bulk_cache.clear()
        logger.info("Cleared bulk enhanced data cache")

    def _track_response_time(self, start_time: float) -> None:
        """Track response time and check if it's slow."""
        elapsed = (time.time() - start_time) * 1000  # Convert to ms

        # Keep only last 100 response times
        if len(self._metrics["response_times"]) >= 100:
            self._metrics["response_times"].pop(0)
        self._metrics["response_times"].append(elapsed)

        # Log slow queries
        if elapsed > 100:  # Single query target
            logger.warning(f"Slow query detected: {elapsed:.2f}ms")

    def get_cache_stats(self) -> dict[str, Any]:
        """
        Get cache statistics for monitoring.

        Returns:
            Dictionary with cache sizes and hit rates
        """
        # Calculate hit rates
        detail_hits = self._metrics["cache_hits"].get("detail", 0)
        detail_misses = self._metrics["cache_misses"].get("detail", 0)
        detail_total = detail_hits + detail_misses
        detail_hit_rate = (detail_hits / detail_total * 100) if detail_total > 0 else 0

        content_hits = self._metrics["cache_hits"].get("content", 0)
        content_misses = self._metrics["cache_misses"].get("content", 0)
        content_total = content_hits + content_misses
        content_hit_rate = (content_hits / content_total * 100) if content_total > 0 else 0

        bulk_hits = self._metrics["cache_hits"].get("bulk", 0)
        bulk_misses = self._metrics["cache_misses"].get("bulk", 0)
        bulk_total = bulk_hits + bulk_misses
        bulk_hit_rate = (bulk_hits / bulk_total * 100) if bulk_total > 0 else 0

        return {
            "detail_cache_size": len(self._detail_cache),
            "bulk_cache_size": len(self._bulk_cache),
            "content_cache_size": len(self._content_cache),
            "detail_cache_maxsize": self._detail_cache.maxsize,
            "bulk_cache_maxsize": self._bulk_cache.maxsize,
            "content_cache_maxsize": self._content_cache.maxsize,
            "detail_hit_rate": round(detail_hit_rate, 2),
            "content_hit_rate": round(content_hit_rate, 2),
            "bulk_hit_rate": round(bulk_hit_rate, 2),
        }

    def get_metrics(self) -> dict[str, Any]:
        """
        Get comprehensive metrics for monitoring.

        Returns:
            Dictionary with all metrics including cache stats, query counts, and response times
        """
        # Calculate average response time
        response_times = self._metrics["response_times"]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        # Calculate percentiles if we have data
        p50 = p95 = p99 = 0
        if response_times:
            sorted_times = sorted(response_times)
            n = len(sorted_times)
            p50 = sorted_times[int(n * 0.5)]
            p95 = sorted_times[int(n * 0.95)] if n > 20 else sorted_times[-1]
            p99 = sorted_times[int(n * 0.99)] if n > 100 else sorted_times[-1]

        return {
            "cache_stats": self.get_cache_stats(),
            "cache_hits": dict(self._metrics["cache_hits"]),
            "cache_misses": dict(self._metrics["cache_misses"]),
            "db_queries": dict(self._metrics["db_queries"]),
            "db_retries": dict(self._metrics["db_retries"]),
            "errors": dict(self._metrics["errors"]),
            "response_times": {
                "count": len(response_times),
                "avg_ms": round(avg_response_time, 2),
                "p50_ms": round(p50, 2),
                "p95_ms": round(p95, 2),
                "p99_ms": round(p99, 2),
            },
        }
