#!/usr/bin/env python3
"""
Monitoring and alerting system for LLM dog profiler.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Comprehensive monitoring
"""

import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg2
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class DogProfilerMonitor:
    """Monitor LLM dog profiler performance and quality."""

    def __init__(
        self,
        alert_threshold_success_rate: float = 0.90,
        alert_threshold_quality: float = 0.75,
        alert_threshold_cost_per_dog: float = 0.005,
        alert_threshold_processing_time: float = 15000,  # 15 seconds
    ):
        """
        Initialize monitor with alert thresholds.

        Args:
            alert_threshold_success_rate: Minimum acceptable success rate
            alert_threshold_quality: Minimum acceptable quality score
            alert_threshold_cost_per_dog: Maximum cost per dog in USD
            alert_threshold_processing_time: Maximum processing time in ms
        """
        self.alert_threshold_success_rate = alert_threshold_success_rate
        self.alert_threshold_quality = alert_threshold_quality
        self.alert_threshold_cost_per_dog = alert_threshold_cost_per_dog
        self.alert_threshold_processing_time = alert_threshold_processing_time

        self.alerts = []
        self.metrics = {}

    def get_recent_runs(self, hours: int = 24, organization_id: int | None = None) -> list[dict[str, Any]]:
        """
        Get recent profiler runs from database.

        Args:
            hours: How many hours back to look
            organization_id: Filter by organization

        Returns:
            List of recent runs with metrics
        """
        conn = psycopg2.connect(
            host="localhost",
            database="rescue_dogs",
            user=os.environ.get("USER"),
            password="",
        )
        cursor = conn.cursor()

        query = """
            SELECT 
                organization_id,
                COUNT(*) as total_dogs,
                COUNT(dog_profiler_data) as profiled,
                AVG((dog_profiler_data->>'processing_time_ms')::int) as avg_time_ms,
                AVG((dog_profiler_data->'confidence_scores'->>'description')::float) as avg_confidence,
                MIN(dog_profiler_data->>'profiled_at') as first_profile,
                MAX(dog_profiler_data->>'profiled_at') as last_profile
            FROM animals
            WHERE dog_profiler_data IS NOT NULL
            AND dog_profiler_data->>'profiled_at' > %s
        """

        params = [(datetime.now() - timedelta(hours=hours)).isoformat()]

        if organization_id:
            query += " AND organization_id = %s"
            params.append(organization_id)

        query += " GROUP BY organization_id"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        runs = []
        for row in rows:
            runs.append(
                {
                    "organization_id": row[0],
                    "total_dogs": row[1],
                    "profiled": row[2],
                    "avg_time_ms": row[3],
                    "avg_confidence": row[4],
                    "first_profile": row[5],
                    "last_profile": row[6],
                    "success_rate": row[2] / row[1] if row[1] > 0 else 0,
                }
            )

        cursor.close()
        conn.close()

        return runs

    def get_quality_distribution(self, organization_id: int | None = None) -> dict[str, int]:
        """
        Get distribution of quality scores.

        Args:
            organization_id: Filter by organization

        Returns:
            Distribution of quality scores
        """
        conn = psycopg2.connect(
            host="localhost",
            database="rescue_dogs",
            user=os.environ.get("USER"),
            password="",
        )
        cursor = conn.cursor()

        # Get all quality scores
        query = """
            SELECT 
                (dog_profiler_data->'confidence_scores'->>'description')::float as score
            FROM animals
            WHERE dog_profiler_data IS NOT NULL
        """

        if organization_id:
            query += " AND organization_id = %s"
            cursor.execute(query, (organization_id,))
        else:
            cursor.execute(query)

        rows = cursor.fetchall()
        scores = [row[0] for row in rows if row[0] is not None]

        cursor.close()
        conn.close()

        # Calculate distribution
        distribution = {
            "excellent (>0.9)": sum(1 for s in scores if s > 0.9),
            "good (0.8-0.9)": sum(1 for s in scores if 0.8 <= s <= 0.9),
            "fair (0.7-0.8)": sum(1 for s in scores if 0.7 <= s < 0.8),
            "poor (<0.7)": sum(1 for s in scores if s < 0.7),
        }

        return distribution

    def get_model_usage_stats(self) -> dict[str, Any]:
        """
        Get statistics about model usage.

        Returns:
            Model usage statistics
        """
        conn = psycopg2.connect(
            host="localhost",
            database="rescue_dogs",
            user=os.environ.get("USER"),
            password="",
        )
        cursor = conn.cursor()

        # Get model usage counts
        cursor.execute(
            """
            SELECT 
                dog_profiler_data->>'model_used' as model,
                COUNT(*) as count,
                AVG((dog_profiler_data->>'processing_time_ms')::int) as avg_time
            FROM animals
            WHERE dog_profiler_data IS NOT NULL
            GROUP BY dog_profiler_data->>'model_used'
        """
        )

        rows = cursor.fetchall()

        model_stats = {}
        for row in rows:
            model_name = row[0] or "unknown"
            model_stats[model_name] = {
                "count": row[1],
                "avg_time_ms": row[2],
                "percentage": 0,
            }  # Will calculate below

        # Calculate percentages
        total = sum(stats["count"] for stats in model_stats.values())
        for model, stats in model_stats.items():
            stats["percentage"] = (stats["count"] / total * 100) if total > 0 else 0

        cursor.close()
        conn.close()

        return model_stats

    def check_alerts(self, batch_stats: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """
        Check for alert conditions.

        Args:
            batch_stats: Optional stats from recent batch run

        Returns:
            List of alerts triggered
        """
        alerts = []

        if batch_stats:
            # Check success rate
            if batch_stats.get("success_rate", 1.0) < self.alert_threshold_success_rate:
                alerts.append(
                    {
                        "level": "error",
                        "metric": "success_rate",
                        "value": batch_stats["success_rate"],
                        "threshold": self.alert_threshold_success_rate,
                        "message": f"Success rate {batch_stats['success_rate']:.1%} below threshold {self.alert_threshold_success_rate:.1%}",
                    }
                )

            # Check quality scores
            if batch_stats.get("avg_quality", 1.0) < self.alert_threshold_quality:
                alerts.append(
                    {
                        "level": "warning",
                        "metric": "quality_score",
                        "value": batch_stats["avg_quality"],
                        "threshold": self.alert_threshold_quality,
                        "message": f"Average quality {batch_stats['avg_quality']:.2f} below threshold {self.alert_threshold_quality:.2f}",
                    }
                )

            # Check processing time
            if batch_stats.get("avg_time_ms", 0) > self.alert_threshold_processing_time:
                alerts.append(
                    {
                        "level": "warning",
                        "metric": "processing_time",
                        "value": batch_stats["avg_time_ms"],
                        "threshold": self.alert_threshold_processing_time,
                        "message": f"Average processing time {batch_stats['avg_time_ms']:.0f}ms exceeds threshold {self.alert_threshold_processing_time:.0f}ms",
                    }
                )

        # Check recent runs for patterns
        recent_runs = self.get_recent_runs(hours=24)

        if recent_runs:
            # Check for declining success rates
            success_rates = [run["success_rate"] for run in recent_runs]
            if len(success_rates) > 1 and success_rates[-1] < success_rates[0] * 0.9:
                alerts.append(
                    {
                        "level": "warning",
                        "metric": "success_rate_trend",
                        "message": "Success rate declining over past 24 hours",
                    }
                )

        self.alerts = alerts
        return alerts

    def generate_report(self, hours: int = 24, organization_id: int | None = None) -> dict[str, Any]:
        """
        Generate comprehensive monitoring report.

        Args:
            hours: Time period for report
            organization_id: Filter by organization

        Returns:
            Monitoring report
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "period_hours": hours,
            "organization_id": organization_id,
        }

        # Get recent runs
        recent_runs = self.get_recent_runs(hours, organization_id)
        report["recent_runs"] = recent_runs

        # Calculate aggregates
        if recent_runs:
            report["summary"] = {
                "total_organizations": len(recent_runs),
                "total_dogs_profiled": sum(run["profiled"] for run in recent_runs),
                "average_success_rate": sum(run["success_rate"] for run in recent_runs) / len(recent_runs),
                "average_processing_time_ms": sum(run["avg_time_ms"] for run in recent_runs if run["avg_time_ms"]) / len([r for r in recent_runs if r["avg_time_ms"]]),
            }

        # Get quality distribution
        report["quality_distribution"] = self.get_quality_distribution(organization_id)

        # Get model usage
        report["model_usage"] = self.get_model_usage_stats()

        # Check alerts
        report["alerts"] = self.check_alerts()

        # Estimate costs
        if report.get("summary"):
            # Assuming Gemini 2.5 Flash at $0.0015 per dog
            report["estimated_cost"] = {
                "total_usd": report["summary"]["total_dogs_profiled"] * 0.0015,
                "per_dog_usd": 0.0015,
            }

        return report

    def save_report(self, report: dict[str, Any], output_dir: Path | None = None) -> Path:
        """
        Save monitoring report to file.

        Args:
            report: Report to save
            output_dir: Output directory

        Returns:
            Path to saved report
        """
        output_dir = output_dir or Path("services/llm/monitoring_reports")
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"monitoring_report_{timestamp}.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)

        return output_file

    def print_report(self, report: dict[str, Any]):
        """
        Print formatted monitoring report.

        Args:
            report: Report to print
        """
        print(f"\n{'=' * 80}")
        print("DOG PROFILER MONITORING REPORT")
        print(f"{'=' * 80}")
        print(f"Generated: {report['timestamp']}")
        print(f"Period: Last {report['period_hours']} hours")

        if report.get("organization_id"):
            print(f"Organization: {report['organization_id']}")

        # Summary
        if report.get("summary"):
            print("\nSUMMARY:")
            print(f"  Organizations processed: {report['summary']['total_organizations']}")
            print(f"  Dogs profiled: {report['summary']['total_dogs_profiled']}")
            print(f"  Average success rate: {report['summary']['average_success_rate']:.1%}")
            print(f"  Average processing time: {report['summary']['average_processing_time_ms']:.0f}ms")

        # Quality distribution
        if report.get("quality_distribution"):
            print("\nQUALITY DISTRIBUTION:")
            total = sum(report["quality_distribution"].values())
            for level, count in report["quality_distribution"].items():
                pct = (count / total * 100) if total > 0 else 0
                print(f"  {level}: {count} ({pct:.1f}%)")

        # Model usage
        if report.get("model_usage"):
            print("\nMODEL USAGE:")
            for model, stats in report["model_usage"].items():
                print(f"  {model}:")
                print(f"    Count: {stats['count']} ({stats['percentage']:.1f}%)")
                print(f"    Avg time: {stats['avg_time_ms']:.0f}ms")

        # Costs
        if report.get("estimated_cost"):
            print("\nESTIMATED COSTS:")
            print(f"  Total: ${report['estimated_cost']['total_usd']:.2f}")
            print(f"  Per dog: ${report['estimated_cost']['per_dog_usd']:.4f}")

        # Alerts
        if report.get("alerts"):
            print("\n⚠️  ALERTS:")
            for alert in report["alerts"]:
                icon = "🔴" if alert["level"] == "error" else "🟡"
                print(f"  {icon} {alert['message']}")
        else:
            print("\n✅ No alerts - all metrics within thresholds")


def main():
    """Run monitoring report."""
    import argparse

    parser = argparse.ArgumentParser(description="Monitor dog profiler performance")
    parser.add_argument("--hours", type=int, default=24, help="Hours to look back")
    parser.add_argument("--org-id", type=int, help="Filter by organization")
    parser.add_argument("--save", action="store_true", help="Save report to file")

    args = parser.parse_args()

    monitor = DogProfilerMonitor()
    report = monitor.generate_report(hours=args.hours, organization_id=args.org_id)

    monitor.print_report(report)

    if args.save:
        output_file = monitor.save_report(report)
        print(f"\n✅ Report saved to {output_file}")


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    main()
