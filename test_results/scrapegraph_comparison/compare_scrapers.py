#!/usr/bin/env python3
"""
Comparison tool for traditional vs ScrapegraphAI scraper results
"""

import json
import sys
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, List, Set, Tuple


class ScraperComparison:
    def __init__(self, traditional_file: str, scrapegraph_file: str):
        self.traditional_data = self.load_json(traditional_file)
        self.scrapegraph_data = self.load_json(scrapegraph_file)

    def load_json(self, filepath: str) -> dict:
        """Load JSON data from file"""
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def normalize_name(self, name: str) -> str:
        """Normalize dog names for comparison"""
        return name.lower().strip().replace(" ", "").replace("-", "")

    def similarity_ratio(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

    def find_matching_dog(self, dog: Dict, dogs_list: List[Dict]) -> Tuple[Dict, float]:
        """Find best matching dog in another list"""
        best_match = None
        best_score = 0

        dog_name_norm = self.normalize_name(dog.get("name", ""))

        for other_dog in dogs_list:
            # Name similarity
            other_name_norm = self.normalize_name(other_dog.get("name", ""))
            name_score = self.similarity_ratio(dog_name_norm, other_name_norm)

            # Exact name match
            if name_score == 1.0:
                return other_dog, 1.0

            # Consider breed and age for better matching
            breed_score = self.similarity_ratio(
                str(dog.get("breed", "")), str(other_dog.get("breed", ""))
            )

            # Combined score
            total_score = (name_score * 0.7) + (breed_score * 0.3)

            if total_score > best_score:
                best_score = total_score
                best_match = other_dog

        return best_match, best_score

    def compare_counts(self):
        """Compare basic counts between scrapers"""
        traditional_dogs = self.traditional_data.get("dogs", [])
        scrapegraph_dogs = self.scrapegraph_data.get("dogs", [])

        print("=" * 60)
        print("BASIC STATISTICS")
        print("=" * 60)
        print(f"Traditional Scraper: {len(traditional_dogs)} dogs")
        print(f"ScrapegraphAI:       {len(scrapegraph_dogs)} dogs")
        print(f"Difference:          {len(scrapegraph_dogs) - len(traditional_dogs)}")
        print()

        return len(traditional_dogs), len(scrapegraph_dogs)

    def compare_dogs(self):
        """Detailed comparison of individual dogs"""
        traditional_dogs = self.traditional_data.get("dogs", [])
        scrapegraph_dogs = self.scrapegraph_data.get("dogs", [])

        print("=" * 60)
        print("DOG-BY-DOG COMPARISON")
        print("=" * 60)

        # Track matches
        matched_dogs = []
        unmatched_traditional = []
        unmatched_scrapegraph = list(scrapegraph_dogs)

        # Find matches for each traditional dog
        for trad_dog in traditional_dogs:
            match, score = self.find_matching_dog(trad_dog, unmatched_scrapegraph)

            if match and score > 0.7:  # 70% similarity threshold
                matched_dogs.append(
                    {"traditional": trad_dog, "scrapegraph": match, "score": score}
                )
                unmatched_scrapegraph.remove(match)
            else:
                unmatched_traditional.append(trad_dog)

        # Print matched dogs
        print(f"\nMATCHED DOGS ({len(matched_dogs)}):")
        print("-" * 40)
        for match_info in matched_dogs[:5]:  # Show first 5
            trad = match_info["traditional"]
            scrap = match_info["scrapegraph"]
            score = match_info["score"]

            print(f"\n{trad.get('name')} (Match Score: {score:.2%})")
            self.compare_dog_details(trad, scrap)

        if len(matched_dogs) > 5:
            print(f"\n... and {len(matched_dogs) - 5} more matched dogs")

        # Print unmatched dogs
        if unmatched_traditional:
            print(f"\n\nDOGS ONLY IN TRADITIONAL ({len(unmatched_traditional)}):")
            print("-" * 40)
            for dog in unmatched_traditional[:5]:
                print(f"- {dog.get('name')} ({dog.get('breed', 'Unknown breed')})")
            if len(unmatched_traditional) > 5:
                print(f"... and {len(unmatched_traditional) - 5} more")

        if unmatched_scrapegraph:
            print(f"\n\nDOGS ONLY IN SCRAPEGRAPH ({len(unmatched_scrapegraph)}):")
            print("-" * 40)
            for dog in unmatched_scrapegraph[:5]:
                print(f"- {dog.get('name')} ({dog.get('breed', 'Unknown breed')})")
            if len(unmatched_scrapegraph) > 5:
                print(f"... and {len(unmatched_scrapegraph) - 5} more")

        return matched_dogs, unmatched_traditional, unmatched_scrapegraph

    def compare_dog_details(self, trad_dog: Dict, scrap_dog: Dict):
        """Compare details of two matched dogs"""
        fields_to_compare = [
            ("breed", "Breed"),
            ("age_text", "Age"),
            ("sex", "Sex"),
            ("weight", "Weight"),
            ("height", "Height"),
            ("neutered_spayed", "Neutered/Spayed"),
        ]

        differences = []
        for field, label in fields_to_compare:
            trad_val = self.get_nested_value(trad_dog, field)
            scrap_val = self.get_nested_value(scrap_dog, field)

            if str(trad_val).lower() != str(scrap_val).lower():
                differences.append(f"  {label}: '{trad_val}' vs '{scrap_val}'")

        if differences:
            print("  Differences:")
            for diff in differences:
                print(diff)
        else:
            print("  ✓ All fields match!")

    def get_nested_value(self, dog: Dict, field: str) -> str:
        """Get value from dog dict, checking properties if needed"""
        # Direct field
        if field in dog:
            return dog[field] or ""

        # Check in properties
        if "properties" in dog and isinstance(dog["properties"], dict):
            if field in dog["properties"]:
                return dog["properties"][field] or ""

            # Also check if it's a JSON string
            if isinstance(dog["properties"], str):
                try:
                    props = json.loads(dog["properties"])
                    return props.get(field, "")
                except:
                    pass

        return ""

    def analyze_data_quality(self):
        """Analyze data quality and completeness"""
        print("\n" + "=" * 60)
        print("DATA QUALITY ANALYSIS")
        print("=" * 60)

        for source, data in [
            ("Traditional", self.traditional_data),
            ("ScrapegraphAI", self.scrapegraph_data),
        ]:
            dogs = data.get("dogs", [])
            if not dogs:
                continue

            print(f"\n{source} Scraper:")
            print("-" * 30)

            # Count completeness
            field_counts = {
                "name": 0,
                "breed": 0,
                "age": 0,
                "sex": 0,
                "weight": 0,
                "height": 0,
                "description": 0,
                "image": 0,
            }

            for dog in dogs:
                if dog.get("name"):
                    field_counts["name"] += 1
                if dog.get("breed") and dog.get("breed") not in [
                    "Unknown",
                    "Mixed Breed",
                    "",
                ]:
                    field_counts["breed"] += 1
                if dog.get("age_text") and dog.get("age_text") not in ["Unknown", ""]:
                    field_counts["age"] += 1
                if dog.get("sex") and dog.get("sex") not in ["Unknown", ""]:
                    field_counts["sex"] += 1

                # Check properties
                weight = self.get_nested_value(dog, "weight")
                height = self.get_nested_value(dog, "height")
                desc = self.get_nested_value(dog, "description")

                if weight and weight.strip():
                    field_counts["weight"] += 1
                if height and height.strip():
                    field_counts["height"] += 1
                if desc and len(desc) > 10:
                    field_counts["description"] += 1
                if dog.get("primary_image_url") or dog.get("image_url"):
                    field_counts["image"] += 1

            # Print completeness percentages
            total = len(dogs)
            for field, count in field_counts.items():
                percentage = (count / total * 100) if total > 0 else 0
                print(
                    f"  {field.capitalize():<12}: {count:>3}/{total} ({percentage:>5.1f}%)"
                )

    def generate_report(self, output_file: str = None):
        """Generate a comprehensive comparison report"""
        report_lines = []
        report_lines.append("SCRAPER COMPARISON REPORT")
        report_lines.append("=" * 60)
        report_lines.append(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        report_lines.append("")

        # Basic stats
        trad_count, scrap_count = self.compare_counts()
        report_lines.append(f"Traditional Scraper: {trad_count} dogs")
        report_lines.append(f"ScrapegraphAI:       {scrap_count} dogs")
        report_lines.append("")

        # Detailed comparison
        matched, unmatched_trad, unmatched_scrap = self.compare_dogs()
        report_lines.append(f"Matched dogs: {len(matched)}")
        report_lines.append(f"Only in Traditional: {len(unmatched_trad)}")
        report_lines.append(f"Only in ScrapegraphAI: {len(unmatched_scrap)}")

        # Save report
        if output_file:
            with open(output_file, "w") as f:
                f.write("\n".join(report_lines))
            print(f"\n\nReport saved to: {output_file}")

        return report_lines


def main():
    if len(sys.argv) < 3:
        print(
            "Usage: python compare_scrapers.py <traditional_results.json> <scrapegraph_results.json>"
        )
        sys.exit(1)

    traditional_file = sys.argv[1]
    scrapegraph_file = sys.argv[2]

    # Create comparison
    comparison = ScraperComparison(traditional_file, scrapegraph_file)

    # Run all comparisons
    comparison.compare_counts()
    comparison.compare_dogs()
    comparison.analyze_data_quality()

    # Generate report
    output_file = "test_results/scrapegraph_comparison/comparison_report.txt"
    comparison.generate_report(output_file)


if __name__ == "__main__":
    main()
