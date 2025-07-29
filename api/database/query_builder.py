# api/database/query_builder.py

"""
Query builder for complex database queries with N+1 prevention.

This module provides a fluent query builder to construct complex queries
and batch operations to prevent N+1 query patterns.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class QueryBuilder:
    """Fluent query builder for PostgreSQL queries."""

    def __init__(self):
        self._select_fields: List[str] = []
        self._from_table: str = ""
        self._joins: List[str] = []
        self._where_conditions: List[str] = []
        self._group_by_fields: List[str] = []
        self._having_conditions: List[str] = []
        self._order_by_fields: List[str] = []
        self._limit_value: Optional[int] = None
        self._offset_value: Optional[int] = None
        self._params: List[Any] = []

    def select(self, *fields: str) -> "QueryBuilder":
        """Add SELECT fields."""
        self._select_fields.extend(fields)
        return self

    def from_table(self, table: str, alias: Optional[str] = None) -> "QueryBuilder":
        """Set FROM table."""
        self._from_table = f"{table} {alias}" if alias else table
        return self

    def left_join(self, table: str, on_condition: str, alias: Optional[str] = None) -> "QueryBuilder":
        """Add LEFT JOIN."""
        table_expr = f"{table} {alias}" if alias else table
        self._joins.append(f"LEFT JOIN {table_expr} ON {on_condition}")
        return self

    def inner_join(self, table: str, on_condition: str, alias: Optional[str] = None) -> "QueryBuilder":
        """Add INNER JOIN."""
        table_expr = f"{table} {alias}" if alias else table
        self._joins.append(f"INNER JOIN {table_expr} ON {on_condition}")
        return self

    def where(self, condition: str, *params: Any) -> "QueryBuilder":
        """Add WHERE condition with parameters."""
        self._where_conditions.append(condition)
        self._params.extend(params)
        return self

    def where_in(self, column: str, values: List[Any]) -> "QueryBuilder":
        """Add WHERE IN condition."""
        if not values:
            # Handle empty list case
            self._where_conditions.append("1 = 0")  # Always false
            return self

        placeholders = ",".join(["%s"] * len(values))
        self._where_conditions.append(f"{column} IN ({placeholders})")
        self._params.extend(values)
        return self

    def group_by(self, *fields: str) -> "QueryBuilder":
        """Add GROUP BY fields."""
        self._group_by_fields.extend(fields)
        return self

    def having(self, condition: str, *params: Any) -> "QueryBuilder":
        """Add HAVING condition with parameters."""
        self._having_conditions.append(condition)
        self._params.extend(params)
        return self

    def order_by(self, field: str, direction: str = "ASC") -> "QueryBuilder":
        """Add ORDER BY field."""
        self._order_by_fields.append(f"{field} {direction}")
        return self

    def limit(self, count: int) -> "QueryBuilder":
        """Add LIMIT."""
        self._limit_value = count
        return self

    def offset(self, count: int) -> "QueryBuilder":
        """Add OFFSET."""
        self._offset_value = count
        return self

    def build(self) -> Tuple[str, List[Any]]:
        """Build the query and return query string and parameters."""
        if not self._select_fields:
            raise ValueError("SELECT fields are required")
        if not self._from_table:
            raise ValueError("FROM table is required")

        # Build SELECT clause
        query_parts = [f"SELECT {', '.join(self._select_fields)}"]

        # Build FROM clause
        query_parts.append(f"FROM {self._from_table}")

        # Build JOIN clauses
        if self._joins:
            query_parts.extend(self._joins)

        # Build WHERE clause
        if self._where_conditions:
            query_parts.append(f"WHERE {' AND '.join(self._where_conditions)}")

        # Build GROUP BY clause
        if self._group_by_fields:
            query_parts.append(f"GROUP BY {', '.join(self._group_by_fields)}")

        # Build HAVING clause
        if self._having_conditions:
            query_parts.append(f"HAVING {' AND '.join(self._having_conditions)}")

        # Build ORDER BY clause
        if self._order_by_fields:
            query_parts.append(f"ORDER BY {', '.join(self._order_by_fields)}")

        # Build LIMIT clause
        if self._limit_value is not None:
            query_parts.append(f"LIMIT {self._limit_value}")

        # Build OFFSET clause
        if self._offset_value is not None:
            query_parts.append(f"OFFSET {self._offset_value}")

        query = " ".join(query_parts)
        return query, self._params

    def execute(self, cursor: RealDictCursor) -> List[Dict[str, Any]]:
        """Execute the query and return results."""
        query, params = self.build()
        logger.debug(f"Executing query: {query[:200]}{'...' if len(query) > 200 else ''}")
        logger.debug(f"Parameters: {params}")

        cursor.execute(query, params)
        return cursor.fetchall()


class BatchQueryExecutor:
    """Executes queries in batches to prevent N+1 problems."""

    def __init__(self, cursor: RealDictCursor):
        self.cursor = cursor

    def fetch_animals_with_images(self, animal_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Fetch images for multiple animals in a single query.

        This prevents the N+1 problem where we'd query images for each animal separately.
        """
        if not animal_ids:
            return {}

        query = QueryBuilder()
        query.select("animal_id", "id", "image_url", "is_primary")
        query.from_table("animal_images")
        query.where_in("animal_id", animal_ids)
        query.order_by("animal_id")
        query.order_by("is_primary", "DESC")
        query.order_by("id")

        results = query.execute(self.cursor)

        # Group by animal_id
        images_by_animal = {}
        for row in results:
            animal_id = row["animal_id"]
            if animal_id not in images_by_animal:
                images_by_animal[animal_id] = []
            images_by_animal[animal_id].append(row)

        return images_by_animal

    def fetch_organization_data(self, organization_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """
        Fetch organization data for multiple organizations in a single query.

        This prevents N+1 queries when fetching organization details for animals.
        """
        if not organization_ids:
            return {}

        query = QueryBuilder()
        query.select("id", "name", "city", "country", "website_url", "social_media", "ships_to", "logo_url", "service_regions", "description")
        query.from_table("organizations")
        query.where_in("id", organization_ids)

        results = query.execute(self.cursor)

        # Convert to dict keyed by organization_id
        return {row["id"]: dict(row) for row in results}

    def fetch_animal_statistics(self, organization_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """
        Fetch animal statistics for multiple organizations in a single query.
        """
        if not organization_ids:
            return {}

        query = QueryBuilder()
        query.select("organization_id", "COUNT(*) as total_dogs", "COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week")
        query.from_table("animals")
        query.where("status = %s", "available")
        query.where_in("organization_id", organization_ids)
        query.group_by("organization_id")

        results = query.execute(self.cursor)

        # Convert to dict keyed by organization_id
        return {row["organization_id"]: dict(row) for row in results}

    def fetch_service_regions(self, organization_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Fetch service regions for multiple organizations in a single query.
        """
        if not organization_ids:
            return {}

        query = QueryBuilder()
        query.select("organization_id", "country", "region")
        query.from_table("service_regions")
        query.where_in("organization_id", organization_ids)
        query.order_by("organization_id")
        query.order_by("country")
        query.order_by("region")

        results = query.execute(self.cursor)

        # Group by organization_id
        regions_by_org = {}
        for row in results:
            org_id = row["organization_id"]
            if org_id not in regions_by_org:
                regions_by_org[org_id] = []
            regions_by_org[org_id].append({"country": row["country"], "region": row["region"]})

        return regions_by_org


def create_query_builder() -> QueryBuilder:
    """Factory function to create a new query builder."""
    return QueryBuilder()


def create_batch_executor(cursor: RealDictCursor) -> BatchQueryExecutor:
    """Factory function to create a batch query executor."""
    return BatchQueryExecutor(cursor)
