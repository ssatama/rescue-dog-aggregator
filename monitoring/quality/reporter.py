# monitoring/quality/reporter.py

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

from monitoring.quality.analyzer import OrganizationQuality
from monitoring.quality.metrics import QualityAssessment


class DataQualityReporter:
    """Generates markdown reports for data quality analysis."""

    def __init__(self):
        self.reports_dir = Path(__file__).parent.parent.parent / "reports" / "data-quality"
        self.timestamp = datetime.now()
        self.date_str = self.timestamp.strftime("%Y-%m-%d")
        self.time_str = self.timestamp.strftime("%H-%M-%S")

        # Create timestamped directory
        self.report_dir = self.reports_dir / self.date_str / self.time_str
        self.report_dir.mkdir(parents=True, exist_ok=True)

        self.detailed_dir = self.report_dir / "detailed-analysis"
        self.detailed_dir.mkdir(exist_ok=True)

    def generate_overall_summary(self, org_qualities: List[OrganizationQuality]) -> str:
        """Generate overall summary report."""

        if not org_qualities:
            return self._generate_empty_summary()

        # Calculate aggregate statistics
        total_orgs = len(org_qualities)
        total_animals = sum(org.total_animals for org in org_qualities)
        avg_quality = sum(org.overall_score for org in org_qualities) / total_orgs
        orgs_at_100 = sum(1 for org in org_qualities if org.overall_score >= 100)
        orgs_below_70 = sum(1 for org in org_qualities if org.overall_score < 70)

        # Sort organizations by quality score (descending)
        sorted_orgs = sorted(org_qualities, key=lambda x: x.overall_score, reverse=True)

        report = f"""# Data Quality Report - Overall Summary
Generated: {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}

## Executive Summary
- **Total Organizations Analyzed**: {total_orgs}
- **Total Animals Analyzed**: {total_animals:,}
- **Average Quality Score**: {avg_quality:.1f}%
- **Organizations at 90%+**: {sum(1 for org in org_qualities if org.overall_score >= 90)}
- **Organizations below 70%**: {orgs_below_70}

## Quality Score Distribution

| Rank | Organization | ID | Total Animals | Quality Score | Critical Issues | Key Gaps |
|------|-------------|-----|---------------|---------------|-----------------|----------|
"""

        for i, org in enumerate(sorted_orgs, 1):
            # Get top 2 most common issues
            top_issues = list(org.common_issues.keys())[:2]
            issues_str = ", ".join(top_issues) if top_issues else "None identified"

            report += f"| {i} | {org.org_name} | {org.org_id} | {org.total_animals} | {org.overall_score:.1f}% | {org.critical_issues_count} | {issues_str} |\n"

        # Quality categories breakdown
        report += """
## Quality Categories Analysis

### Top Performing Organizations (90%+ overall)
"""
        top_orgs = [org for org in sorted_orgs if org.overall_score >= 90]
        if top_orgs:
            for org in top_orgs:
                report += f"- **{org.org_name}** ({org.overall_score:.1f}%): {org.total_animals} animals\n"
        else:
            report += "- No organizations currently at 90%+ quality level\n"

        report += """
### Organizations Needing Improvement (<70% overall)
"""
        poor_orgs = [org for org in sorted_orgs if org.overall_score < 70]
        if poor_orgs:
            for org in poor_orgs:
                top_issue = list(org.common_issues.keys())[0] if org.common_issues else "Unknown"
                report += f"- **{org.org_name}** ({org.overall_score:.1f}%): Primary issue - {top_issue}\n"
        else:
            report += "- All organizations meet minimum 70% quality threshold\n"

        # Common issues across all organizations
        all_issues = {}
        for org in org_qualities:
            for issue, count in org.common_issues.items():
                all_issues[issue] = all_issues.get(issue, 0) + count

        common_issues = sorted(all_issues.items(), key=lambda x: x[1], reverse=True)[:5]

        report += """
## Most Common Data Quality Issues

| Issue | Organizations Affected | Total Animals Affected |
|-------|------------------------|------------------------|
"""
        for issue, count in common_issues:
            orgs_affected = sum(1 for org in org_qualities if issue in org.common_issues)
            report += f"| {issue} | {orgs_affected} | {count} |\n"

        report += """
## Recommended Actions

### Immediate Priority (Critical Issues)
"""
        for org in sorted_orgs:
            if org.critical_issues_count > 0:
                report += f"- **{org.org_name}**: Fix {org.critical_issues_count} critical issues (missing required fields)\n"

        report += """
### Quality Improvement Opportunities
"""
        # Find organizations with specific improvement areas
        low_completeness = [org for org in org_qualities if org.completeness_avg < 80]
        low_standardization = [org for org in org_qualities if org.standardization_avg < 70]
        low_content = [org for org in org_qualities if org.rich_content_avg < 50]

        if low_completeness:
            report += f"- **Improve basic data completeness**: {', '.join([org.org_name for org in low_completeness])}\n"
        if low_standardization:
            report += f"- **Add data standardization**: {', '.join([org.org_name for org in low_standardization])}\n"
        if low_content:
            report += f"- **Add detailed descriptions**: {', '.join([org.org_name for org in low_content])}\n"

        report += f"""
## Reference Implementation
- **Best Practice Example**: {sorted_orgs[0].org_name} ({sorted_orgs[0].overall_score:.1f}% quality score)
- **Target Quality Score**: 90%+ for optimal user experience and SEO
- **Minimum Acceptable**: 70% for basic functionality

## Next Steps
1. Review detailed organization reports in the `detailed-analysis/` directory
2. Prioritize fixing critical issues (missing required fields)
3. Focus on top common issues identified above
4. Use highest-scoring organizations as reference implementations

---
*Report generated by Rescue Dog Aggregator Data Quality Monitor*
*For technical details, see individual organization reports*
"""

        return report

    def generate_detailed_organization_report(
        self,
        org_quality: OrganizationQuality,
        animal_details: List[Tuple[Dict[str, Any], QualityAssessment]],
    ) -> str:
        """Generate detailed report for a single organization."""

        org = org_quality

        report = f"""# Data Quality Report - {org.org_name}
Generated: {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}

## Overview
- **Organization ID**: {org.org_id}
- **Total Animals**: {org.total_animals}
- **Animals Analyzed**: {org.animals_analyzed}
- **Overall Quality Score**: {org.overall_score:.1f}%

## Quality Breakdown

### Category Scores
- **Completeness**: {org.completeness_avg:.1f}% (Basic required fields)
- **Standardization**: {org.standardization_avg:.1f}% (Normalized data)  
- **Rich Content**: {org.rich_content_avg:.1f}% (Descriptions and details)
- **Visual Appeal**: {org.visual_appeal_avg:.1f}% (Images)

### Quality Distribution
- **Animals at 90%+ quality**: {sum(1 for _, assessment in animal_details if assessment.overall_score >= 90)}
- **Animals needing improvement (<70%)**: {org.animals_below_70}
- **Critical issues needing immediate fix**: {org.critical_issues_count}

## Common Issues Analysis

| Issue | Animals Affected | Impact |
|-------|------------------|--------|
"""

        for issue, count in org.common_issues.items():
            percentage = (count / org.total_animals * 100) if org.total_animals > 0 else 0
            impact = "High" if percentage > 50 else "Medium" if percentage > 25 else "Low"
            report += f"| {issue} | {count} ({percentage:.1f}%) | {impact} |\n"

        # Quality recommendations based on scores
        report += """
## Improvement Recommendations

"""

        if org.completeness_avg < 80:
            report += f"""### Priority: Fix Basic Data Completeness ({org.completeness_avg:.1f}%)
- Ensure all animals have name and breed information
- Add missing age, sex, and size data where possible
- Review data collection processes to prevent gaps
"""

        if org.standardization_avg < 70:
            report += f"""### Priority: Add Data Standardization ({org.standardization_avg:.1f}%)
- Implement breed normalization using standardization utilities
- Add standardized size categories (Tiny, Small, Medium, Large)
- Review existing scraper implementation for standardization integration
"""

        if org.rich_content_avg < 50:
            report += f"""### Enhancement: Add Rich Content ({org.rich_content_avg:.1f}%)
- Extract and include detailed animal descriptions
- Ensure descriptions are substantive (>50 characters)
- Consider personality traits, special needs, and behavioral information
"""

        if org.visual_appeal_avg < 80:
            report += f"""### Enhancement: Improve Visual Content ({org.visual_appeal_avg:.1f}%)
- Ensure all animals have primary images
- Verify image URLs are accessible and valid
- Consider multiple images for better adoption outcomes
"""

        # Sample problematic animals
        problematic_animals = [(animal, assessment) for animal, assessment in animal_details if assessment.overall_score < 70]

        if problematic_animals:
            report += """
## Sample Issues by Animal

### Animals Needing Immediate Attention (<70% Quality)

| Animal ID | Name | Score | Primary Issues |
|-----------|------|-------|----------------|
"""

            for animal, assessment in problematic_animals[:10]:  # Show up to 10 examples
                primary_issues = []
                if assessment.critical_issues:
                    primary_issues.extend(assessment.critical_issues[:2])
                else:
                    # Get most significant issues from each category
                    if assessment.completeness.issues:
                        primary_issues.append(assessment.completeness.issues[0])
                    if assessment.standardization.issues and len(primary_issues) < 2:
                        primary_issues.append(assessment.standardization.issues[0])

                issues_str = ", ".join(primary_issues[:2]) if primary_issues else "Various minor issues"
                report += f"| {animal['id']} | {animal['name']} | {assessment.overall_score:.1f}% | {issues_str} |\n"

        # High quality examples for reference
        excellent_animals = [(animal, assessment) for animal, assessment in animal_details if assessment.overall_score >= 90]

        if excellent_animals:
            report += """
## Quality Reference Examples

### High-Quality Animals (90%+ Score) - Use as Templates

| Animal ID | Name | Score | Strong Points |
|-----------|------|-------|---------------|
"""

            for animal, assessment in excellent_animals[:5]:  # Show up to 5 examples
                strong_points = []
                if assessment.completeness.percentage >= 90:
                    strong_points.append("Complete data")
                if assessment.standardization.percentage >= 90:
                    strong_points.append("Fully standardized")
                if assessment.rich_content.percentage >= 90:
                    strong_points.append("Rich description")
                if assessment.visual_appeal.percentage >= 90:
                    strong_points.append("Good images")

                points_str = ", ".join(strong_points) if strong_points else "Well-rounded quality"
                report += f"| {animal['id']} | {animal['name']} | {assessment.overall_score:.1f}% | {points_str} |\n"

        report += """
## Data Quality Standards Reference

### Frontend Filtering Requirements
To ensure optimal user experience, animals need:
- **Breed filtering**: Both raw breed and standardized_breed populated
- **Age filtering**: Age data in months (age_min_months, age_max_months) or age_text
- **Size filtering**: Standardized size categories
- **Location filtering**: Organization location data

### SEO Optimization Requirements  
For maximum search visibility:
- **Complete metadata**: Name, breed, age, size, location all present
- **Rich descriptions**: Detailed animal descriptions for unique content
- **Image optimization**: Primary images for social media sharing
- **Structured data**: All fields properly formatted for schema markup

## Technical Implementation Notes

### Scraper Improvements Needed
"""

        if org.overall_score < 90:
            report += """- Review scraper implementation against best practices
- Compare with high-performing organizations (90%+ quality)
- Implement missing standardization utilities
- Add error handling for missing data extraction
"""
        else:
            report += """- Scraper implementation is performing well
- Minor optimizations may be possible
- Consider this as a reference implementation for other organizations
"""

        report += f"""
### Database Optimization
- Current data completeness allows for {org.completeness_avg:.0f}% of filtering functionality
- SEO optimization potential: {min(org.overall_score, 100):.0f}%
- User experience quality: {"Excellent" if org.overall_score >= 90 else "Good" if org.overall_score >= 70 else "Needs improvement"}

---
*Detailed report for {org.org_name}*
*Overall Quality: {org.overall_score:.1f}% - {"Excellent" if org.overall_score >= 90 else "Good" if org.overall_score >= 70 else "Needs Improvement"}*
"""

        return report

    def save_overall_summary(self, org_qualities: List[OrganizationQuality]) -> str:
        """Save overall summary report and return file path."""
        report_content = self.generate_overall_summary(org_qualities)
        file_path = self.report_dir / "overall-summary.md"

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)

        return str(file_path)

    def save_detailed_report(
        self,
        org_quality: OrganizationQuality,
        animal_details: List[Tuple[Dict[str, Any], QualityAssessment]],
    ) -> str:
        """Save detailed organization report and return file path."""
        report_content = self.generate_detailed_organization_report(org_quality, animal_details)

        # Create safe filename from organization name
        safe_name = "".join(c for c in org_quality.org_name if c.isalnum() or c in (" ", "-", "_")).rstrip()
        safe_name = safe_name.replace(" ", "-").lower()
        filename = f"org-{org_quality.org_id}-{safe_name}.md"

        file_path = self.detailed_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)

        return str(file_path)

    def _generate_empty_summary(self) -> str:
        """Generate report when no data is available."""
        return f"""# Data Quality Report - Overall Summary
Generated: {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}

## No Data Available

No organizations with available animals were found for analysis.

This could indicate:
- No animals currently marked as 'available' in the database
- Database connection issues
- All organizations have empty animal records

## Next Steps
1. Check database connectivity
2. Verify animal records exist with status='available'
3. Review organization configurations
4. Check scraper execution logs

---
*Report generated by Rescue Dog Aggregator Data Quality Monitor*
"""
