"""
Test PetsInTurkey scraper with unified standardization.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper


class TestPetsInTurkeyUnifiedStandardization:
    """Test PetsInTurkey scraper with unified standardization enabled."""

    @pytest.fixture
    def scraper(self):
        """Create a PetsInTurkey scraper instance with mocked session."""
        scraper = PetsInTurkeyScraper()
        scraper.session = MagicMock()
        scraper.use_unified_standardization = True
        return scraper

    def test_jack_russell_standardization(self, scraper):
        """Test that Jack Russell variations are standardized."""
        test_data = {
            'breed': 'Jack Russell',
            'age': '2 years',
            'size': 'Small',
            'location': 'Turkey'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Jack Russell Terrier'
        assert result['breed_category'] == 'Terrier'
        assert result['standardized_size'] == 'Small'
        assert result['standardization_confidence'] > 0.8

    def test_terrier_mix_standardization(self, scraper):
        """Test Terrier Mix standardization."""
        test_data = {
            'breed': 'terrier MIX',
            'age': '3 years',
            'size': 'Medium'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Terrier Mix'
        assert result['breed_category'] == 'Mixed'
        assert result['standardized_size'] == 'Medium'

    def test_turkish_breeds_standardization(self, scraper):
        """Test Turkish breed standardization (Kangal, Anatolian Shepherd)."""
        # Test Kangal
        test_data = {
            'breed': 'kangal',
            'age': '4 years',
            'size': 'XLarge'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Kangal'
        assert result['breed_category'] == 'Guardian'
        assert result['standardized_size'] == 'XLarge'
        assert result['standardization_confidence'] > 0.9
        
        # Test Anatolian Shepherd
        test_data = {
            'breed': 'Anatolian Shepherd Dog',
            'age': '3 years',
            'size': 'XLarge'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Anatolian Shepherd'
        assert result['breed_category'] == 'Guardian'
        assert result['standardized_size'] == 'XLarge'

    def test_size_calculation_from_weight(self, scraper):
        """Test size calculation based on weight."""
        # Test all size categories
        test_cases = [
            (3, 'Tiny'),
            (8, 'Small'),
            (20, 'Medium'),
            (35, 'Large'),
            (45, 'XLarge')
        ]
        
        for weight_kg, expected_size in test_cases:
            test_data = {
                'breed': 'Mixed Breed',
                'weight': weight_kg,
                'age': '2 years'
            }
            
            result = scraper.process_animal(test_data)
            
            assert result['standardized_size'] == expected_size

    def test_age_standardization(self, scraper):
        """Test age standardization."""
        test_cases = [
            ('2 years', 24, 24),
            ('6 months', 6, 6),
            ('1 year', 12, 12),
            ('18 months', 18, 18),
            ('puppy', 0, 6),
            ('young', 6, 24),
            ('adult', 24, 84),
            ('senior', 84, 180)
        ]
        
        for age_text, expected_min, expected_max in test_cases:
            test_data = {
                'breed': 'Mixed Breed',
                'age': age_text,
                'size': 'Medium'
            }
            
            result = scraper.process_animal(test_data)
            
            assert result['age_min_months'] == expected_min
            assert result['age_max_months'] == expected_max

    def test_gender_standardization(self, scraper):
        """Test gender field standardization."""
        test_cases = [
            ('Male', 'male'),
            ('Female', 'female'),
            ('MALE', 'male'),
            ('female', 'female'),
            ('M', 'male'),
            ('F', 'female')
        ]
        
        for input_gender, expected_gender in test_cases:
            test_data = {
                'breed': 'Mixed Breed',
                'sex': input_gender,
                'age': '2 years',
                'size': 'Medium'
            }
            
            result = scraper.process_animal(test_data)
            
            assert result['gender'] == expected_gender

    def test_required_field_defaults(self, scraper):
        """Test that required fields get default values."""
        test_data = {
            'breed': 'Mixed Breed'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['name'] == 'Unknown'
        assert result['standardized_size'] == 'Medium'
        assert result['status'] == 'available'
        assert result['animal_type'] == 'dog'
        assert result['age_min_months'] == 12
        assert result['age_max_months'] == 36

    def test_breed_confidence_scores(self, scraper):
        """Test breed confidence scoring."""
        test_cases = [
            ('Labrador Retriever', 1.0),  # Exact match
            ('labrador', 0.9),  # Partial match
            ('Lab Mix', 0.8),  # Mix breed
            ('Unknown Mix', 0.5),  # Unknown mix
        ]
        
        for breed, min_confidence in test_cases:
            test_data = {
                'breed': breed,
                'age': '2 years',
                'size': 'Large'
            }
            
            result = scraper.process_animal(test_data)
            
            assert result['standardization_confidence'] >= min_confidence

    def test_external_url_preserved(self, scraper):
        """Test that external URLs are preserved during standardization."""
        test_data = {
            'breed': 'Mixed Breed',
            'external_url': 'https://example.com/dog/123',
            'age': '2 years',
            'size': 'Medium'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['external_url'] == 'https://example.com/dog/123'

    def test_image_cleaning(self, scraper):
        """Test image URL cleaning for Wix platform."""
        test_data = {
            'breed': 'Mixed Breed',
            'image': 'wix:image://v1/abc123/test.jpg#originWidth=800&originHeight=600',
            'age': '2 years',
            'size': 'Medium'
        }
        
        result = scraper.process_animal(test_data)
        
        # Image URL should be cleaned
        assert 'wix:image://' not in result.get('image', '')

    def test_birth_date_processing(self, scraper):
        """Test birth date extraction and processing."""
        test_data = {
            'breed': 'Mixed Breed',
            'birth_date': '01/06/2022',
            'size': 'Medium'
        }
        
        result = scraper.process_animal(test_data)
        
        # Should calculate age from birth date
        assert 'age_min_months' in result
        assert 'age_max_months' in result

    def test_neutered_spayed_standardization(self, scraper):
        """Test neutered/spayed field standardization."""
        test_cases = [
            ('Yes', True),
            ('No', False),
            ('yes', True),
            ('no', False),
            ('YES', True),
            ('NO', False),
            ('', False)
        ]
        
        for input_value, expected in test_cases:
            test_data = {
                'breed': 'Mixed Breed',
                'neutered': input_value,
                'age': '2 years',
                'size': 'Medium'
            }
            
            result = scraper.process_animal(test_data)
            
            assert result.get('neutered', False) == expected

    @pytest.mark.unit
    @pytest.mark.fast
    def test_full_standardization_flow(self, scraper):
        """Test complete standardization flow with all fields."""
        test_data = {
            'name': '  Buddy  ',
            'breed': 'jack russell',
            'age': '3 years old',
            'sex': 'Male',
            'neutered': 'Yes',
            'weight': 8,
            'height': 30,
            'location': 'Istanbul, Turkey',
            'description': 'Friendly dog looking for home',
            'external_url': 'https://example.com/buddy',
            'image': 'https://example.com/buddy.jpg',
            'external_id': 'buddy-123'
        }
        
        result = scraper.process_animal(test_data)
        
        # Verify all standardizations
        assert result['name'] == 'Buddy'
        assert result['breed'] == 'Jack Russell Terrier'
        assert result['breed_category'] == 'Terrier'
        assert result['age_min_months'] == 36
        assert result['age_max_months'] == 36
        assert result['gender'] == 'male'
        assert result['neutered'] is True
        assert result['standardized_size'] == 'Small'
        assert result['location'] == 'Istanbul, Turkey'
        assert result['description'] == 'Friendly dog looking for home'
        assert result['external_url'] == 'https://example.com/buddy'
        assert result['image'] == 'https://example.com/buddy.jpg'
        assert result['external_id'] == 'buddy-123'
        assert result['status'] == 'available'
        assert result['animal_type'] == 'dog'
        assert result['standardization_confidence'] > 0.8