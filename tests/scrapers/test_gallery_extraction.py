"""Scrapers return each dog's photo gallery as image_urls, hero first (#487).

Fixtures are real detail pages saved on 2026-09-24 with scripts and styles
stripped. Counts are what the rescue showed for that dog on that day.
"""

import logging
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper
from scrapers.daisy_family_rescue.dog_detail_scraper import DaisyFamilyRescueDogDetailScraper
from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from scrapers.misis_rescue.scraper import MisisRescueScraper
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import SanterPawsBulgarianRescueScraper
from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper
from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from scrapers.woof_project.dogs_scraper import WoofProjectScraper
from utils.shared_extraction_patterns import gallery_urls, wordpress_original

FIXTURES = Path(__file__).parent.parent / "fixtures" / "galleries"


def soup(name: str) -> BeautifulSoup:
    return BeautifulSoup((FIXTURES / f"{name}.html").read_text(), "html.parser")


def bare(scraper_class, base_url: str):
    """A scraper without config or database: only its parsing methods are used."""
    scraper = scraper_class.__new__(scraper_class)
    scraper.base_url = base_url
    scraper.logger = logging.getLogger("test")
    return scraper


@pytest.mark.unit
class TestDogsTrustGallery:
    scraper = bare(DogsTrustScraper, "https://www.dogstrust.org.uk")

    def test_returns_the_dogs_three_photos_hero_first(self):
        page = soup("dogstrust_3473958")

        urls = self.scraper._extract_image_urls(page, "3473958")

        assert urls == [
            "https://www.dogstrust.org.uk/images/800x600/dogs/3473958/068Sh00000AVFyUIAX.jpg",
            "https://www.dogstrust.org.uk/images/800x600/dogs/3473958/068Sh00000AVDxtIAH.jpg",
            "https://www.dogstrust.org.uk/images/800x600/dogs/3473958/068Sh00000AV7FhIAL.jpg",
        ]
        assert urls[0] == self.scraper._extract_primary_image(page, "3473958")

    def test_ignores_other_dogs_assets_and_webp_variants(self):
        urls = self.scraper._extract_image_urls(soup("dogstrust_3473958"), "3473958")

        assert all("/dogs/3473958/" in url and not url.endswith(".webp") for url in urls)

    def test_no_dog_id_means_no_gallery(self):
        assert self.scraper._extract_image_urls(soup("dogstrust_3473958"), None) == []


@pytest.mark.unit
class TestTierschutzvereinGallery:
    scraper = bare(TierschutzvereinEuropaScraper, "https://tierschutzverein-europa.de")

    def test_hero_first_then_the_envira_gallery_in_order(self):
        page = soup("tsv_pontos")
        hero = self.scraper._extract_hero_image(page)

        urls = self.scraper._extract_image_urls(page, hero)

        assert urls[0] == hero
        assert [u.rsplit("/", 1)[-1] for u in urls[1:4]] == ["Pontos2.jpeg", "Pontos.jpeg", "Pontos1.jpeg"]
        assert len(urls) == 22

    def test_the_hero_is_not_repeated_as_its_full_size_original(self):
        urls = self.scraper._extract_image_urls(soup("tsv_pontos"), None)
        page = soup("tsv_pontos")
        with_hero = self.scraper._extract_image_urls(page, self.scraper._extract_hero_image(page))

        assert not any("Profilbild-e1784468830680.jpeg" in u for u in with_hero)
        assert any("Profilbild-e1784468830680.jpeg" in u for u in urls)

    def test_shelter_photo_updates_named_vom_date_are_kept(self):
        """'<Name>-APAP-vom-08.05.2026-0010.jpg' are photos, not documents (checked by eye)."""
        urls = self.scraper._extract_image_urls(soup("tsv_pontos"), None)

        assert any("APAP-vom-08.05.2026" in u for u in urls)

    def test_heic_files_are_skipped(self):
        page = BeautifulSoup(
            '<a class="envira-gallery-link" href="/wp-content/uploads/a.jpg"></a><a class="envira-gallery-link" href="/wp-content/uploads/b.heic"></a>',
            "html.parser",
        )

        assert self.scraper._extract_image_urls(page, None) == ["https://tierschutzverein-europa.de/wp-content/uploads/a.jpg"]


@pytest.mark.unit
class TestMisisGallery:
    scraper = bare(MisisRescueScraper, "https://www.misisrescue.com")

    def test_returns_only_the_posts_gallery(self):
        urls = self.scraper._extract_static_image_urls(soup("misis_freya"))

        assert len(urls) == 33
        assert all("ef9e05_" in url for url in urls)

    def test_a_post_without_a_gallery_block_still_leaves_out_the_site_chrome(self):
        page = soup("misis_freya")
        for node in page.select('[data-hook="gallery-media-image"]'):
            node.decompose()

        urls = self.scraper._extract_static_image_urls(page)

        assert not any("9f9c321c" in url or "0fdef751" in url or "c09b7a83" in url for url in urls)

    def test_site_logo_and_footer_icons_are_not_photos(self):
        urls = self.scraper._extract_static_image_urls(soup("misis_freya"))

        assert not any(url.split("?")[0].endswith(".png") or "9f9c321c" in url or "0fdef751" in url for url in urls)


def names(urls: list[str]) -> list[str]:
    return [url.split("?", 1)[0].rsplit("/", 1)[-1] for url in urls]


def detail_page(scraper, module: str, fixture: str, method: str, url: str) -> dict:
    """Run a requests-based detail scraper against a saved page."""
    html = (FIXTURES / f"{fixture}.html").read_text()
    response = Mock(text=html, content=html.encode(), status_code=200, raise_for_status=lambda: None)
    scraper.use_unified_standardization = False
    scraper.timeout = 30
    with patch(f"{module}.requests.get", return_value=response):
        return getattr(scraper, method)(url)


@pytest.mark.unit
class TestAnimalRescueBosniaGallery:
    def test_hero_then_the_wordpress_gallery_without_repeating_the_hero(self):
        scraper = bare(AnimalRescueBosniaScraper, "https://www.animal-rescue-bosnia.org")

        dog = detail_page(scraper, "scrapers.animalrescuebosnia.animalrescuebosnia_scraper", "arb_johny", "scrape_animal_details", "https://www.animal-rescue-bosnia.org/johny/")

        assert names(dog["image_urls"]) == ["Johny-2.jpg", "Johny-6.jpg", "Johny-5.jpg", "Johny-4.jpg", "Johny-3.jpg", "Johny-1.jpg"]
        assert dog["image_urls"][0] == dog["primary_image_url"]


@pytest.mark.unit
class TestSanterPawsGallery:
    def test_hero_then_the_full_size_originals(self):
        scraper = bare(SanterPawsBulgarianRescueScraper, "https://santerpawsbulgarianrescue.com")

        dog = detail_page(
            scraper, "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper", "santer_dexter", "_scrape_animal_details", "https://santerpawsbulgarianrescue.com/adoption/dexter/"
        )

        assert len(dog["image_urls"]) == 3
        assert dog["image_urls"][0] == dog["primary_image_url"]
        assert all(url.endswith(".webp") and "768x1024" not in url for url in dog["image_urls"][1:])


@pytest.mark.unit
class TestDaisyFamilyGallery:
    def test_hero_then_gallery_and_slider_without_the_logo(self):
        scraper = DaisyFamilyRescueDogDetailScraper.__new__(DaisyFamilyRescueDogDetailScraper)
        page = soup("daisy_massimo")
        hero = scraper._extract_main_image_soup(page)

        urls = scraper._extract_image_urls_soup(page, hero)

        assert urls[0] == hero
        assert len(urls) == 8
        assert not any("Logo" in url for url in urls)


@pytest.mark.unit
class TestTheUnderdogGallery:
    def test_every_slide_once_hero_first(self):
        scraper = bare(TheUnderdogScraper, "https://www.theunderdog.org")
        page = soup("underdog_teddy")
        hero = scraper._extract_hero_image(page)

        urls = scraper._extract_image_urls(page, hero)

        assert urls[0] == hero
        assert len(urls) == len(set(names(urls))) == 24
        assert not any("PRIMARY_UD_label" in url for url in urls)


@pytest.mark.unit
class TestWoofProjectGallery:
    def test_linked_uploads_hero_first_without_icons(self):
        scraper = bare(WoofProjectScraper, "https://woofproject.eu")
        page = soup("woof_sora")
        hero = scraper._extract_primary_image_from_detail(page)

        urls = scraper._extract_image_urls_from_detail(page, hero)

        assert urls[0] == hero
        assert len(urls) == 5
        assert not any(word in url for url in urls for word in ("icon", "logo", "login"))


@pytest.mark.unit
class TestGalleryUrls:
    def test_a_wordpress_resize_is_the_same_photo_as_its_original(self):
        assert wordpress_original("https://x/wp/a-600x600.jpg") == wordpress_original("https://x/wp/a.jpg")
        assert wordpress_original("https://x/wp/a-320x240_c.jpg?ver=2") == wordpress_original("https://x/wp/a.jpg")

    def test_same_file_name_in_another_folder_is_another_photo(self):
        urls = gallery_urls(None, ["https://x/2025/03/1.jpg", "https://x/2025/04/1.jpg", "https://x/2025/03/1-150x150.jpg"])

        assert urls == ["https://x/2025/03/1.jpg", "https://x/2025/04/1.jpg"]

    def test_hero_first_each_photo_once_unviewable_formats_skipped(self):
        urls = gallery_urls("https://x/a-600x600.jpg", ["https://x/a.jpg", "https://x/b.jpg", "https://x/c.heic", "https://x/b.jpg"])

        assert urls == ["https://x/a-600x600.jpg", "https://x/b.jpg"]

    def test_no_hero_and_no_candidates_is_an_empty_gallery(self):
        assert gallery_urls(None, []) == []
