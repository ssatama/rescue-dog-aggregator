from typing import List, Optional, Dict, Any
from sqlalchemy import text, select, and_, or_, func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib
import json
from functools import lru_cache


class SwipeQueries:
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
    
    def get_swipe_queue(
        self,
        country: str,
        size: Optional[List[str]] = None,
        limit: int = 20,
        offset: int = 0,
        excluded_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        
        # Build cache key
        cache_key = self._build_cache_key(country, size, limit, offset, excluded_ids)
        cached_result = self._get_cached_result(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Build optimized query with proper indexes and pagination
        query_str, params = self._build_optimized_query(country, size, excluded_ids, limit, offset)
        
        # Execute query
        result = self.db.execute(text(query_str), params)
        dogs = result.fetchall()
        
        # Convert to dict format
        dogs_data = self._format_dogs_data(dogs)
        
        # Cache the result
        self._cache_result(cache_key, dogs_data)
        
        return dogs_data
    
    def preload_batch(
        self,
        country: str,
        current_queue_size: int,
        excluded_ids: Optional[List[int]] = None,
        size: Optional[List[str]] = None
    ) -> Optional[List[Dict[str, Any]]]:
        
        # Only preload if queue is running low
        if current_queue_size > 5:
            return None
        
        # Fetch next batch of 15
        return self.get_swipe_queue(
            country=country,
            size=size,
            limit=15,
            offset=0,
            excluded_ids=excluded_ids
        )
    
    def explain_query(self, country: str, size: Optional[str] = None) -> List[str]:
        
        # Build the query
        base_query = """
        EXPLAIN ANALYZE
        SELECT a.id, a.name, a.properties
        FROM animals a
        JOIN organizations o ON a.organization_id = o.id
        WHERE o.properties->>'country' = :country
        AND (a.properties->>'quality_score')::float > 0.7
        """
        
        if size:
            base_query += " AND a.properties->>'size' = :size"
        
        base_query += " ORDER BY a.created_at DESC LIMIT 20"
        
        params = {"country": country}
        if size:
            params["size"] = size
        
        result = self.db.execute(text(base_query), params)
        return result.scalars().all()
    
    def _build_optimized_query(
        self,
        country: str,
        size: Optional[List[str]] = None,
        excluded_ids: Optional[List[int]] = None,
        limit: int = 20,
        offset: int = 0
    ):
        
        # Use raw SQL for better performance with indexes
        base_query = """
        SELECT 
            a.id,
            a.name,
            a.properties,
            a.created_at,
            o.name as organization_name,
            o.properties->>'country' as country
        FROM animals a
        JOIN organizations o ON a.organization_id = o.id
        WHERE o.properties->>'country' = :country
        AND (a.properties->>'quality_score')::float > 0.7
        AND a.properties->>'dog_profiler_data' IS NOT NULL
        """
        
        params = {"country": country}
        
        # Add size filter with IN clause for efficiency
        if size:
            placeholders = ", ".join([f":size_{i}" for i in range(len(size))])
            base_query += f" AND a.properties->>'size' IN ({placeholders})"
            for i, s in enumerate(size):
                params[f"size_{i}"] = s
        
        # Exclude already swiped dogs
        if excluded_ids:
            placeholders = ", ".join([f":excluded_{i}" for i in range(len(excluded_ids))])
            base_query += f" AND a.id NOT IN ({placeholders})"
            for i, dog_id in enumerate(excluded_ids):
                params[f"excluded_{i}"] = dog_id
        
        # Add ordering for diversity
        new_threshold = datetime.now() - timedelta(days=7)
        base_query += """
        ORDER BY 
            CASE 
                WHEN a.created_at > :new_threshold THEN 0
                ELSE 1
            END,
            a.created_at DESC,
            RANDOM()
        LIMIT :limit OFFSET :offset
        """
        
        params["new_threshold"] = new_threshold
        params["limit"] = limit
        params["offset"] = offset
        
        return base_query, params
    
    
    def _format_dogs_data(self, dogs) -> List[Dict[str, Any]]:
        
        formatted = []
        for dog in dogs:
            dog_data = {
                "id": dog.id if hasattr(dog, 'id') else dog[0],
                "name": dog.name if hasattr(dog, 'name') else dog[1],
                "properties": dog.properties if hasattr(dog, 'properties') else dog[2],
                "created_at": str(dog.created_at) if hasattr(dog, 'created_at') else str(dog[3]),
                "organization_name": dog.organization_name if hasattr(dog, 'organization_name') else dog[4],
                "country": dog.country if hasattr(dog, 'country') else dog[5]
            }
            formatted.append(dog_data)
        
        return formatted
    
    def _build_cache_key(
        self,
        country: str,
        size: Optional[List[str]],
        limit: int,
        offset: int,
        excluded_ids: Optional[List[int]]
    ) -> str:
        
        key_parts = [
            country,
            json.dumps(sorted(size) if size else []),
            str(limit),
            str(offset),
            json.dumps(sorted(excluded_ids) if excluded_ids else [])
        ]
        
        key_string = ":".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cached_result(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=self._cache_ttl):
                return cached_data
            else:
                # Expired, remove from cache
                del self._cache[cache_key]
        
        return None
    
    def _cache_result(self, cache_key: str, data: List[Dict[str, Any]]):
        
        # Limit cache size to prevent memory issues
        if len(self._cache) > 100:
            # Remove oldest entries
            oldest_keys = sorted(
                self._cache.keys(),
                key=lambda k: self._cache[k][1]
            )[:20]
            for key in oldest_keys:
                del self._cache[key]
        
        self._cache[cache_key] = (data, datetime.now())
    
    def create_indexes(self) -> List[str]:
        
        # Return SQL statements to create optimal indexes
        return [
            "CREATE INDEX IF NOT EXISTS idx_animals_country_quality ON animals ((properties->>'quality_score'), (properties->>'dog_profiler_data'))",
            "CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations ((properties->>'country'))",
            "CREATE INDEX IF NOT EXISTS idx_animals_created_at ON animals (created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_animals_size ON animals ((properties->>'size'))",
            "CREATE INDEX IF NOT EXISTS idx_animals_organization_id ON animals (organization_id)"
        ]