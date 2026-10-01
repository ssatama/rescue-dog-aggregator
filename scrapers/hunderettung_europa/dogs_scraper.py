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
# A post page carries every dog's whole rendered page: 100 of them were 3.6 MB
PER_PAGE = 25
# ~150 dogs fill six pages; more than this means the paging is broken
MAX_PAGES = 40

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
FOSTER_PREFIX = re.compile(r"^Pflegeh(?:und|ündin)\s+", re.IGNORECASE)
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
        """Every item of a REST route, all pages, asked for in id order.

        Posts honour the order; the site's categories don't, which is why
        _categories never pages. The total must stay the same on every page
        and the distinct items read must add up to it: otherwise pages shifted
        while being read (a dog added or removed mid-run) and one could be
        missed.
        """
        items: list[dict] = []
        totals: set[int] = set()
        page = 1
        while True:
            response = self.get_listing_page(
                f"{self.base_url}/wp-json/wp/v2/{route}",
                params={**params, "orderby": "id", "order": "asc", "per_page": PER_PAGE, "page": page},
                headers=HEADERS,
            )
            batch = response.json()
            stated = response.headers.get("X-WP-TotalPages")
            if stated is None:
                # Without it, a short read can't be told from the end (a page past it is a 400)
                raise ListingIncompleteError(f"{route} page {page} has no X-WP-TotalPages header")
            total_pages = int(stated)
            if not batch and page <= total_pages:
                raise ListingIncompleteError(f"{route} page {page} of {total_pages} is empty")
            items += batch
            totals.add(int(response.headers.get("X-WP-Total", -1)))
            if page >= total_pages:
                unique = len({item["id"] for item in items})
                if len(totals) > 1 or unique not in totals:
                    raise ListingIncompleteError(f"{route}: read {unique} distinct items, the site said {sorted(totals)}")
                return items
            if page == MAX_PAGES:
                raise ListingIncompleteError(f"{route} still has pages after {MAX_PAGES}")
            page += 1

    def _categories(self) -> dict[str, Any]:
        """The category IDs the scraper reads, looked up by slug in one request.

        Nothing here is paged: the site orders its category listing its own way
        (orderby is ignored) and ties made pages overlap and skip the root
        (2026-10-01). Slugs are unique, each one's parent is checked, and the
        listing asks WordPress for the child categories (federal states,
        adopted subcategories) instead of walking the tree.
        """
        wanted = (DOG_ROOT, "aufenthaltsort", "rumaenien", "deutschland", ADOPTED, "groesse", "geschlecht", *SIZES, *SEXES)
        found = {category["slug"]: category for category in self._get_all("categories", {"slug": ",".join(wanted), "_fields": "id,slug,parent"})}

        def under(parent: int | None, slug: str) -> int | None:
            category = found.get(slug)
            return category["id"] if category and parent is not None and category["parent"] == parent else None

        def required(parent: int | None, slug: str) -> int:
            category = under(parent, slug)
            if category is None:
                raise ListingIncompleteError(f"No category {slug!r} under category {parent}: the site's dog categories changed")
            return category

        def fallback(parent_slug: str, values: dict[str, str]) -> dict[int, str]:
            """A tree that only stands in for the page's text: one missing doesn't stop the run."""
            parent = under(root, parent_slug)
            ids = {under(parent, slug): value for slug, value in values.items()}
            if None in ids:
                self.logger.warning(f"Category tree {parent_slug!r} changed; its categories no longer stand in for missing facts")
            return {category: value for category, value in ids.items() if category is not None}

        root = required(0, DOG_ROOT)
        location = required(root, "aufenthaltsort")
        return {
            "romania": required(location, "rumaenien"),
            "germany": required(location, "deutschland"),
            "adopted": required(0, ADOPTED),
            "sizes": fallback("groesse", SIZES),
            "sexes": fallback("geschlecht", SEXES),
        }

    def _posts(self, categories: dict[str, Any]) -> list[dict]:
        """The posts in Romania, Germany or a German federal state, without adopted dogs."""
        posts = self._get_all(
            "posts",
            {
                "categories[terms]": f"{categories['romania']},{categories['germany']}",
                "categories[include_children]": "true",
                # Happy-Ends Hunde and its subcategories
                "categories_exclude[terms]": categories["adopted"],
                "categories_exclude[include_children]": "true",
                "_fields": "id,link,title,content,categories",
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
        stated_birth = facts.get("Geschätztes Alter")
        if stated_birth and not parse_birth_date(stated_birth):
            self.logger.warning(f"{post['link']}: no birth date in {stated_birth!r}; saved without an age")
        title = BeautifulSoup(post["title"]["rendered"], "html.parser").get_text().strip()
        name = FOSTER_PREFIX.sub("", title)
        sex = (facts.get("Geschlecht") or "").lower()
        properties = {
            **facts,
            "description": "\n".join(story) or None,
            "location": self._location(in_categories, facts, categories),
            "language": "de",
            # The validator's name cleaner keeps this when it changes a name; the foster prefix goes here
            **({"raw_name": title} if name != title else {}),
        }
        return {
            "external_id": f"hre-{post['id']}",
            "name": name,
            "adoption_url": post["link"],
            "primary_image_url": photos[0] if photos else None,
            "original_image_url": photos[0] if photos else None,
            "image_urls": gallery_urls(photos[0] if photos else None, photos[1:]),
            "animal_type": "dog",
            "status": "available",
            "sex": {"männlich": "Male", "weiblich": "Female"}.get(sex) or self._one_of(in_categories, categories["sexes"]),
            "size": size_from_height(_fact(facts, HEIGHT_LABEL)) or self._one_of(in_categories, categories["sizes"]),
            "age_text": birth_text(stated_birth),
            # The rescue's own words: the age parser also reads "Oktober/November 2025" or "2015/2016"
            "date_of_birth": stated_birth,
            "properties": properties,
        }

    @staticmethod
    def _one_of(in_categories: set[int], values: dict[int, str]) -> str | None:
        """The value of the post's one category among these; None for none or two."""
        found = {value for category, value in values.items() if category in in_categories}
        return found.pop() if len(found) == 1 else None

    @staticmethod
    def _location(in_categories: set[int], facts: dict[str, str], categories: dict[str, Any]) -> str:
        """ "Viersen, Germany" for a dog in a foster home, "Romania" for one in the shelter.

        The listing holds only dogs filed under Rumänien or the Deutschland tree.
        The foster town wins: a dog that moved may keep its Rumänien category.
        """
        town = POSTCODE.sub("", _fact(facts, FOSTER_LABEL) or "").strip()
        if town:
            return f"{town}, Germany"
        return "Romania" if categories["romania"] in in_categories else "Germany"
