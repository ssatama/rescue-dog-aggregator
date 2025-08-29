"""Detail page parser for MisisRescue dog pages.

This module provides functionality to parse individual dog detail pages
from MisisRescue website and extract structured data using BeautifulSoup.
"""

import re
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup, Tag

from .normalizer import (
    calculate_age_years,
)
from .normalizer import extract_age_from_text_legacy as extract_age_from_text
from .normalizer import (
    extract_birth_date,
    extract_breed,
)
from .normalizer import extract_breed_from_text_legacy as extract_breed_from_text
from .normalizer import (
    extract_sex,
)
from .normalizer import extract_sex_from_text_legacy as extract_sex_from_text
from .normalizer import extract_weight_kg_legacy as extract_weight_kg
from .normalizer import (
    normalize_name,
    normalize_size,
)


class MisisRescueDetailParser:
    """Parser for MisisRescue dog detail pages."""

    def __init__(self):
        """Initialize the detail parser."""
        pass

    def parse_detail_page(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Parse a dog detail page and extract structured information.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary containing extracted dog information
        """
        result: Dict[str, Any] = {
            "bullet_points": [],
            "name": None,
            "breed": None,
            "sex": None,
            "size": None,
            "age_text": None,
            "properties": {},
        }

        # Extract dog name and normalize it with enhanced normalization
        name = self._extract_dog_name(soup)
        if name:
            result["name"] = normalize_name(name)

        # Extract bullet points from "Things you should know" section
        bullet_points = self._extract_bullet_points(soup)
        result["bullet_points"] = bullet_points

        # Save all raw extracted data in properties for debugging and future processing
        result["properties"]["raw_bullet_points"] = bullet_points
        result["properties"]["raw_page_title"] = soup.find("title").get_text(strip=True) if soup.find("title") else None
        result["properties"]["raw_name"] = name  # Store original name before normalization

        # Extract and store full page text for debugging
        page_text = soup.get_text()
        # Store a relevant excerpt (first 2000 chars) to avoid huge JSON
        result["properties"]["page_text_excerpt"] = page_text[:2000] if page_text else None

        # Use normalizer functions to extract structured data
        if bullet_points:
            # Extract age text for standardization by BaseScraper
            for bullet in bullet_points:
                birth_date = extract_birth_date(bullet)
                if birth_date:
                    age_years = calculate_age_years(birth_date)
                    if age_years:
                        # Provide age as text for BaseScraper standardization
                        if age_years < 1:
                            months = int(age_years * 12)
                            result["age_text"] = f"{months} months"
                        else:
                            result["age_text"] = f"{age_years} years"
                    break

            # Also look for direct age mentions in bullet points if no birth date found
            if not result.get("age_text"):
                # Look for age patterns like "2 years old", "6 months", etc.
                age_patterns = [
                    r"(\d+\.?\d*)\s*years?\s*old",
                    r"(\d+)\s*months?\s*old",
                    r"age:?\s*(\d+\.?\d*)\s*years?",
                    r"age:?\s*(\d+)\s*months?",
                ]

                for bullet in bullet_points:
                    bullet_lower = bullet.lower()
                    for pattern in age_patterns:
                        match = re.search(pattern, bullet_lower)
                        if match:
                            number = match.group(1)
                            if "month" in bullet_lower:
                                result["age_text"] = f"{number} months"
                            else:
                                result["age_text"] = f"{number} years"
                            break
                    if result.get("age_text"):
                        break

            # Extract breed from bullet points
            breed = extract_breed(bullet_points)
            if breed:
                result["breed"] = breed

            # Extract sex from bullet points
            sex = extract_sex(bullet_points)
            if sex:
                result["sex"] = sex

            # Extract weight and size - store weight in properties for BaseScraper standardization
            for bullet in bullet_points:
                weight_kg = extract_weight_kg(bullet)
                if weight_kg:
                    # Store weight in properties as text for BaseScraper to standardize
                    result["properties"]["weight"] = f"{weight_kg}kg"

                    # Calculate size from weight using our improved normalizer
                    # Pass the weight text, not the full bullet
                    size = normalize_size(f"{weight_kg}kg")
                    if size:
                        result["size"] = size
                        # ALSO store in properties for BaseScraper standardization to use
                        result["properties"]["standardized_size"] = size
                    break

        # Enhanced fallback extraction from page text if bullet points didn't provide data
        page_text = result["properties"].get("page_text_excerpt", "")
        if page_text:
            # Try enhanced age extraction from page text if we don't have age yet
            if not result.get("age_text"):
                page_age = extract_age_from_text(page_text)
                if page_age:
                    if page_age < 1:
                        months = int(page_age * 12)
                        result["age_text"] = f"{months} months"
                    else:
                        result["age_text"] = f"{page_age} years"

            # Try enhanced sex detection from page text if we don't have sex yet
            if not result.get("sex"):
                page_sex = extract_sex_from_text(page_text)
                if page_sex:
                    result["sex"] = page_sex

            # Try enhanced breed detection from page text if we don't have breed yet
            if not result.get("breed"):
                page_breed = extract_breed_from_text(page_text)
                if page_breed:
                    result["breed"] = page_breed

            # Try weight extraction from page text if we don't have weight yet
            if "weight" not in result["properties"]:
                page_weight = extract_weight_kg(page_text)
                if page_weight:
                    result["properties"]["weight"] = f"{page_weight}kg"
                    # Calculate size from weight
                    size = normalize_size(f"{page_weight}kg")
                    if size and not result.get("size"):
                        result["size"] = size
                        # ALSO store in properties for BaseScraper standardization to use
                        result["properties"]["standardized_size"] = size

        return result

    def _extract_dog_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract dog name from the page.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            Dog name or None if not found
        """
        # Try h1 tag first
        h1_tag = soup.find("h1")
        if h1_tag and h1_tag.get_text(strip=True):
            name = h1_tag.get_text(strip=True)
            # Clean up the name (remove extra whitespace, etc.)
            name = re.sub(r"\s+", " ", name).strip()
            return name

        # Try page title as fallback
        title_tag = soup.find("title")
        if title_tag and title_tag.get_text(strip=True):
            title = title_tag.get_text(strip=True)
            # Extract name from title (usually first part before dash or separator)
            name_match = re.search(r"^([^-]+)", title)
            if name_match:
                name = name_match.group(1).strip()
                # Skip generic titles
                if name.lower() not in ["misis", "rescue", "available", "adoption"]:
                    return name

        return None

    def _normalize_dog_name(self, name: str) -> str:
        """Legacy normalize dog name method - now delegates to enhanced normalizer.

        Args:
            name: Raw dog name from the website

        Returns:
            Normalized name (proper case, no emojis, cleaned)
        """
        # Delegate to the enhanced normalizer function
        return normalize_name(name)

    def _extract_bullet_points(self, soup: BeautifulSoup) -> List[str]:
        """Extract bullet points from the 'Things you should know' section.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            List of bullet point texts
        """
        bullet_points = []

        # Look for "Things you should know" section
        things_section = self._find_things_section(soup)

        if things_section:
            # Look for list items (li tags)
            li_tags = things_section.find_all("li")
            for li in li_tags:
                text = li.get_text(strip=True)
                if text:  # Only add non-empty bullet points
                    # Clean up excessive whitespace
                    text = re.sub(r"\s+", " ", text).strip()
                    bullet_points.append(text)

            # If no li tags found, look for p tags as alternative
            if not bullet_points:
                p_tags = things_section.find_all("p")
                for p in p_tags:
                    text = p.get_text(strip=True)
                    if text:
                        # Clean up excessive whitespace
                        text = re.sub(r"\s+", " ", text).strip()
                        bullet_points.append(text)

        return bullet_points

    def _find_things_section(self, soup: BeautifulSoup) -> Optional[Tag]:
        """Find the 'Things you should know' section in the page.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            BeautifulSoup element containing the section or None
        """
        # Look for headings that contain "Things you should know"
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])

        for heading in headings:
            heading_text = heading.get_text(strip=True).lower()
            if "things you should know" in heading_text:
                # Found the heading, now find its parent or sibling container

                # Try parent container first
                parent = heading.parent
                if parent:
                    # Look for list in parent
                    if parent.find("ul") or parent.find("ol") or parent.find_all("p"):
                        return parent

                # Try next sibling
                next_sibling = heading.find_next_sibling()
                while next_sibling:
                    if isinstance(next_sibling, Tag) and next_sibling.name in ["ul", "ol", "div"]:
                        return next_sibling
                    next_sibling = next_sibling.find_next_sibling()

                # Look for the next list element in the entire document after this heading
                # This handles complex DOM structures where the list isn't a direct sibling
                all_elements = soup.find_all()
                try:
                    heading_index = all_elements.index(heading)
                    # Search forward from the heading
                    for i in range(heading_index + 1, len(all_elements)):
                        elem = all_elements[i]
                        if isinstance(elem, Tag):
                            # Found a list - this should contain the dog info
                            if elem.name in ["ul", "ol"]:
                                return elem
                            # If we hit another major heading, stop searching
                            if elem.name in ["h1", "h2", "h3"] and "reserved" not in elem.get_text().lower():
                                break
                except (ValueError, IndexError):
                    pass

        # Fallback: look for any section with bullet-like content
        # This handles cases where the exact heading text might be different
        all_divs = soup.find_all("div")
        for div in all_divs:
            if isinstance(div, Tag) and (div.find("ul") or div.find("ol")):
                # Check if it contains dog-related content
                text = div.get_text().lower()
                if any(keyword in text for keyword in ["dob", "breed", "weighs", "mixed", "kg"]):
                    return div

        return None
