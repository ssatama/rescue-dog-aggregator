"""Hunderettung Europa e.V.: dogs from the site's WordPress REST API (#689).

Every dog is a WordPress post filed under a location category: Rumänien (the
partner shelter) or Deutschland and its federal states (foster homes), all
under "---Hundekategorien---". Adopted dogs move to "Happy-Ends Hunde" and cats
have their own tree. The REST listing returns each post's rendered page, so
the listing is the whole scrape: no dog page is fetched.

Pages are built in Elementor from an editors' template. Template parts nobody
filled in ("HUNDENAME", "ca. xx – xx cm", stock photos named template-*) stay
in the post, hidden on desktop (on all devices but two posts on 2026-10-01,
which show them on phones). Everything hidden on desktop is dropped before
the page is read; nothing is shown only on desktop.
"""

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from scrapers.base_scraper import BaseScraper, ListingIncompleteError
from utils.birth_dates import parse_birth_date
from utils.dog_size import size_from_height_cm
from utils.shared_extraction_patterns import gallery_urls

# Not the default python-requests User-Agent (#571)
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}
PER_PAGE = 100
# ~150 dogs fill two pages; more than this means the paging is broken
MAX_PAGES = 10

# Category slugs: looked up by name, so renumbered IDs can't empty the listing
DOG_ROOT = "hundekategorien"
ADOPTED = "happy-ends-hunde"
SEXES = {"maennlich": "Male", "weiblich": "Female"}
SIZES = {"klein": "Small", "mittel": "Medium", "gross": "Large"}

# A fact line at the top of the page: "Geschlecht: Weiblich"
FACT_LINE = re.compile(r"([^:]{3,40}?)\s*:\s*(.+)")
FOSTER_LABEL = re.compile(r"pflegestelle in", re.IGNORECASE)
HEIGHT_LABEL = re.compile(r"schulterhöhe", re.IGNORECASE)
# "Lerne hier Saskia direkt im Video kennen!": a link to the page's own video
VIDEO_LINE = re.compile(r"^Lerne\b.*\bkennen!?$")
# Stock media from the editors' template, under /2023/11/
TEMPLATE_MEDIA = re.compile(r"/template-[^/]*$")
FOSTER_PREFIX = re.compile(r"^Pflegehund\s+", re.IGNORECASE)
POSTCODE = re.compile(r"^\d{5}\s+")


def _lines(element: Tag) -> list[str]:
    """The element's text, one line per paragraph, heading or <br>, as the page spaces it.

    Inline links stay inside their sentence ("Lerne <a>hier</a> Saskia").
    """
    for br in element.find_all("br"):
        br.replace_with("\n")
    for block in element.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"]):
        block.append("\n")
    return [line for raw in element.get_text().split("\n") if (line := " ".join(raw.split()))]


def _facts(lines: list[str]) -> dict[str, str]:
    """The "Label: value" lines of a text block."""
    return {match.group(1): match.group(2) for line in lines if (match := FACT_LINE.fullmatch(line))}


def _fact(facts: dict[str, str], label: re.Pattern) -> str | None:
    return next((value for key, value in facts.items() if label.search(key)), None)


def size_from_height(text: str | None) -> str | None:
    """The size a shoulder height gives ("ca. 50 – 59 cm" is Medium).

    A range counts only when both ends are the same size: a puppy's "ca. 20 –
    59 cm" says the rescue doesn't know yet.
    """
    heights = [int(number) for number in re.findall(r"\d+", text or "")[:2]]
    sizes = {size_from_height_cm(height) for height in heights}
    return sizes.pop() if len(sizes) == 1 else None


def birth_text(value: str | None) -> str | None:
    """ "geb. ca. Februar 2026" as "02/2026", "geb. ca. 2016" as "2016": the forms the age parser reads as a birth date."""
    born = parse_birth_date(value)
    if not born:
        return None
    earliest, latest = born
    if (earliest.year, earliest.month) == (latest.year, latest.month):
        return f"{earliest:%m/%Y}"
    if earliest.year == latest.year and (earliest.month, latest.month) == (1, 12):
        return str(earliest.year)
    return None


class HunderettungEuropaScraper(BaseScraper):
    """Hunderettung Europa e.V., Duisburg: dogs in its Romanian partner shelter and German foster homes."""

    def __init__(self, config_id: str = "hunderettung-europa", **kwargs):
        super().__init__(config_id=config_id, **kwargs)
        self.base_url = "https://hunderettung-europa.de"
        self.listing_url = f"{self.base_url}/wp-json/wp/v2/posts"

    def collect_data(self) -> list[dict[str, Any]]:
        """Every listed dog, read from its post.

        A listing that fails or lists no dogs raises ListingIncompleteError, so
        stale detection doesn't retire every dog. A post that can't be read
        skips one dog and is counted as a failed detail page.
        """
        categories = self._categories()
        posts = {f"hre-{post['id']}": post for post in self._posts(categories)}
        listed = [{"external_id": external_id, "adoption_url": post["link"]} for external_id, post in posts.items()]

        if self.skip_existing_animals:
            listed = self.filtering_service.filter_existing_animals(listed)
        else:
            # Every listed dog is found, even one whose post can't be read (#558)
            self._record_all_found_external_ids(listed)

        dogs = []
        self._detail_attempted += len(listed)
        for item in listed:
            try:
                dogs.append(self._dog(posts[item["external_id"]], categories))
            except Exception as e:
                self._detail_failed(item["adoption_url"], e)
        return dogs

    def _get_all(self, route: str, params: dict) -> list[dict]:
        """Every item of a REST route, all pages."""
        items: list[dict] = []
        page = 1
        while True:
            response = self.get_listing_page(f"{self.base_url}/wp-json/wp/v2/{route}", params={**params, "per_page": PER_PAGE, "page": page}, headers=HEADERS)
            batch = response.json()
            stated = response.headers.get("X-WP-TotalPages")
            if stated is None:
                # Without it, a short read can't be told from the end (a page past it is a 400)
                raise ListingIncompleteError(f"{route} page {page} has no X-WP-TotalPages header")
            total_pages = int(stated)
            if not batch and page <= total_pages:
                raise ListingIncompleteError(f"{route} page {page} of {total_pages} is empty")
            items += batch
            if page >= total_pages:
                return items
            if page == MAX_PAGES:
                raise ListingIncompleteError(f"{route} still has pages after {MAX_PAGES}")
            page += 1

    def _categories(self) -> dict[str, Any]:
        """The category IDs the scraper reads, found by slug and parent."""
        everything = self._get_all("categories", {"_fields": "id,slug,parent"})
        children: dict[int, dict[str, int]] = {}
        for category in everything:
            children.setdefault(category["parent"], {})[category["slug"]] = category["id"]

        def child(parent: int, slug: str) -> int:
            if slug not in children.get(parent, {}):
                raise ListingIncompleteError(f"No category {slug!r} under category {parent}: the site's dog categories changed")
            return children[parent][slug]

        def descendants(category: int) -> set[int]:
            return {category}.union(*(descendants(sub) for sub in children.get(category, {}).values()))

        def fallback(parent_slug: str, values: dict[str, str]) -> dict[int, str]:
            """A tree that only stands in for the page's text: one missing doesn't stop the run."""
            parent = children.get(root, {}).get(parent_slug)
            found = {children.get(parent, {}).get(slug): value for slug, value in values.items()}
            if None in found or parent is None:
                self.logger.warning(f"Category tree {parent_slug!r} changed; its categories no longer stand in for missing facts")
            return {category: value for category, value in found.items() if category is not None}

        root = child(0, DOG_ROOT)
        location = child(root, "aufenthaltsort")
        return {
            "romania": child(location, "rumaenien"),
            "germany": descendants(child(location, "deutschland")),
            # WordPress excludes only the categories named, not their children
            "adopted": descendants(child(0, ADOPTED)),
            "sizes": fallback("groesse", SIZES),
            "sexes": fallback("geschlecht", SEXES),
        }

    def _posts(self, categories: dict[str, Any]) -> list[dict]:
        """The posts in Romania and every German location, without adopted dogs."""
        locations = sorted({categories["romania"], *categories["germany"]})
        posts = self._get_all(
            "posts",
            {
                "categories": ",".join(map(str, locations)),
                "categories_exclude": ",".join(map(str, sorted(categories["adopted"]))),
                "_fields": "id,link,title,content,categories",
                # Oldest first: a dog published while paging can't push another off a page
                "orderby": "id",
                "order": "asc",
            },
        )
        if not posts:
            raise ListingIncompleteError("The listing returned no dogs")
        return posts

    def _dog(self, post: dict, categories: dict[str, Any]) -> dict[str, Any]:
        soup = BeautifulSoup(post["content"]["rendered"], "html.parser")
        for hidden in soup.select(".elementor-hidden-desktop"):
            hidden.decompose()

        facts: dict[str, str] = {}
        story: list[str] = []
        photos: list[str] = []
        for widget in soup.select("[data-widget_type]"):
            kind = widget["data-widget_type"].split(".")[0]
            if kind == "button":
                # The rescue's generic adoption text follows its first button
                break
            if kind == "image":
                photos += [img["src"] for img in widget.select("img[src]") if not TEMPLATE_MEDIA.search(img["src"])]
            elif kind in ("heading", "text-editor"):
                lines = _lines(widget)
                if not facts:
                    # Above the facts is only the name; the first block with them is the facts
                    if kind == "text-editor" and len(found := _facts(lines)) >= 2:
                        facts = found
                    continue
                story += [line for line in lines if not VIDEO_LINE.match(line)]

        if not facts:
            # A layout the scraper doesn't know: counted as a failed dog, not saved half-read
            raise ValueError('no facts block ("Geschlecht: …") above the story')
        in_categories = set(post["categories"])
        born = birth_text(facts.get("Geschätztes Alter"))
        sex = (facts.get("Geschlecht") or "").lower()
        properties = {
            **facts,
            "description": "\n".join(story) or None,
            "location": self._location(in_categories, facts, categories),
            "language": "de",
        }
        return {
            "external_id": f"hre-{post['id']}",
            "name": FOSTER_PREFIX.sub("", BeautifulSoup(post["title"]["rendered"], "html.parser").get_text()).strip(),
            "adoption_url": post["link"],
            "primary_image_url": photos[0] if photos else None,
            "original_image_url": photos[0] if photos else None,
            "image_urls": gallery_urls(photos[0] if photos else None, photos[1:]),
            "animal_type": "dog",
            "status": "available",
            "sex": {"männlich": "Male", "weiblich": "Female"}.get(sex) or self._one_of(in_categories, categories["sexes"]),
            "size": size_from_height(_fact(facts, HEIGHT_LABEL)) or self._one_of(in_categories, categories["sizes"]),
            "age_text": born,
            "date_of_birth": born,
            "properties": properties,
        }

    @staticmethod
    def _one_of(in_categories: set[int], values: dict[int, str]) -> str | None:
        """The value of the post's one category among these; None for none or two."""
        found = {value for category, value in values.items() if category in in_categories}
        return found.pop() if len(found) == 1 else None

    @staticmethod
    def _location(in_categories: set[int], facts: dict[str, str], categories: dict[str, Any]) -> str | None:
        """ "Viersen, Germany" for a foster dog, "Romania" for one in the shelter."""
        if in_categories & categories["germany"]:
            town = POSTCODE.sub("", _fact(facts, FOSTER_LABEL) or "").strip()
            return f"{town}, Germany" if town else "Germany"
        if categories["romania"] in in_categories:
            return "Romania"
        return None
