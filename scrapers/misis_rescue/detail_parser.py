"""Detail page parser for MisisRescue dog pages.

A dog is a Wix blog post. Everything about the dog is in the post body
(`[data-hook="post-description"]`), in three parts:

1. the story, in paragraphs ("One day she just appeared out of nowhere…"),
2. the facts, under a heading "Things you should know about X" (also "have to
   know"), as list items or ✔️-prefixed paragraphs,
3. the adoption boilerplate, from "How do you adopt X?" on.

Nothing outside the post body is read: the site menu used to be taken for the
facts when the heading wasn't found (#562). A page without a post body is not a
dog page.
"""

import re
from datetime import date
from typing import Any

from bs4 import BeautifulSoup, Tag

from utils.birth_dates import parse_birth_date

from .normalizer import extract_age_from_text_legacy as extract_age_from_text
from .normalizer import extract_breed, extract_sex, normalize_name, normalize_size
from .normalizer import extract_breed_from_text_legacy as extract_breed_from_text
from .normalizer import extract_sex_from_text_legacy as extract_sex_from_text
from .normalizer import extract_weight_kg_legacy as extract_weight_kg

POST_BODY = '[data-hook="post-description"]'
POST_TITLE = '[data-hook="post-title"]'
# Photo galleries sit inside the post body; their cells are list items too
GALLERY = '[data-hook="native-gallery-renderer"]'
BLOCKS = ["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"]

FACTS_HEADING = re.compile(r"things\s+you\s+(?:should|have\s+to|need\s+to|must)?\s*know", re.IGNORECASE)
ADOPTION_HEADING = re.compile(r"^how\s+(?:do|can)\s+(?:you|i)\s+adopt", re.IGNORECASE)
# ✔️, 💕, 🏡 and the like in front of a fact
LEADING_SYMBOLS = re.compile(r"^[^\w(\"'“]+")

# "born" alone is left out: "her puppies were born in March" is not her birth date
DOB_LABEL = re.compile(r"\b(dob|date of birth|birthday)\b", re.IGNORECASE)


def dob_bullet(bullets: list[str], today: date | None = None) -> str | None:
    """The date of birth as written, from its label on ("DOB -April /May 2024"), or None.

    Only the text after the label is kept, so a date before it can't be taken for the birth date.
    """
    for bullet in bullets:
        label = DOB_LABEL.search(bullet)
        if label and parse_birth_date(bullet[label.start() :], today):
            return bullet[label.start() :]
    return None


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def post_blocks(body: Tag) -> list[tuple[str, str]]:
    """The post body's text blocks in order, as (tag, text), without galleries.

    A paragraph inside a list item is read as part of the item.
    """
    blocks = []
    for element in body.find_all(BLOCKS):
        if element.find_parent("li") or element.find_parent(attrs={"data-hook": "native-gallery-renderer"}):
            continue
        text = _clean(element.get_text(" "))
        if text:
            blocks.append((element.name, text))
    return blocks


def split_post(blocks: list[tuple[str, str]]) -> tuple[list[str], list[str]]:
    """(story paragraphs, facts) from the post's blocks, dropping the adoption boilerplate."""
    end = next((i for i, (_, text) in enumerate(blocks) if ADOPTION_HEADING.match(text)), len(blocks))
    blocks = blocks[:end]

    heading = next((i for i, (_, text) in enumerate(blocks) if FACTS_HEADING.search(text) and len(text) < 80), None)
    if heading is not None:
        story = [text for _, text in blocks[:heading]]
        facts = [text for _, text in blocks[heading + 1 :]]
    else:
        # No facts heading: the list items are the facts, the paragraphs the story
        story = [text for tag, text in blocks if tag == "p"]
        facts = [text for tag, text in blocks if tag == "li"]

    facts = [LEADING_SYMBOLS.sub("", fact).strip() for fact in facts]
    return story, [fact for fact in facts if fact]


class MisisRescueDetailParser:
    """Parser for MisisRescue dog detail pages."""

    def parse_detail_page(self, soup: BeautifulSoup) -> dict[str, Any] | None:
        """The dog on a post page, or None when the page has no post body (an error page)."""
        body = soup.select_one(POST_BODY)
        if body is None:
            return None

        story, facts = split_post(post_blocks(body))
        name = self._extract_dog_name(soup)

        result: dict[str, Any] = {
            "bullet_points": facts,
            "name": normalize_name(name) if name else None,
            "breed": None,
            "sex": None,
            "size": None,
            "age_text": None,
            "properties": {
                "raw_bullet_points": facts,
                "raw_page_title": soup.find("title").get_text(strip=True) if soup.find("title") else None,
                "raw_name": name,
            },
        }
        # The story; a post without one describes the dog in its facts
        description = "\n\n".join(story) or "\n".join(facts)
        if description:
            result["properties"]["description"] = description

        facts_text = " ".join(facts)
        post_text = " ".join([*story, *facts])

        # A published date of birth is the age: the save turns it into a birth
        # range that keeps up with time (#561)
        if dob := dob_bullet(facts):
            result["date_of_birth"] = dob
            result["age_text"] = dob
        elif (years := extract_age_from_text(facts_text)) is not None:
            result["age_text"] = f"{int(years * 12)} months" if years < 1 else f"{years:g} years"

        result["breed"] = extract_breed(facts) or extract_breed_from_text(post_text)
        result["sex"] = extract_sex(facts) or extract_sex_from_text(post_text)

        for fact in facts:
            weight_kg = extract_weight_kg(fact)
            if weight_kg:
                result["properties"]["weight"] = f"{weight_kg}kg"
                size = normalize_size(f"{weight_kg}kg")
                if size:
                    result["size"] = size
                    result["properties"]["standardized_size"] = size
                break

        # Unified standardization reads "age", not "age_text"
        if result["age_text"]:
            result["age"] = result["age_text"]
        return result

    def _extract_dog_name(self, soup: BeautifulSoup) -> str | None:
        """The post title ("⭐💜Tea💜⭐"); normalize_name strips the decoration."""
        title = soup.select_one(POST_TITLE) or soup.find("h1")
        if title and title.get_text(strip=True):
            return _clean(title.get_text())
        return None
