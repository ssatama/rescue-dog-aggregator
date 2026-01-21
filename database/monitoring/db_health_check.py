#!/usr/bin/env python3
"""
Database Health Check and Performance Monitoring Script
Rescue Dog Aggregator - Production Database Monitoring

This script performs comprehensive database health checks including:
- Connection status and performance metrics
- Index usage statistics
- Query performance analysis
- Replication lag monitoring (if applicable)
- Disk usage and growth trends
- Alert threshold checks

Usage:
    python db_health_check.py [--verbose] [--json] [--alert-email=admin@example.com]
"""

import argparse
import json
import os
import sys
from datetime import datetime
from email.mime.text import MIMEText

import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path for config import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_CONFIG


class DatabaseHealthChecker:
    """Comprehensive database health monitoring for production operations."""

    def __init__(self, alert_email: str | None = None):
        self.db_config = DB_CONFIG
        self.alerts = []
        self.warnings = []
        self.metrics = {}
        self.alert_email = alert_email

        # Alert thresholds
        self.THRESHOLDS = {
            "max_connections_percent": 80,
            "replication_lag_seconds": 300,  # 5 minutes
            "disk_usage_percent": 90,
            "slow_query_ms": 1000,
            "index_scan_ratio": 0.95,  # 95% index usage expected
            "available_animals_min": 100,  # Alert if too few animals
            "scrape_failure_hours": 6,  # Alert if no successful scrapes
        }

    def connect(self) -> psycopg2.extensions.connection:
        """Create database connection with error handling."""
        try:
            conn_params = {
                "host": self.db_config["host"],
                "user": self.db_config["user"],
                "database": self.db_config["database"],
                "cursor_factory": RealDictCursor,
            }
            if self.db_config["password"]:
                conn_params["password"] = self.db_config["password"]

            conn = psycopg2.connect(**conn_params)
            return conn
        except Exception as e:
            self.alerts.append(f"CRITICAL: Cannot connect to database: {e}")
            raise

    def check_basic_connectivity(self, conn) -> dict:
        """Test basic database connectivity and response time."""
        start_time = datetime.now()

        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1 as test, NOW() as server_time, version() as version")
                result = cursor.fetchone()

            response_time = (datetime.now() - start_time).total_seconds() * 1000

            metrics = {
                "connected": True,
                "response_time_ms": response_time,
                "server_time": result["server_time"],
                "version": result["version"],
            }

            if response_time > 100:
                self.warnings.append(f"Database response time is {response_time:.1f}ms (>100ms)")

            return metrics

        except Exception as e:
            self.alerts.append(f"CRITICAL: Basic connectivity test failed: {e}")
            return {"connected": False, "error": str(e)}

    def check_connection_stats(self, conn) -> dict:
        """Monitor active connections and connection limits."""
        try:
            with conn.cursor() as cursor:
                # Get connection count and limits
                cursor.execute(
                    """
                    SELECT
                        count(*) as active_connections,
                        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
                        count(*) FILTER (WHERE state = 'active') as active_queries,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections,
                        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                """
                )

                stats = cursor.fetchone()

                connection_percent = (stats["active_connections"] / stats["max_connections"]) * 100

                metrics = {
                    "active_connections": stats["active_connections"],
                    "max_connections": stats["max_connections"],
                    "connection_usage_percent": round(connection_percent, 1),
                    "active_queries": stats["active_queries"],
                    "idle_connections": stats["idle_connections"],
                    "idle_in_transaction": stats["idle_in_transaction"],
                }

                if connection_percent > self.THRESHOLDS["max_connections_percent"]:
                    self.alerts.append(f"HIGH: Connection usage at {connection_percent:.1f}% ({stats['active_connections']}/{stats['max_connections']})")
                elif connection_percent > 60:
                    self.warnings.append(f"Connection usage at {connection_percent:.1f}% - monitor closely")

                return metrics

        except Exception as e:
            self.alerts.append(f"ERROR: Failed to check connection stats: {e}")
            return {}

    def check_performance_indexes(self, conn) -> dict:
        """Verify performance indexes exist and are being used."""
        try:
            with conn.cursor() as cursor:
                # Check existence of critical performance indexes
                performance_indexes = [
                    "idx_animals_homepage_optimized",
                    "idx_organizations_active_country",
                    "idx_animals_location_composite",
                    "idx_animals_size_breed_status",
                    "idx_animals_analytics_covering",
                    "idx_animals_search_enhanced",
                ]

                cursor.execute(
                    """
                    SELECT indexname, tablename, idx_scan, idx_tup_read, idx_tup_fetch
                    FROM pg_stat_user_indexes
                    WHERE schemaname = 'public'
                      AND indexname = ANY(%s)
                """,
                    (performance_indexes,),
                )

                index_stats = {row["indexname"]: dict(row) for row in cursor.fetchall()}

                missing_indexes = []
                unused_indexes = []

                for index_name in performance_indexes:
                    if index_name not in index_stats:
                        missing_indexes.append(index_name)
                    elif index_stats[index_name]["idx_scan"] == 0:
                        unused_indexes.append(index_name)

                metrics = {
                    "performance_indexes_found": len(index_stats),
                    "performance_indexes_expected": len(performance_indexes),
                    "missing_indexes": missing_indexes,
                    "unused_indexes": unused_indexes,
                    "index_usage_stats": index_stats,
                }

                if missing_indexes:
                    self.alerts.append(f"CRITICAL: Missing performance indexes: {missing_indexes}")

                if unused_indexes:
                    self.warnings.append(f"Performance indexes not being used: {unused_indexes}")

                return metrics

        except Exception as e:
            self.alerts.append(f"ERROR: Failed to check performance indexes: {e}")
            return {}

    def check_query_performance(self, conn) -> dict:
        """Test performance of key queries."""
        try:
            with conn.cursor() as cursor:
                # Test homepage query performance
                start_time = datetime.now()
                cursor.execute(
                    """
                    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                    SELECT a.*, o.name as org_name
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE a.status = 'available'
                      AND o.active = true
                    ORDER BY a.availability_confidence, a.created_at DESC
                    LIMIT 50
                """
                )

                query_plan = cursor.fetchone()[0][0]
                homepage_time = (datetime.now() - start_time).total_seconds() * 1000

                # Test search query performance
                start_time = datetime.now()
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM animals
                    WHERE status = 'available'
                      AND to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(breed, ''))
                          @@ plainto_tsquery('english', 'golden retriever')
                """
                )

                search_count = cursor.fetchone()[0]
                search_time = (datetime.now() - start_time).total_seconds() * 1000

                metrics = {
                    "homepage_query_time_ms": round(homepage_time, 2),
                    "search_query_time_ms": round(search_time, 2),
                    "homepage_query_plan": query_plan,
                    "search_results_found": search_count,
                }

                if homepage_time > 200:
                    self.alerts.append(f"SLOW: Homepage query took {homepage_time:.1f}ms (>200ms)")
                elif homepage_time > 100:
                    self.warnings.append(f"Homepage query took {homepage_time:.1f}ms (>100ms)")

                if search_time > self.THRESHOLDS["slow_query_ms"]:
                    self.alerts.append(f"SLOW: Search query took {search_time:.1f}ms (>1000ms)")

                return metrics

        except Exception as e:
            self.alerts.append(f"ERROR: Failed to check query performance: {e}")
            return {}

    def check_data_health(self, conn) -> dict:
        """Check data integrity and business metrics."""
        try:
            with conn.cursor() as cursor:
                # Basic data counts
                cursor.execute(
                    """
                    SELECT
                        COUNT(*) as total_animals,
                        COUNT(*) FILTER (WHERE status = 'available') as available_animals,
                        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as animals_added_today,
                        COUNT(DISTINCT organization_id) as active_organizations,
                        MAX(created_at) as latest_animal_added
                    FROM animals
                """
                )

                data_stats = cursor.fetchone()

                # Recent scraping activity
                cursor.execute(
                    """
                    SELECT
                        COUNT(*) as scrapes_last_24h,
                        COUNT(*) FILTER (WHERE status = 'completed') as successful_scrapes,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed_scrapes,
                        MAX(started_at) as last_scrape_time
                    FROM scrape_logs
                    WHERE started_at > NOW() - INTERVAL '24 hours'
                """
                )

                scrape_stats = cursor.fetchone()

                metrics = {
                    "total_animals": data_stats["total_animals"],
                    "available_animals": data_stats["available_animals"],
                    "animals_added_today": data_stats["animals_added_today"],
                    "active_organizations": data_stats["active_organizations"],
                    "latest_animal_added": data_stats["latest_animal_added"],
                    "scrapes_last_24h": scrape_stats["scrapes_last_24h"],
                    "successful_scrapes": scrape_stats["successful_scrapes"],
                    "failed_scrapes": scrape_stats["failed_scrapes"],
                    "last_scrape_time": scrape_stats["last_scrape_time"],
                }

                # Check for data issues
                if data_stats["available_animals"] < self.THRESHOLDS["available_animals_min"]:
                    self.alerts.append(f"LOW: Only {data_stats['available_animals']} available animals (<{self.THRESHOLDS['available_animals_min']})")

                # Check scraping health
                if scrape_stats["last_scrape_time"]:
                    hours_since_scrape = (datetime.now() - scrape_stats["last_scrape_time"]).total_seconds() / 3600
                    if hours_since_scrape > self.THRESHOLDS["scrape_failure_hours"]:
                        self.alerts.append(f"STALE: Last scrape was {hours_since_scrape:.1f} hours ago (>{self.THRESHOLDS['scrape_failure_hours']} hours)")

                if scrape_stats["scrapes_last_24h"] > 0:
                    failure_rate = (scrape_stats["failed_scrapes"] / scrape_stats["scrapes_last_24h"]) * 100
                    if failure_rate > 50:
                        self.alerts.append(f"HIGH: Scrape failure rate is {failure_rate:.1f}%")
                    elif failure_rate > 25:
                        self.warnings.append(f"Scrape failure rate is {failure_rate:.1f}%")

                return metrics

        except Exception as e:
            self.alerts.append(f"ERROR: Failed to check data health: {e}")
            return {}

    def check_database_size(self, conn) -> dict:
        """Monitor database size and growth trends."""
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        pg_size_pretty(pg_database_size(current_database())) as database_size,
                        pg_database_size(current_database()) as database_size_bytes,
                        pg_size_pretty(pg_total_relation_size('animals')) as animals_table_size,
                        pg_total_relation_size('animals') as animals_table_bytes,
                        pg_size_pretty(pg_total_relation_size('scrape_logs')) as logs_table_size
                """
                )

                size_stats = cursor.fetchone()

                # Calculate growth rate if we have historical data
                cursor.execute(
                    """
                    SELECT COUNT(*) as animals_last_week
                    FROM animals
                    WHERE created_at <= NOW() - INTERVAL '7 days'
                """
                )

                animals_last_week = cursor.fetchone()["animals_last_week"]

                cursor.execute("SELECT COUNT(*) as total_animals FROM animals")
                total_animals = cursor.fetchone()["total_animals"]

                weekly_growth = total_animals - animals_last_week

                metrics = {
                    "database_size": size_stats["database_size"],
                    "database_size_bytes": size_stats["database_size_bytes"],
                    "animals_table_size": size_stats["animals_table_size"],
                    "animals_table_bytes": size_stats["animals_table_bytes"],
                    "logs_table_size": size_stats["logs_table_size"],
                    "weekly_animal_growth": weekly_growth,
                    "total_animals": total_animals,
                }

                # Size-based warnings (assuming production starts getting large at 1GB)
                size_gb = size_stats["database_size_bytes"] / (1024**3)
                if size_gb > 5:  # 5GB threshold
                    self.warnings.append(f"Database size is {size_stats['database_size']} - plan capacity")

                return metrics

        except Exception as e:
            self.alerts.append(f"ERROR: Failed to check database size: {e}")
            return {}

    def send_alert_email(self, subject: str, body: str):
        """Send alert email if configured."""
        if not self.alert_email:
            return

        try:
            msg = MIMEText(body)
            msg["Subject"] = f"[DB Alert] {subject}"
            msg["From"] = "db-monitor@rescuedogs.app"
            msg["To"] = self.alert_email

            # Note: This is a basic example - configure your SMTP server
            # server = smtplib.SMTP('localhost')
            # server.send_message(msg)
            # server.quit()

            print(f"Would send alert email to {self.alert_email}: {subject}")

        except Exception as e:
            print(f"Failed to send alert email: {e}")

    def run_health_check(self, verbose: bool = False) -> dict:
        """Run complete database health check."""
        start_time = datetime.now()

        try:
            conn = self.connect()

            # Run all health checks
            checks = {
                "connectivity": self.check_basic_connectivity(conn),
                "connections": self.check_connection_stats(conn),
                "indexes": self.check_performance_indexes(conn),
                "performance": self.check_query_performance(conn),
                "data_health": self.check_data_health(conn),
                "database_size": self.check_database_size(conn),
            }

            conn.close()

            # Compile results
            check_duration = (datetime.now() - start_time).total_seconds()

            results = {
                "timestamp": datetime.now().isoformat(),
                "check_duration_seconds": round(check_duration, 2),
                "overall_status": "CRITICAL" if self.alerts else ("WARNING" if self.warnings else "OK"),
                "alerts": self.alerts,
                "warnings": self.warnings,
                "metrics": checks,
            }

            # Send alerts if configured
            if self.alerts and self.alert_email:
                alert_body = f"""
Database Health Check Alert

Status: CRITICAL
Time: {datetime.now()}
Duration: {check_duration:.2s} seconds

ALERTS:
{chr(10).join(f"- {alert}" for alert in self.alerts)}

WARNINGS:
{chr(10).join(f"- {warning}" for warning in self.warnings)}

Full report available in monitoring logs.
"""
                self.send_alert_email("Database Health Check Failed", alert_body)

            return results

        except Exception as e:
            self.alerts.append(f"CRITICAL: Health check failed: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "CRITICAL",
                "alerts": self.alerts,
                "error": str(e),
            }


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description="Database Health Check")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--alert-email", help="Email address for critical alerts")

    args = parser.parse_args()

    # Run health check
    checker = DatabaseHealthChecker(alert_email=args.alert_email)
    results = checker.run_health_check(verbose=args.verbose)

    # Output results
    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        print(f"Database Health Check - {results['overall_status']}")
        print(f"Timestamp: {results['timestamp']}")
        print(f"Check Duration: {results.get('check_duration_seconds', 'N/A')}s")

        if results["alerts"]:
            print(f"\n🚨 ALERTS ({len(results['alerts'])}):")
            for alert in results["alerts"]:
                print(f"  - {alert}")

        if results["warnings"]:
            print(f"\n⚠️  WARNINGS ({len(results['warnings'])}):")
            for warning in results["warnings"]:
                print(f"  - {warning}")

        if args.verbose and "metrics" in results:
            print("\n📊 METRICS:")
            for check_name, metrics in results["metrics"].items():
                print(f"\n  {check_name.upper()}:")
                for key, value in metrics.items():
                    if key not in [
                        "homepage_query_plan",
                        "index_usage_stats",
                    ]:  # Skip verbose data
                        print(f"    {key}: {value}")

    # Exit with appropriate code
    if results["overall_status"] == "CRITICAL":
        sys.exit(2)
    elif results["overall_status"] == "WARNING":
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
