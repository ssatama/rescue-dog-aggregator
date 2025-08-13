"""
Monitoring and health check endpoints for production safety.

Provides visibility into scraper performance, failure detection, and system health.
"""

import logging
import time
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import verify_admin_key
from api.dependencies import get_database_connection
from api.exceptions import APIException, handle_database_error
from api.models.requests import MonitoringFilterRequest
from config import DB_CONFIG

router = APIRouter()
logger = logging.getLogger(__name__)


class HealthStatus(BaseModel):
    """Health check response model."""

    status: str  # healthy, degraded, unhealthy
    timestamp: datetime
    version: str
    database: Dict[str, Any]
    components: Optional[Dict[str, Any]] = None


class ScraperStatus(BaseModel):
    """Individual scraper status model."""

    organization_id: int
    organization_name: str
    last_scrape: Optional[datetime]
    status: str  # success, warning, error, never_run
    animals_found: Optional[int]
    failure_detection: Dict[str, Any]
    performance_metrics: Dict[str, Any]


class FailureSummary(BaseModel):
    """Failure detection summary model."""

    catastrophic_failures_24h: int
    partial_failures_24h: int
    database_errors_24h: int
    total_scrapes_24h: int
    failure_rate: float


@router.get("/health", response_model=HealthStatus)
async def health_check(db_conn=Depends(get_database_connection)):
    """
    Basic health check endpoint for load balancers and monitoring systems.

    Returns overall system health including database connectivity.
    """
    try:
        # Test database connection
        db_start = time.time()
        cursor = db_conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        db_response_time = (time.time() - db_start) * 1000  # Convert to milliseconds

        db_status = {
            "status": "connected",
            "response_time_ms": round(db_response_time, 2),
        }

        # Determine overall health
        overall_status = "healthy"
        if db_response_time > 1000:  # More than 1 second
            overall_status = "degraded"

    except psycopg2.Error as db_err:
        logger.error(f"Health check database error: {db_err}")
        db_status = {"status": "error", "error": str(db_err), "response_time_ms": None}
        overall_status = "unhealthy"
    except Exception as e:
        logger.error(f"Health check unexpected error: {e}")
        db_status = {"status": "error", "error": str(e), "response_time_ms": None}
        overall_status = "unhealthy"

    return HealthStatus(
        status=overall_status,
        timestamp=datetime.now(),
        version="1.0.0",  # This could be read from a config file
        database=db_status,
    )


@router.get("/monitoring/scrapers", dependencies=[Depends(verify_admin_key)])
async def get_scraper_status(filters: MonitoringFilterRequest = Depends(), db_conn=Depends(get_database_connection)):
    """
    Get comprehensive status of all scrapers including recent performance.

    Returns per-organization scraper status and overall summary metrics.
    """
    try:
        cursor = db_conn.cursor()

        # Get all organizations with optional filtering
        query = """
            SELECT id, name, created_at
            FROM organizations
        """
        params = []

        if filters.organization_id:
            query += " WHERE id = %s"
            params.append(filters.organization_id)

        query += " ORDER BY name"

        cursor.execute(query, params)
        organizations = cursor.fetchall()

        scrapers = []
        total_scrapes_24h = 0
        total_failures_24h = 0

        for org_id, org_name, org_created in organizations:
            # Get latest scrape log for this organization
            cursor.execute(
                """
                SELECT
                    started_at, completed_at, status, dogs_found,
                    error_message, duration_seconds, data_quality_score
                FROM scrape_logs
                WHERE organization_id = %s
                ORDER BY started_at DESC
                LIMIT 1
            """,
                (org_id,),
            )

            latest_scrape = cursor.fetchone()

            # Get metrics for this organization within the time range
            time_cutoff = datetime.now() - timedelta(hours=filters.time_range_hours)
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_scrapes,
                    COUNT(*) FILTER (WHERE status IN ('error', 'warning')) as failed_scrapes,
                    AVG(dogs_found) as avg_animals,
                    AVG(duration_seconds) as avg_duration,
                    AVG(data_quality_score) as avg_quality
                FROM scrape_logs
                WHERE organization_id = %s
                AND started_at >= %s
            """,
                (org_id, time_cutoff),
            )

            metrics_result = cursor.fetchone()
            scrapes_in_range, failed_in_range, avg_animals, avg_duration, avg_quality = metrics_result or (
                0,
                0,
                0,
                0,
                0,
            )

            total_scrapes_24h += scrapes_in_range or 0
            total_failures_24h += failed_in_range or 0

            # Determine status
            if not latest_scrape:
                status = "never_run"
                animals_found = None
                last_scrape = None
            else:
                last_scrape = latest_scrape[0]  # started_at
                animals_found = latest_scrape[3]  # dogs_found
                scrape_status = latest_scrape[2]  # status

                # Map scrape status to monitoring status
                if scrape_status == "success":
                    status = "success"
                elif scrape_status == "warning":
                    status = "warning"
                else:
                    status = "error"

            # Apply status filter if specified
            if filters.status_filter and status != filters.status_filter:
                continue

            # Build failure detection info
            failure_detection = {
                "last_failure_type": None,
                "consecutive_failures": 0,
                "threshold_info": {
                    "absolute_minimum": 3,  # Default, could be configurable
                    "percentage_threshold": 0.5,
                },
            }

            if latest_scrape and latest_scrape[2] in ["error", "warning"]:
                # Get recent failure pattern
                cursor.execute(
                    """
                    SELECT status, error_message
                    FROM scrape_logs
                    WHERE organization_id = %s
                    AND status IN ('error', 'warning')
                    ORDER BY started_at DESC
                    LIMIT 5
                """,
                    (org_id,),
                )

                recent_failures = cursor.fetchall()
                if recent_failures:
                    failure_detection["last_failure_type"] = recent_failures[0][1]  # error_message
                    failure_detection["consecutive_failures"] = len(recent_failures)

            # Build performance metrics
            performance_metrics = {
                f"scrapes_{filters.time_range_hours}h": scrapes_in_range or 0,
                "success_rate": (1 - (failed_in_range or 0) / max(scrapes_in_range or 1, 1)) * 100,
                "avg_animals_found": round(avg_animals or 0, 1),
                "avg_duration_seconds": round(avg_duration or 0, 1),
                "avg_data_quality": round(avg_quality or 0, 3),
            }

            scrapers.append(
                {
                    "organization_id": org_id,
                    "organization_name": org_name,
                    "last_scrape": last_scrape,
                    "status": status,
                    "animals_found": animals_found,
                    "failure_detection": failure_detection,
                    "performance_metrics": performance_metrics,
                }
            )

        # Calculate summary
        summary = {
            "total_organizations": len(organizations),
            "last_24h_scrapes": total_scrapes_24h,
            "failure_rate": (total_failures_24h / max(total_scrapes_24h, 1)) * 100,
            "active_scrapers": len([s for s in scrapers if s["status"] != "never_run"]),
            "healthy_scrapers": len([s for s in scrapers if s["status"] == "success"]),
            "unhealthy_scrapers": len([s for s in scrapers if s["status"] in ["error", "warning"]]),
        }

        cursor.close()

        return {
            "scrapers": scrapers,
            "summary": summary,
            "generated_at": datetime.now(),
        }

    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_scraper_status")
    except Exception as e:
        logger.error(f"Error getting scraper status: {e}")
        raise APIException(status_code=500, detail="Failed to fetch scraper status", error_code="INTERNAL_ERROR")


@router.get("/monitoring/scrapers/{organization_id}", dependencies=[Depends(verify_admin_key)])
async def get_individual_scraper_details(organization_id: int, db_conn=Depends(get_database_connection)):
    """
    Get detailed information about a specific scraper.

    Returns comprehensive metrics, recent scrapes, and failure analysis.
    """
    try:
        cursor = db_conn.cursor()

        # Get organization info
        cursor.execute(
            """
            SELECT name, created_at
            FROM organizations
            WHERE id = %s
        """,
            (organization_id,),
        )

        org_info = cursor.fetchone()
        if not org_info:
            raise HTTPException(status_code=404, detail="Organization not found")

        org_name, org_created = org_info

        # Get recent scrapes (last 10)
        cursor.execute(
            """
            SELECT
                started_at, completed_at, status, dogs_found, dogs_added, dogs_updated,
                error_message, duration_seconds, data_quality_score, detailed_metrics
            FROM scrape_logs
            WHERE organization_id = %s
            ORDER BY started_at DESC
            LIMIT 10
        """,
            (organization_id,),
        )

        recent_scrapes = []
        for scrape in cursor.fetchall():
            recent_scrapes.append(
                {
                    "started_at": scrape[0],
                    "completed_at": scrape[1],
                    "status": scrape[2],
                    "animals_found": scrape[3],
                    "animals_added": scrape[4],
                    "animals_updated": scrape[5],
                    "error_message": scrape[6],
                    "duration_seconds": scrape[7],
                    "data_quality_score": scrape[8],
                    "detailed_metrics": scrape[9],
                }
            )

        # Get performance metrics (last 30 days)
        cursor.execute(
            """
            SELECT
                COUNT(*) as total_scrapes,
                COUNT(*) FILTER (WHERE status = 'success') as successful_scrapes,
                AVG(dogs_found) as avg_animals,
                AVG(duration_seconds) as avg_duration,
                AVG(data_quality_score) as avg_quality,
                MIN(dogs_found) as min_animals,
                MAX(dogs_found) as max_animals
            FROM scrape_logs
            WHERE organization_id = %s
            AND started_at >= %s
        """,
            (organization_id, datetime.now() - timedelta(days=30)),
        )

        perf_data = cursor.fetchone()
        performance_metrics = {
            "total_scrapes_30d": perf_data[0] or 0,
            "success_rate": ((perf_data[1] or 0) / max(perf_data[0] or 1, 1)) * 100,
            "avg_animals_found": round(perf_data[2] or 0, 1),
            "avg_duration_seconds": round(perf_data[3] or 0, 1),
            "avg_data_quality": round(perf_data[4] or 0, 3),
            "min_animals_found": perf_data[5] or 0,
            "max_animals_found": perf_data[6] or 0,
        }

        # Analyze failure patterns
        cursor.execute(
            """
            SELECT status, error_message, COUNT(*) as count
            FROM scrape_logs
            WHERE organization_id = %s
            AND status IN ('error', 'warning')
            AND started_at >= %s
            GROUP BY status, error_message
            ORDER BY count DESC
        """,
            (organization_id, datetime.now() - timedelta(days=30)),
        )

        failure_patterns = []
        for pattern in cursor.fetchall():
            failure_patterns.append(
                {
                    "status": pattern[0],
                    "error_message": pattern[1],
                    "occurrence_count": pattern[2],
                }
            )

        cursor.close()

        return {
            "organization_id": organization_id,
            "organization_name": org_name,
            "recent_scrapes": recent_scrapes,
            "performance_metrics": performance_metrics,
            "failure_analysis": {"failure_patterns": failure_patterns},
            "generated_at": datetime.now(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scraper details for org {organization_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monitoring/failures", dependencies=[Depends(verify_admin_key)])
async def get_failure_detection_metrics(db_conn=Depends(get_database_connection)):
    """
    Get failure detection metrics and recent failure analysis.

    Returns categorized failure counts and threshold information.
    """
    try:
        cursor = db_conn.cursor()

        # Get failure counts by type (last 24 hours)
        try:
            twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
            logger.debug(f"Querying failures since: {twenty_four_hours_ago}")

            cursor.execute(
                """
                SELECT
                    SUM(CASE WHEN error_message LIKE %s THEN 1 ELSE 0 END) as catastrophic_failures,
                    SUM(CASE WHEN error_message LIKE %s THEN 1 ELSE 0 END) as partial_failures,
                    SUM(CASE WHEN (error_message LIKE %s OR error_message LIKE %s) THEN 1 ELSE 0 END) as database_errors,
                    COUNT(*) as total_failures
                FROM scrape_logs
                WHERE status IN ('error', 'warning')
                AND started_at >= %s
            """,
                (
                    "%catastrophic failure%",
                    "%partial failure%",
                    "%database%",
                    "%connection%",
                    twenty_four_hours_ago,
                ),
            )
        except Exception as query_error:
            logger.error(f"SQL query error: {query_error}")
            raise

        failure_counts = cursor.fetchone()
        logger.debug(f"Failure counts query result: {failure_counts}, type: {type(failure_counts)}")

        if failure_counts and len(failure_counts) >= 4:
            catastrophic, partial, database_errors, total_failures = failure_counts
            # Handle NULL values from SUM operations
            catastrophic = catastrophic or 0
            partial = partial or 0
            database_errors = database_errors or 0
            total_failures = total_failures or 0
        else:
            logger.warning(f"Unexpected failure_counts result: {failure_counts}")
            catastrophic, partial, database_errors, total_failures = 0, 0, 0, 0

        # Get total scrapes for failure rate calculation
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM scrape_logs
            WHERE started_at >= %s
        """,
            (twenty_four_hours_ago,),
        )

        total_scrapes_result = cursor.fetchone()
        total_scrapes = (total_scrapes_result[0] if total_scrapes_result else 0) or 0

        failure_summary = {
            "catastrophic_failures_24h": catastrophic or 0,
            "partial_failures_24h": partial or 0,
            "database_errors_24h": database_errors or 0,
            "total_scrapes_24h": total_scrapes,
            "failure_rate": (total_failures / max(total_scrapes, 1)) * 100,
        }

        # Get recent failures with context
        cursor.execute(
            """
            SELECT
                sl.started_at, o.name, sl.status, sl.dogs_found,
                sl.error_message, sl.detailed_metrics
            FROM scrape_logs sl
            JOIN organizations o ON sl.organization_id = o.id
            WHERE sl.status IN ('error', 'warning')
            AND sl.started_at >= %s
            ORDER BY sl.started_at DESC
            LIMIT 20
        """,
            (twenty_four_hours_ago,),
        )

        recent_failures = []
        for failure in cursor.fetchall():
            try:
                failure_type = "unknown"
                error_message = failure[4] if len(failure) > 4 else None
                if error_message:
                    if "catastrophic failure" in error_message.lower():
                        failure_type = "catastrophic"
                    elif "partial failure" in error_message.lower():
                        failure_type = "partial"
                    elif "database" in error_message.lower():
                        failure_type = "database"
                    else:
                        failure_type = "other"

                recent_failures.append(
                    {
                        "timestamp": failure[0] if len(failure) > 0 else None,
                        "organization_name": (failure[1] if len(failure) > 1 else "Unknown"),
                        "status": failure[2] if len(failure) > 2 else "unknown",
                        "animals_found": failure[3] if len(failure) > 3 else None,
                        "failure_type": failure_type,
                        "error_message": error_message,
                        "threshold_info": {
                            "default_absolute_minimum": 3,
                            "default_percentage_threshold": 0.5,
                        },
                    }
                )
            except IndexError as e:
                logger.warning(f"Incomplete failure record: {failure}, error: {e}")
                continue

        # Current thresholds configuration
        thresholds = {
            "default_absolute_minimum": 3,
            "default_percentage_threshold": 0.5,
            "minimum_historical_scrapes": 3,
            "alert_after_consecutive_failures": 2,
        }

        cursor.close()

        return {
            "failure_summary": failure_summary,
            "recent_failures": recent_failures,
            "thresholds": thresholds,
            "generated_at": datetime.now(),
        }

    except Exception as e:
        logger.error(f"Error getting failure metrics: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monitoring/performance", dependencies=[Depends(verify_admin_key)])
async def get_performance_metrics(db_conn=Depends(get_database_connection)):
    """
    Get system and scraper performance metrics.

    Returns timing, quality, and resource utilization metrics.
    """
    try:
        cursor = db_conn.cursor()

        # Get scraper performance metrics (last 7 days)
        cursor.execute(
            """
            SELECT
                AVG(duration_seconds) as avg_duration,
                AVG(data_quality_score) as avg_quality,
                COUNT(*) FILTER (WHERE status = 'success') as successful,
                COUNT(*) as total,
                SUM(dogs_found) as total_animals,
                AVG(dogs_found) as avg_animals_per_scrape
            FROM scrape_logs
            WHERE started_at >= %s
        """,
            (datetime.now() - timedelta(days=7),),
        )

        scraper_data = cursor.fetchone()
        successful, total = (scraper_data[2] or 0), (scraper_data[3] or 0)

        scraper_performance = {
            "average_duration_seconds": round(scraper_data[0] or 0, 2),
            "average_data_quality_score": round(scraper_data[1] or 0, 3),
            "success_rate": (successful / max(total, 1)) * 100,
            "total_animals_7d": scraper_data[4] or 0,
            "avg_animals_per_scrape": round(scraper_data[5] or 0, 1),
            "animals_per_hour": round((scraper_data[4] or 0) / (7 * 24), 1),  # Animals per hour over 7 days
        }

        # Get database connection pool info (basic version)
        cursor.execute(
            """
            SELECT
                state,
                COUNT(*) as count
            FROM pg_stat_activity
            WHERE datname = %s
            GROUP BY state
        """,
            (DB_CONFIG["database"],),
        )

        db_connections = {}
        for state, count in cursor.fetchall():
            db_connections[state or "unknown"] = count

        # Get currently running scrapers (approximation)
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM scrape_logs
            WHERE status = 'running'
            AND started_at >= %s
        """,
            (datetime.now() - timedelta(hours=2),),
        )  # Running for less than 2 hours

        active_scrapers = cursor.fetchone()[0] or 0

        system_performance = {
            "database_connection_pool": db_connections,
            "active_scrapers": active_scrapers,
            "memory_usage": None,  # Could be implemented with psutil
            "disk_usage": None,  # Could be implemented with psutil
        }

        cursor.close()

        return {
            "scraper_performance": scraper_performance,
            "system_performance": system_performance,
            "generated_at": datetime.now(),
        }

    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/database/pool")
async def get_pool_health():
    """
    Get database connection pool health status.

    Returns detailed pool status including initialization state,
    connection counts, and any errors.
    """
    from api.database import get_connection_pool

    try:
        pool = get_connection_pool()
        pool_status = pool.get_pool_status()

        # Determine health level
        if pool_status.get("status") == "active":
            health = "healthy"
        elif pool_status.get("status") == "not_initialized":
            if pool_status.get("initialization_error"):
                health = "unhealthy"
            else:
                health = "initializing"
        else:
            health = "degraded"

        return {"status": health, "pool": pool_status, "timestamp": datetime.now()}
    except Exception as e:
        logger.error(f"Error checking pool health: {e}")
        return {"status": "error", "pool": {"status": "error", "error": str(e)}, "timestamp": datetime.now()}


@router.get("/monitoring/alerts/config", dependencies=[Depends(verify_admin_key)])
async def get_alerting_configuration():
    """
    Get current alerting configuration and thresholds.

    Returns the configuration used for failure detection and alerting.
    """
    # This would typically come from a configuration system
    # For now, return the default configuration

    config = {
        "failure_thresholds": {
            "catastrophic_absolute_minimum": 3,
            "partial_failure_percentage": 0.5,
            "minimum_historical_scrapes": 3,
            "alert_after_consecutive_failures": 2,
            "database_timeout_seconds": 30,
        },
        "notification_settings": {
            "email_enabled": False,  # Would be configurable
            "slack_enabled": False,  # Would be configurable
            "webhook_enabled": False,  # Would be configurable
            "alert_frequency_minutes": 60,  # Minimum time between alerts
        },
        "monitoring_intervals": {
            "health_check_seconds": 30,
            "scraper_status_minutes": 5,
            "performance_metrics_minutes": 15,
        },
    }

    return config


@router.get("/monitoring/alerts/active", dependencies=[Depends(verify_admin_key)])
async def get_active_alerts(db_conn=Depends(get_database_connection)):
    """
    Get currently active alerts and alert summary.

    Returns alerts that require attention and summary by severity.
    """
    try:
        cursor = db_conn.cursor()

        active_alerts = []

        # Check for organizations with consecutive failures
        cursor.execute(
            """
            WITH recent_failures AS (
                SELECT
                    organization_id,
                    COUNT(*) as consecutive_failures,
                    MAX(started_at) as last_failure
                FROM scrape_logs
                WHERE status IN ('error', 'warning')
                AND started_at >= %s
                GROUP BY organization_id
                HAVING COUNT(*) >= 2
            )
            SELECT
                rf.organization_id, o.name, rf.consecutive_failures, rf.last_failure
            FROM recent_failures rf
            JOIN organizations o ON rf.organization_id = o.id
        """,
            (datetime.now() - timedelta(hours=6),),
        )

        for org_id, org_name, failures, last_failure in cursor.fetchall():
            severity = "critical" if failures >= 3 else "warning"
            active_alerts.append(
                {
                    "id": f"consecutive_failures_{org_id}",
                    "severity": severity,
                    "type": "consecutive_failures",
                    "organization_id": org_id,
                    "organization_name": org_name,
                    "message": f"{org_name} has {failures} consecutive failures",
                    "last_occurrence": last_failure,
                    "metadata": {"failure_count": failures},
                }
            )

        # Check for organizations with no recent scrapes
        cursor.execute(
            """
            SELECT o.id, o.name, MAX(sl.started_at) as last_scrape
            FROM organizations o
            LEFT JOIN scrape_logs sl ON o.id = sl.organization_id
            GROUP BY o.id, o.name
            HAVING MAX(sl.started_at) < %s OR MAX(sl.started_at) IS NULL
        """,
            (datetime.now() - timedelta(hours=48),),
        )

        for org_id, org_name, last_scrape in cursor.fetchall():
            active_alerts.append(
                {
                    "id": f"no_recent_scrapes_{org_id}",
                    "severity": "warning",
                    "type": "no_recent_scrapes",
                    "organization_id": org_id,
                    "organization_name": org_name,
                    "message": f"{org_name} has not been scraped recently",
                    "last_occurrence": last_scrape,
                    "metadata": {"hours_since_last_scrape": (48 if not last_scrape else int((datetime.now() - last_scrape).total_seconds() / 3600))},
                }
            )

        # Calculate alert summary
        summary = {"critical": 0, "warning": 0, "info": 0}
        for alert in active_alerts:
            summary[alert["severity"]] += 1

        cursor.close()

        return {
            "active_alerts": active_alerts,
            "alert_summary": summary,
            "total_alerts": len(active_alerts),
            "generated_at": datetime.now(),
        }

    except Exception as e:
        logger.error(f"Error getting active alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
