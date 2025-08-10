#!/usr/bin/env python3
# monitoring/data_quality_monitor.py

"""
Data Quality Monitor for Rescue Dog Aggregator

This script monitors and analyzes data quality for rescue organizations.
Supports both overall monitoring and detailed organization analysis.

Usage:
    python monitoring/data_quality_monitor.py --mode=overall
    python monitoring/data_quality_monitor.py --mode=detailed --org-id=26
    python monitoring/data_quality_monitor.py --mode=detailed --all

Key Features:
- Quality scoring based on completeness, standardization, rich content, and visual appeal
- Markdown reports with timestamps
- Both summary and detailed analysis modes
- Integration with existing database models
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from monitoring.quality.analyzer import DataQualityAnalyzer, OrganizationQuality
from monitoring.quality.metrics import DataQualityMetrics
from monitoring.quality.reporter import DataQualityReporter


def setup_logging(level: str = "INFO") -> None:
    """Setup logging configuration."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )


def print_banner():
    """Print application banner."""
    print(
        """
╔══════════════════════════════════════════════════════════════╗
║                 Rescue Dog Aggregator                        ║
║                Data Quality Monitor                          ║
║                                                              ║
║  Monitors data quality for rescue organizations              ║
║  Generates detailed analysis and improvement recommendations ║
╚══════════════════════════════════════════════════════════════╝
    """
    )


def print_quality_metrics_info():
    """Print information about quality scoring criteria."""
    print("📊 Quality Scoring Criteria:")
    print(f"   • Completeness ({DataQualityMetrics.WEIGHTS['completeness']}%): Essential fields (name, breed, age, sex, size)")
    print(f"   • Standardization ({DataQualityMetrics.WEIGHTS['standardization']}%): Normalized breed and size data")
    print(f"   • Rich Content ({DataQualityMetrics.WEIGHTS['rich_content']}%): Detailed descriptions for SEO")
    print(f"   • Visual Appeal ({DataQualityMetrics.WEIGHTS['visual_appeal']}%): Primary images available")
    print("")


def run_overall_analysis() -> None:
    """Run overall analysis for all organizations."""
    print("🔍 Running overall data quality analysis...")
    print("   Analyzing all organizations with available animals...")
    print("")

    analyzer = DataQualityAnalyzer()
    reporter = DataQualityReporter()

    # Analyze all organizations
    org_qualities = analyzer.analyze_all_organizations()

    if not org_qualities:
        print("❌ No organizations found with available animals")
        print("   Check database connectivity and verify animal records exist")
        return

    print(f"✅ Analyzed {len(org_qualities)} organizations")
    print(f"   Total animals: {sum(org.total_animals for org in org_qualities):,}")
    print("")

    # Generate and save overall summary
    summary_path = reporter.save_overall_summary(org_qualities)

    # Print summary statistics
    print("📈 Summary Statistics:")
    avg_quality = sum(org.overall_score for org in org_qualities) / len(org_qualities)
    top_org = max(org_qualities, key=lambda x: x.overall_score)
    bottom_org = min(org_qualities, key=lambda x: x.overall_score)

    print(f"   Average Quality Score: {avg_quality:.1f}%")
    print(f"   Highest Quality: {top_org.org_name} ({top_org.overall_score:.1f}%)")
    print(f"   Lowest Quality: {bottom_org.org_name} ({bottom_org.overall_score:.1f}%)")
    print(f"   Organizations ≥90%: {sum(1 for org in org_qualities if org.overall_score >= 90)}")
    print(f"   Organizations <70%: {sum(1 for org in org_qualities if org.overall_score < 70)}")
    print("")

    print(f"📄 Report saved: {summary_path}")
    print(f"   View detailed analysis at: {reporter.report_dir}")


def run_detailed_analysis(org_id: Optional[int] = None, all_orgs: bool = False) -> None:
    """Run detailed analysis for specific organization(s)."""
    analyzer = DataQualityAnalyzer()
    reporter = DataQualityReporter()

    if all_orgs:
        print("🔍 Running detailed analysis for ALL organizations...")
        print("   This will generate individual reports for each organization...")
        print("")

        # Get all organizations first
        org_qualities = analyzer.analyze_all_organizations()

        if not org_qualities:
            print("❌ No organizations found with available animals")
            return

        print(f"📊 Generating detailed reports for {len(org_qualities)} organizations:")

        for i, org_quality in enumerate(org_qualities, 1):
            print(f"   {i}/{len(org_qualities)}: Analyzing {org_quality.org_name}...")

            # Get detailed data for this organization
            _, animal_details = analyzer.analyze_single_organization(org_quality.org_id)

            # Save detailed report
            report_path = reporter.save_detailed_report(org_quality, animal_details)
            print(f"      Report saved: {Path(report_path).name}")

        # Also generate overall summary
        summary_path = reporter.save_overall_summary(org_qualities)
        print("")
        print(f"📄 Summary report: {summary_path}")

    else:
        if not org_id:
            print("❌ Organization ID required for single organization analysis")
            print("   Use --org-id=<ID> or --all for all organizations")
            return

        print(f"🔍 Running detailed analysis for organization ID {org_id}...")

        try:
            org_quality, animal_details = analyzer.analyze_single_organization(org_id)

            print(f"✅ Analyzed {org_quality.org_name}")
            print(f"   Animals analyzed: {len(animal_details)}")
            print(f"   Overall quality: {org_quality.overall_score:.1f}%")
            print("")

            # Print quick insights
            print("🎯 Quick Insights:")
            excellent_animals = sum(1 for _, assessment in animal_details if assessment.overall_score >= 90)
            poor_animals = sum(1 for _, assessment in animal_details if assessment.overall_score < 70)

            print(f"   Excellent animals (≥90%): {excellent_animals}")
            print(f"   Animals needing improvement (<70%): {poor_animals}")
            print(f"   Critical issues: {org_quality.critical_issues_count}")

            if org_quality.common_issues:
                top_issue = list(org_quality.common_issues.keys())[0]
                issue_count = org_quality.common_issues[top_issue]
                print(f"   Most common issue: {top_issue} ({issue_count} animals)")
            print("")

            # Save detailed report
            report_path = reporter.save_detailed_report(org_quality, animal_details)
            print(f"📄 Detailed report saved: {report_path}")

        except ValueError as e:
            print(f"❌ Error: {e}")
            return
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            logging.exception("Error during detailed analysis")
            return

    print(f"📁 All reports saved to: {reporter.report_dir}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Data Quality Monitor for Rescue Dog Aggregator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --mode=overall                    # Analyze all organizations
  %(prog)s --mode=detailed --org-id=26       # Detailed analysis for org 26 
  %(prog)s --mode=detailed --all             # Detailed analysis for all orgs
  %(prog)s --mode=overall --verbose          # Verbose output

Quality Metrics:
  • Completeness (40%): Essential fields present
  • Standardization (30%): Normalized data available  
  • Rich Content (20%): Descriptions for SEO
  • Visual Appeal (10%): Images for adoption success

Report Output:
  reports/data-quality/YYYY-MM-DD/HH-MM-SS/
  ├── overall-summary.md
  └── detailed-analysis/
      ├── org-26-santer-paws.md
      └── org-11-tierschutzverein.md
        """,
    )

    parser.add_argument("--mode", choices=["overall", "detailed"], required=True, help="Analysis mode: overall summary or detailed organization analysis")

    parser.add_argument("--org-id", type=int, help="Organization ID for detailed analysis (required unless --all specified)")

    parser.add_argument("--all", action="store_true", help="Run detailed analysis for all organizations")

    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    # Setup logging
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level)

    # Print banner and info
    print_banner()
    print_quality_metrics_info()

    try:
        if args.mode == "overall":
            if args.org_id or args.all:
                print("⚠️  Warning: --org-id and --all ignored in overall mode")
                print("")
            run_overall_analysis()

        elif args.mode == "detailed":
            if not args.org_id and not args.all:
                print("❌ Error: Detailed mode requires either --org-id=<ID> or --all")
                parser.print_help()
                sys.exit(1)

            if args.org_id and args.all:
                print("❌ Error: Cannot specify both --org-id and --all")
                sys.exit(1)

            run_detailed_analysis(org_id=args.org_id, all_orgs=args.all)

        print("")
        print("🎉 Data quality analysis complete!")
        print("   Use reports to guide scraper improvements and data quality initiatives")

    except KeyboardInterrupt:
        print("\n⚠️  Analysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        if args.verbose:
            logging.exception("Fatal error details")
        sys.exit(1)


if __name__ == "__main__":
    main()
