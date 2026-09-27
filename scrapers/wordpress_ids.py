"""WordPress post IDs for dog pages (#570).

A dog's name and URL slug can change, and two dogs can share a name; the post
ID WordPress gives the page never changes. Listing pages show only the link,
so the IDs come from the site's REST API in one request per run, and each
detail page carries its own ID in the <body> class to check against.
"""

import re
from collections.abc import Callable, Iterable
from urllib.parse import unquote, urlparse

from bs4 import BeautifulSoup

# postid-232 on a post (Santer Paws' dog pages), page-id-36251 on a page (Bosnia's)
_BODY_ID = re.compile(r"(?:postid|page-id)-(\d+)")


def url_key(url: str) -> str:
    """A page's identity in its URL: the path, without host, case or trailing slash.

    Spaces become hyphens, as WordPress resolves them: Bosnia links to
    "/Mery Joy/", whose page is "/mery-joy/".
    """
    return re.sub(r"\s+", "-", unquote(urlparse(url).path).strip().rstrip("/").lower())


def body_post_id(soup: BeautifulSoup) -> int | None:
    """The post or page ID WordPress puts in <body class>, or None."""
    body = soup.find("body")
    for css_class in (body.get("class") or []) if body else []:
        match = _BODY_ID.fullmatch(css_class)
        if match:
            return int(match.group(1))
    return None


def post_ids(get_json: Callable[[dict], tuple[list[dict], int]], params: dict, pages: bool = True) -> dict[str, int]:
    """URL key -> post ID for every item the REST route returns.

    get_json(params) returns one page of items (each with "id" and "link")
    and the total page count. A failed request raises; nothing is guessed.
    """
    ids: dict[str, int] = {}
    page = 1
    while True:
        items, total_pages = get_json({**params, "page": page, "per_page": 100, "_fields": "id,link"})
        ids.update({url_key(item["link"]): item["id"] for item in items})
        if not pages or page >= total_pages:
            return ids
        page += 1


def slugs(urls: Iterable[str]) -> list[str]:
    """The last path segment of each URL, for a REST ?slug= query."""
    return sorted({url_key(url).split("/")[-1] for url in urls})
