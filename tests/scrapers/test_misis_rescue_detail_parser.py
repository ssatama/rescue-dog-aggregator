import pytest
from bs4 import BeautifulSoup

# This import will fail initially - that's expected!
from scrapers.misis_rescue.detail_parser import MisisRescueDetailParser


@pytest.mark.integration
@pytest.mark.slow
class TestMisisRescueDetailParser:
    """Test detail page parsing for MisisRescue.

    Based on actual page structures shown in screenshots/ folder.
    """

    @pytest.fixture
    def parser(self):
        return MisisRescueDetailParser()

    @pytest.fixture
    def amena_detail_html(self):
        """Sample HTML based on AMENA screenshot."""
        return """
        <html>
        <body>
            <h1>AMENA</h1>
            <div class="things-section">
                <h2>Things you should know about AMENA</h2>
                <ul>
                    <li>rough estimate DOB 2021</li>
                    <li>10kg, height 35 cm, length 55cm</li>
                    <li>mixed breed</li>
                    <li>Amena lives in a pen where she has her doggie house placed but she goes out to the yard during the day to play with other dogs or do whatever she pleases</li>
                    <li>not house & toilet trained, will need some practice</li>
                    <li>she is great with other dogs from the boarding house</li>
                    <li>not tested on cats</li>
                    <li>It's crazy how much she loves & trusts people. She can't get enough of the cuddles. So we need someone who will be ready for his cuddle marathons! So far, she is chilled with unfamiliar people!</li>
                </ul>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def leo_detail_html(self):
        """Sample HTML based on LEO screenshot."""
        return """
        <html>
        <body>
            <h1>LEO</h1>
            <div class="things-section">
                <h2>Things you should know about LEO</h2>
                <ul>
                    <li>DOB: March 2023</li>
                    <li>Mixed breed</li>
                    <li>Currently weighs 2-3kg; expected to be around 5-8 kg when fully grown-maybe 10kg if he surprises us!</li>
                    <li>Playful and full of energy, loves playing with siblings and grown-up dogs</li>
                    <li>Adores cats and is happy around them (thanks to his dog-savvy feline friends)</li>
                    <li>not tested on kids, chilling, is active and would probably enjoy walks and outdoor environments</li>
                </ul>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def naomi_detail_html(self):
        """Sample HTML based on Naomi screenshot format."""
        return """
        <html>
        <body>
            <h1>Naomi</h1>
            <div class="things-section">
                <h2>Things you should know about Naomi</h2>
                <ul>
                    <li>DOB: April/May 2024</li>
                    <li>German Shepherd mix</li>
                    <li>Currently weighs 21-22kg</li>
                    <li>she is very energetic and needs lots of exercise</li>
                    <li>good with children and other dogs</li>
                    <li>needs experienced handlers</li>
                </ul>
            </div>
        </body>
        </html>
        """

    def test_parse_amena_page(self, parser, amena_detail_html):
        """Test parsing AMENA's page from screenshot example."""
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Amena"  # Name is normalized now
        assert result["age_text"] is not None
        assert "year" in result["age_text"]  # Should have age text
        assert result["breed"] == "Mixed Breed"
        assert result["size"] == "Small"  # Based on 10kg
        assert result["sex"] == "Female"  # Based on pronouns
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "10.0kg"

        # Check that bullet points were extracted
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 8

    def test_parse_leo_page(self, parser, leo_detail_html):
        """Test parsing LEO's page from screenshot example."""
        soup = BeautifulSoup(leo_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Leo"  # Name is normalized now
        assert result["breed"] == "Mixed Breed"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "2.5kg"  # Average of 2-3kg
        assert result["size"] == "Tiny"  # 2.5kg is < 5kg threshold for Tiny
        assert result["age_text"] is not None
        assert (
            "month" in result["age_text"] or "year" in result["age_text"]
        )  # Should be young based on March 2023

        # Check bullet points
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 6

    def test_parse_naomi_page(self, parser, naomi_detail_html):
        """Test parsing Naomi's page with weight range."""
        soup = BeautifulSoup(naomi_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Naomi"
        assert result["breed"] == "German Shepherd Mix"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "21.5kg"  # Average of 21-22kg
        assert result["size"] == "Medium"  # Based on weight
        assert result["sex"] == "Female"

        # Check bullet points
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 6

    def test_extract_dog_name(self, parser):
        """Test dog name extraction from various HTML structures."""
        # Test with h1
        html_h1 = "<html><body><h1>Bella</h1></body></html>"
        soup = BeautifulSoup(html_h1, "html.parser")
        assert parser._extract_dog_name(soup) == "Bella"

        # Test with title
        html_title = "<html><head><title>Max - Available for Adoption</title></head><body></body></html>"
        soup = BeautifulSoup(html_title, "html.parser")
        assert parser._extract_dog_name(soup) == "Max"

        # Test with no name
        html_no_name = "<html><body><p>Some content</p></body></html>"
        soup = BeautifulSoup(html_no_name, "html.parser")
        assert parser._extract_dog_name(soup) is None

    def test_extract_bullet_points(self, parser, amena_detail_html):
        """Test bullet point extraction from things section."""
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        bullets = parser._extract_bullet_points(soup)

        assert len(bullets) == 8
        assert bullets[0] == "rough estimate DOB 2021"
        assert bullets[1] == "10kg, height 35 cm, length 55cm"
        assert bullets[2] == "mixed breed"
        assert "she is great with other dogs" in bullets[5]

    def test_missing_things_section(self, parser):
        """Test behavior when 'Things you should know' section is missing."""
        html_no_section = """
        <html>
        <body>
            <h1>Mystery Dog</h1>
            <p>Some description text</p>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_no_section, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Mystery Dog"
        assert result["bullet_points"] == []
        assert result.get("breed") is None
        assert result.get("sex") is None
        assert result.get("age_text") is None

    def test_empty_bullet_points(self, parser):
        """Test handling of empty bullet points."""
        html_empty_bullets = """
        <html>
        <body>
            <h1>Empty Dog</h1>
            <div class="things-section">
                <h2>Things you should know about Empty Dog</h2>
                <ul>
                    <li></li>
                    <li>   </li>
                    <li>Some real content</li>
                    <li></li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_empty_bullets, "html.parser")
        bullets = parser._extract_bullet_points(soup)

        # Should only have the non-empty bullet
        assert len(bullets) == 1
        assert bullets[0] == "Some real content"

    def test_alternative_html_structures(self, parser):
        """Test parsing with different HTML structures."""
        # Test with p tags instead of li
        html_p_tags = """
        <html>
        <body>
            <h1>Alternative Dog</h1>
            <div>
                <h2>Things you should know about Alternative Dog</h2>
                <p>DOB: 2022</p>
                <p>Labrador mix</p>
                <p>weighs 15kg</p>
                <p>he loves to play</p>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_p_tags, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Alternative Dog"
        assert result["breed"] == "Labrador Mix"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "15.0kg"
        assert result["sex"] == "Male"

    def test_integration_with_normalizers(self, parser, amena_detail_html):
        """Test that the parser correctly integrates with normalizer functions."""
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        # Verify normalizer integration
        from scrapers.misis_rescue.normalizer import (
            calculate_age_years,
            extract_birth_date,
            extract_breed,
            extract_sex,
            normalize_size,
        )
        from utils.shared_extraction_patterns import (
            extract_weight_from_text as extract_weight_kg,
        )

        bullets = result["bullet_points"]

        # Test each normalizer function
        assert extract_birth_date(bullets[0]) == "2021"
        assert extract_breed(bullets) == "Mixed Breed"
        assert extract_sex(bullets) == "Female"
        assert extract_weight_kg(bullets[1]) == 10.0
        assert normalize_size(bullets[1]) == "Small"

        # Age calculation (approximate)
        age = calculate_age_years("2021")
        assert age is not None
        assert age > 0

    def test_malformed_html(self, parser):
        """Test parser robustness with malformed HTML."""
        malformed_html = """
        <html>
        <body>
            <h1>Broken Dog</h1>
            <div>
                <h2>Things you should know about Broken Dog
                <ul>
                    <li>DOB: 2023
                    <li>Mixed breed</li>
                    <li>weighs 5kg
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(malformed_html, "html.parser")
        result = parser.parse_detail_page(soup)

        # Should still extract what it can
        assert result["name"] == "Broken Dog"
        assert len(result["bullet_points"]) >= 2
        assert result["breed"] == "Mixed Breed"

    def test_multiple_things_sections(self, parser):
        """Test handling of multiple 'Things you should know' sections."""
        html_multiple = """
        <html>
        <body>
            <h1>Multiple Dog</h1>
            <div>
                <h2>Things you should know about Multiple Dog</h2>
                <ul>
                    <li>DOB: 2022</li>
                    <li>First section breed</li>
                </ul>
            </div>
            <div>
                <h2>Things you should know about care</h2>
                <ul>
                    <li>Different info</li>
                    <li>Care instructions</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_multiple, "html.parser")
        result = parser.parse_detail_page(soup)

        # Should pick up the first/main section
        assert result["name"] == "Multiple Dog"
        assert len(result["bullet_points"]) >= 2
        assert "DOB: 2022" in result["bullet_points"]

    def test_case_insensitive_section_matching(self, parser):
        """Test that section matching is case insensitive."""
        html_case = """
        <html>
        <body>
            <h1>Case Dog</h1>
            <div>
                <h3>THINGS YOU SHOULD KNOW ABOUT CASE DOG</h3>
                <ul>
                    <li>dob: january 2023</li>
                    <li>labrador mix</li>
                    <li>weighs 20kg</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_case, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Case Dog"
        assert len(result["bullet_points"]) == 3
        assert result["breed"] == "Labrador Mix"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "20.0kg"

    def test_whitespace_handling(self, parser):
        """Test handling of excessive whitespace in content."""
        html_whitespace = """
        <html>
        <body>
            <h1>   Whitespace Dog   </h1>
            <div>
                <h2>Things you should know about   Whitespace Dog</h2>
                <ul>
                    <li>   DOB:    2023   </li>
                    <li>  
                        Mixed    breed   
                    </li>
                    <li>Currently   weighs   15kg   </li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_whitespace, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Whitespace Dog"
        assert len(result["bullet_points"]) == 3
        # Check that whitespace is properly cleaned
        assert "DOB: 2023" in result["bullet_points"][0]
        assert result["breed"] == "Mixed Breed"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "15.0kg"

    def test_special_characters_in_name(self, parser):
        """Test handling of special characters in dog names."""
        html_special = """
        <html>
        <body>
            <h1>Luna❤️🐕</h1>
            <div>
                <h2>Things you should know about Luna❤️🐕</h2>
                <ul>
                    <li>DOB: 2022</li>
                    <li>Golden Retriever</li>
                    <li>she loves everyone</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_special, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Luna"  # Name is normalized, emojis removed
        assert result["breed"] == "Golden Retriever"
        assert result["sex"] == "Female"

    def test_nested_html_structures(self, parser):
        """Test parsing with nested HTML structures."""
        html_nested = """
        <html>
        <body>
            <h1>Nested Dog</h1>
            <div class="content">
                <div class="section">
                    <h2>Things you should know about Nested Dog</h2>
                    <div class="bullet-container">
                        <ul class="bullets">
                            <li><span>DOB: <strong>2023</strong></span></li>
                            <li><em>Mixed</em> <u>breed</u></li>
                            <li>Currently weighs <b>8kg</b></li>
                            <li>He is <i>very</i> playful</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_nested, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Nested Dog"
        assert len(result["bullet_points"]) == 4
        assert result["breed"] == "Mixed Breed"
        # Weight is stored in properties now
        assert result["properties"]["weight"] == "8.0kg"
        assert result["sex"] == "Male"

    def test_no_structured_data(self, parser):
        """Test page with no extractable structured data."""
        html_no_data = """
        <html>
        <body>
            <h1>Minimal Dog</h1>
            <div>
                <h2>Things you should know about Minimal Dog</h2>
                <ul>
                    <li>Very friendly</li>
                    <li>Loves walks</li>
                    <li>Good with children</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_no_data, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Minimal Dog"
        assert len(result["bullet_points"]) == 3
        # No structured data should be extracted
        assert result["breed"] is None
        assert result["age_text"] is None
        assert result.get("properties", {}).get("weight") is None
        assert result["sex"] is None
