"""WordPress post IDs for dog pages (#570).

A dog's name and URL slug can change, and two dogs can share a name; the post
ID WordPress gives the page never changes. Listing pages show only the link,
so the IDs come from the site's REST API, looked up by the listed slugs. A
listed link the answer doesn't hold (a renamed page WordPress redirects, a
link spelled differently) is resolved from its page's <body class>; only a
link with no page behind it (a 404, or a file WordPress redirected it to) is
skipped.
"""

import re
from collections.abc import Callable, Iterable
from typing import Any
from urllib.parse import unquote, urlparse

import requests
from bs4 import BeautifulSoup

from scrapers.request_pacing import ListingIncompleteError

# postid-232 on a post (Santer Paws' dog pages), page-id-36251 on a page (Bosnia's)
_BODY_ID = re.compile(r"(?:postid|page-id)-(\d+)")
# Content types of a file, not a page: a listed link WordPress sent to an upload
_FILE_TYPES = ("image/", "video/", "audio/", "application/pdf")
# Slugs per REST request: keeps the query string short
SLUGS_PER_REQUEST = 50


def url_key(url: str) -> str:
    """A page's identity in its URL: the path, without host, case or trailing slash.

    Spaces become hyphens, as WordPress resolves them: Bosnia links to
    "/Mery Joy/", whose page is "/mery-joy/".
    """
    return re.sub(r"\s+", "-", unquote(urlparse(url).path).strip().rstrip("/").lower())


def slug(url: str) -> str:
    return url_key(url).split("/")[-1]


def body_post_id(soup: BeautifulSoup) -> int | None:
    """The post or page ID WordPress puts in <body class>, or None."""
    body = soup.find("body")
    for css_class in (body.get("class") or []) if body else []:
        match = _BODY_ID.fullmatch(css_class)
        if match:
            return int(match.group(1))
    return None


def fetch_posts(get_json: Callable[[dict], tuple[list[dict], int]], slugs: Iterable[str]) -> list[dict]:
    """Every post (id, link) the REST route returns for these slugs, all pages.

    get_json(params) returns one page of items and the total page count. A
    failed request raises; nothing is guessed.
    """
    wanted = sorted(set(slugs))
    posts: list[dict] = []
    for start in range(0, len(wanted), SLUGS_PER_REQUEST):
        page = 1
        while True:
            items, total_pages = get_json({"slug": ",".join(wanted[start : start + SLUGS_PER_REQUEST]), "page": page, "per_page": 100, "_fields": "id,link"})
            posts += items
            if page >= total_pages:
                break
            page += 1
    return posts


def key_on_post_ids(scraper: Any, animals: list[dict], *, route: str, url_of: Callable[[dict], str], prefix: str, headers: dict | None = None) -> list[dict]:
    """Each listed dog with external_id "{prefix}{post id}", one per page.

    The REST answer keys the listed links; a link it doesn't hold is resolved
    from its page. A link with no page behind it (a 404, or a file) is skipped
    with a warning: nothing can be counted for its dog. Any other failure
    raises ListingIncompleteError, so stale detection doesn't run.
    """
    unique: dict[str, dict] = {}
    for animal in animals:
        unique.setdefault(url_key(url_of(animal)), animal)
    if not unique:
        return []

    def get_json(params: dict) -> tuple[list[dict], int]:
        response = scraper.get_listing_page(route, params=params, headers=headers)
        return response.json(), int(response.headers.get("X-WP-TotalPages", 1))

    ids = {url_key(post["link"]): post["id"] for post in fetch_posts(get_json, (slug(key) for key in unique))}
    # Links the REST answer holds first: a page reached through a redirect
    # (WordPress also guesses, sending a dead /john/ to /johny/) never takes
    # the ID of a dog listed under its own link
    ordered = sorted(unique.items(), key=lambda item: item[0] not in ids)
    keyed: dict[str, dict] = {}
    for key, animal in ordered:
        post_id = ids.get(key) or page_post_id(scraper, url_of(animal), headers)
        if post_id is None:
            scraper.logger.warning(f"{url_of(animal)} is listed but leads to no page; skipped")
            continue
        external_id = f"{prefix}{post_id}"
        if external_id in keyed:
            scraper.logger.warning(f"{url_of(animal)} leads to the page of {url_of(keyed[external_id])}; skipped")
            continue
        keyed[external_id] = {**animal, "external_id": external_id}
    return list(keyed.values())


def page_post_id(scraper: Any, url: str, headers: dict | None) -> int | None:
    """The ID in a page's <body class>, or None if the page is gone.

    Gone is a 404, or a link that leads to a file (an image, video, audio or
    PDF): Bosnia linked /lucky/, the slug of a 2024 photo, and WordPress sent
    it to lucky.jpg. Anything else without an ID, such as an HTML error page or
    a firewall's JSON, still raises.
    """
    try:
        response = scraper.get_listing_page(url, headers=headers)
    except ListingIncompleteError as e:
        cause = e.__cause__
        if isinstance(cause, requests.HTTPError) and getattr(cause.response, "status_code", None) in (404, 410):
            return None
        raise
    if (response.headers.get("Content-Type") or "").lower().startswith(_FILE_TYPES):
        return None
    post_id = body_post_id(BeautifulSoup(response.content, "html.parser"))
    if post_id is None:
        raise ListingIncompleteError(f"{url} carries no WordPress post ID")
    return post_id
