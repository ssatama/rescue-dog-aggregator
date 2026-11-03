"""Scraper for Pets in Turkey (petsinturkey.org)."""

import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper

DOG_PAGE = re.compile(r"/dogs/([a-z0-9-]+)/?", re.IGNORECASE)
WEIGHT = re.compile(r"(\d+(?:[.,]\d+)?)\s*kg", re.IGNORECASE)
# "1 year", "1.5 years", "2 yo", "9 months", "10 weeks"; a bare "1,5" is years
AGE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(years?|yrs?|yo|y|months?|weeks?)?", re.IGNORECASE)
SEXES = {"male": "Male", "female": "Female"}


def _host(netloc: str) -> str:
    return netloc.lower().removeprefix("www.")


class PetsInTurkeyScraper(BaseScraper):
    """Pets in Turkey lists every dog on /dogs, one card per dog.

    Since the site left Wix (2026-10, #747) each card links to the dog's own
    page, /dogs/<slug>. The slug is the id: the photo number can change, and a
    second dog with a taken name gets "-2". The cards carry no story, only
    where the dog is now, so there is no description (#564).
    """

    def __init__(
        self,
        config_id: str = "pets-in-turkey",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        super().__init__(
            config_id=config_id,
            metrics_collector=metrics_collector,
            session_manager=session_manager,
            database_service=database_service,
        )

        self.base_url = self.org_config.metadata.website_url.rstrip("/")
        self.listing_url = f"{self.base_url}/dogs"
        self.organization_name = "Pets in Turkey"

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect every dog card on /dogs.

        A listing failure propagates, so the run ends as an error and stale
        detection doesn't run.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.logger.info(f"Fetching dogs from {self.listing_url}")
        response = self.get_listing_page(self.listing_url, headers=headers, timeout=30)

        dogs_data = []
        for card in BeautifulSoup(response.text, "html.parser").select("a.animal-card"):
            if card.get("data-species", "dog").lower() != "dog":
                continue
            # One odd card is skipped, not the whole run: a run that fails
            # freezes every dog, as from 2026-10-29 (#747)
            try:
                dog_data = self._extract_dog_data(card)
                if not dog_data.get("external_id") or not dog_data.get("name"):
                    self.logger.warning(f"Skipping a card without a name or dog page link: {card.get('href')!r}")
                    continue
                dogs_data.append(self._apply_standardization(dog_data))
            except Exception as e:
                self.logger.error(f"Skipping card {card.get('href')!r}: {e}")

        self.logger.info(f"Extracted {len(dogs_data)} dogs")

        for dog in dogs_data:
            if self.session_manager:
                self.session_manager.record_found_animal(dog["external_id"])

        return dogs_data

    def _extract_dog_data(self, card) -> dict[str, Any]:
        """Read one `a.animal-card`: page link, photo, name and the facts line."""
        dog_data: dict[str, Any] = {
            "name": "",
            "breed": None,
            "age": None,
            "sex": None,
            "size": None,
            "status": "available",
            "animal_type": "dog",
            "properties": {},
            "external_id": None,
        }

        link = urlparse(urljoin(f"{self.base_url}/", card.get("href") or ""))
        page = DOG_PAGE.fullmatch(link.path)
        if page and _host(link.netloc) == _host(urlparse(self.base_url).netloc):
            slug = page.group(1).lower()
            dog_data["external_id"] = f"pit-{slug}"
            dog_data["adoption_url"] = f"{self.base_url}/dogs/{slug}"

        name = card.select_one(".animal-name")
        if name:
            dog_data["name"] = " ".join(name.get_text().split())

        img = card.find("img")
        if img and img.get("src"):
            # The dog's page shows large.webp; the card has the thumbnail
            dog_data["primary_image_url"] = urljoin(f"{self.base_url}/", re.sub(r"/thumb\.webp$", "/large.webp", img["src"]))

        facts = card.select_one(".animal-facts")
        parts = [part.strip() for part in facts.get_text().split("·")] if facts else []
        for part in filter(None, parts):
            self._read_fact(part, dog_data)

        return dog_data

    def _read_fact(self, part: str, dog_data: dict[str, Any]) -> None:
        """Facts are "Sex · age · N kg · breed", but any may be missing: read each by its shape."""
        if part.lower() in SEXES:
            dog_data["sex"] = SEXES[part.lower()]
            return

        weight = WEIGHT.fullmatch(part)
        if weight:
            kg = weight.group(1).replace(",", ".")
            dog_data["properties"]["weight"] = f"{kg} kg"
            dog_data["size"] = self._calculate_size_from_weight(float(kg))
            return

        age = AGE.fullmatch(part)
        if age:
            unit = (age.group(2) or "y").lower()
            unit = "months" if unit.startswith("month") else "weeks" if unit.startswith("week") else "years"
            dog_data["age"] = f"{age.group(1).replace(',', '.')} {unit}"
            return

        # A breed has no digits; a number we can't read ("10-12 kg") is left out
        if any(char.isdigit() for char in part):
            self.logger.debug(f"Unread fact {part!r}")
            return

        dog_data["breed"] = part

    def _calculate_size_from_weight(self, weight_kg: float) -> str:
        if weight_kg < 5:
            return "Tiny"
        elif weight_kg < 12:
            return "Small"
        elif weight_kg < 25:
            return "Medium"
        elif weight_kg < 40:
            return "Large"
        else:
            return "XLarge"

    def _apply_standardization(self, dog_data: dict[str, Any]) -> dict[str, Any]:
        """Run the unified standardization, leaving missing data out."""
        data = dog_data.copy()
        if data.get("name"):
            data["name"] = data["name"].strip()

        standardized = self.process_animal(data)

        if not standardized.get("age_text") and standardized.get("age"):
            standardized["age_text"] = standardized["age"]
        standardized.setdefault("status", "available")
        standardized.setdefault("animal_type", "dog")

        return standardized
