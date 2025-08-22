#!/usr/bin/env python3
"""
Database monitoring utilities for index usage and performance.

This module provides tools to monitor database index effectiveness,
query performance, and generate optimization recommendations.
"""

import argparse
import logging
from datetime import datetime
from typing import Dict, List

import psycopg2
from psycopg2.extras import RealDictCursor
from tabulate import tabulate

from config import DB_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IndexMonitor:
    """Monitor and analyze database index usage."""

    def __init__(self):
        self.conn = psycopg2.connect(**DB_CONFIG)
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cursor.close()
        self.conn.close()

    def capture_index_stats(self) -> None:
        """Capture current index statistics to monitoring table."""
        try:
            # Call the monitoring function we created in migration
            self.cursor.execute("SELECT capture_index_stats()")
            self.conn.commit()
            logger.info("Index statistics captured successfully")
        except Exception as e:
            logger.error(f"Failed to capture index stats: {e}")
            self.conn.rollback()

    def get_unused_indexes(self, days: int = 7) -> List[Dict]:
        """Find indexes that haven't been used in the specified period."""
        query = """
            SELECT 
                schemaname,
                relname AS tablename,
                indexrelname AS index_name,
                pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
                idx_scan AS scans_total
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND schemaname = 'public'
            ORDER BY pg_relation_size(indexrelid) DESC
        """
        self.cursor.execute(query)
        return self.cursor.fetchall()

    def get_index_effectiveness(self) -> List[Dict]:
        """Calculate effectiveness score for all indexes."""
        query = """
            SELECT 
                relname AS tablename,
                indexrelname AS index_name,
                idx_scan AS scans,
                idx_tup_read AS tuples_read,
                idx_tup_fetch AS tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
                CASE 
                    WHEN idx_scan = 0 THEN 0
                    ELSE ROUND((idx_tup_fetch::numeric / NULLIF(idx_scan, 0))::numeric, 2)
                END AS avg_tuples_per_scan
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC
        """
        self.cursor.execute(query)
        return self.cursor.fetchall()

    def get_duplicate_indexes(self) -> List[Dict]:
        """Find potentially duplicate indexes."""
        query = """
            WITH index_info AS (
                SELECT
                    n.nspname AS schema_name,
                    t.relname AS table_name,
                    i.relname AS index_name,
                    array_to_string(array_agg(a.attname ORDER BY k.i), ',') AS column_names,
                    pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
                    idx.indisunique AS is_unique,
                    idx.indisprimary AS is_primary
                FROM pg_index idx
                JOIN pg_class i ON i.oid = idx.indexrelid
                JOIN pg_class t ON t.oid = idx.indrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                CROSS JOIN LATERAL unnest(idx.indkey) WITH ORDINALITY AS k(attnum, i)
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname = 'public'
                GROUP BY n.nspname, t.relname, i.relname, i.oid, idx.indisunique, idx.indisprimary
            )
            SELECT 
                a.table_name,
                a.index_name AS index1,
                b.index_name AS index2,
                a.column_names AS columns,
                a.index_size AS size1,
                b.index_size AS size2
            FROM index_info a
            JOIN index_info b ON a.table_name = b.table_name 
                AND a.column_names = b.column_names
                AND a.index_name < b.index_name
            WHERE NOT (a.is_unique OR a.is_primary OR b.is_unique OR b.is_primary)
        """
        self.cursor.execute(query)
        return self.cursor.fetchall()

    def get_missing_indexes_recommendation(self) -> List[Dict]:
        """Recommend potential missing indexes based on query patterns."""
        query = """
            SELECT 
                schemaname,
                tablename,
                attname AS column_name,
                n_distinct,
                correlation,
                null_frac
            FROM pg_stats
            WHERE schemaname = 'public'
            AND n_distinct > 100
            AND correlation < 0.1
            AND null_frac < 0.5
            AND tablename = 'animals'
            ORDER BY n_distinct DESC
            LIMIT 10
        """
        self.cursor.execute(query)
        return self.cursor.fetchall()

    def generate_report(self) -> None:
        """Generate comprehensive index monitoring report."""
        print("\n" + "=" * 80)
        print("DATABASE INDEX MONITORING REPORT")
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

        # Unused indexes
        unused = self.get_unused_indexes()
        if unused:
            print("\n📊 UNUSED INDEXES (Consider removing):")
            print(tabulate(unused, headers="keys", tablefmt="grid"))

        # Index effectiveness
        effectiveness = self.get_index_effectiveness()[:10]
        print("\n📈 TOP 10 MOST USED INDEXES:")
        print(tabulate(effectiveness, headers="keys", tablefmt="grid"))

        # Duplicate indexes
        duplicates = self.get_duplicate_indexes()
        if duplicates:
            print("\n🔄 POTENTIAL DUPLICATE INDEXES:")
            print(tabulate(duplicates, headers="keys", tablefmt="grid"))

        # Missing index recommendations
        missing = self.get_missing_indexes_recommendation()
        if missing:
            print("\n💡 POTENTIAL MISSING INDEXES (High cardinality columns):")
            print(tabulate(missing, headers="keys", tablefmt="grid"))

        print("\n" + "=" * 80)


def main():
    """Main entry point for database monitoring."""
    parser = argparse.ArgumentParser(description="Database Index Monitoring")
    parser.add_argument(
        "--capture",
        action="store_true",
        help="Capture current index statistics",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate monitoring report",
    )
    parser.add_argument(
        "--unused-days",
        type=int,
        default=7,
        help="Days to consider for unused indexes (default: 7)",
    )

    args = parser.parse_args()

    with IndexMonitor() as monitor:
        if args.capture:
            monitor.capture_index_stats()

        if args.report or (not args.capture):
            monitor.generate_report()


if __name__ == "__main__":
    main()
