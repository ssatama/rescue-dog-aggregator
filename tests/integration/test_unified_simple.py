"""Simple integration test for unified standardization."""
import pytest
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.unit
class TestUnifiedStandardizationSimple:
    """Simple tests for unified standardization functionality."""
    
    def test_lurcher_to_hound_fix(self):
        """Test critical Lurcher -> Hound group fix."""
        standardizer = UnifiedStandardizer()
        
        # Test Lurcher breed mapping
        result = standardizer.apply_full_standardization(breed='Lurcher')
        assert result['breed']['name'] == 'Lurcher'
        assert result['breed']['group'] == 'Hound'  # Critical fix!
        assert result['breed']['confidence'] >= 0.9
    
    def test_staffordshire_standardization(self):
        """Test Staffordshire Bull Terrier name standardization."""
        standardizer = UnifiedStandardizer()
        
        # Test various Staffy variations
        variations = ['Staffy', 'Staffie', 'Staff', 'Staffordshire', 'Staffordshire Terrier']
        for variant in variations:
            result = standardizer.apply_full_standardization(breed=variant)
            assert result['breed']['name'] == 'Staffordshire Bull Terrier'
            assert result['breed']['group'] == 'Terrier'
            assert result['breed']['confidence'] >= 0.8
    
    def test_designer_breeds(self):
        """Test designer breed handling."""
        standardizer = UnifiedStandardizer()
        
        # Test Labradoodle
        result = standardizer.apply_full_standardization(breed='Labradoodle')
        assert result['breed']['name'] == 'Labradoodle'
        assert result['breed']['group'] == 'Designer/Hybrid'
        assert result['breed']['primary_breed'] == 'Labrador Retriever'
        assert result['breed']['secondary_breed'] == 'Poodle'
        assert result['breed']['is_mixed'] is True
        
        # Test Cockapoo
        result = standardizer.apply_full_standardization(breed='Cockapoo')
        assert result['breed']['name'] == 'Cockapoo'
        assert result['breed']['group'] == 'Designer/Hybrid'
        assert result['breed']['primary_breed'] == 'Cocker Spaniel'
        assert result['breed']['secondary_breed'] == 'Poodle'
    
    def test_age_standardization(self):
        """Test age parsing and standardization."""
        standardizer = UnifiedStandardizer()
        
        # Test various age formats
        result = standardizer.apply_full_standardization(age='2 years')
        assert result['age']['min_months'] == 24
        assert result['age']['max_months'] == 24
        assert result['age']['category'] == 'Adult'
        
        result = standardizer.apply_full_standardization(age='puppy')
        assert result['age']['category'] == 'Puppy'
        assert result['age']['min_months'] <= 12
        
        result = standardizer.apply_full_standardization(age='5-7 years')
        assert result['age']['min_months'] == 60
        assert result['age']['max_months'] == 84
    
    def test_size_standardization(self):
        """Test size standardization."""
        standardizer = UnifiedStandardizer()
        
        # Test various size formats
        result = standardizer.apply_full_standardization(size='medium')
        assert result['size']['category'] == 'Medium'
        assert 25 <= result['size']['weight_range']['min'] <= 30
        assert 50 <= result['size']['weight_range']['max'] <= 60
        
        result = standardizer.apply_full_standardization(size='Large')
        assert result['size']['category'] == 'Large'
        
        # Test breed-based size inference
        result = standardizer.apply_full_standardization(breed='Chihuahua', size=None)
        assert result['size']['category'] == 'Small'
        assert result['size']['source'] == 'breed'
    
    def test_full_animal_standardization(self):
        """Test standardizing complete animal data."""
        standardizer = UnifiedStandardizer()
        
        # Test complete animal data standardization
        result = standardizer.apply_full_standardization(
            breed='Lurcher cross',
            age='3 years old',
            size='large'
        )
        
        # Verify all fields are standardized
        assert result['breed']['name'] == 'Lurcher Cross'
        assert result['breed']['group'] == 'Hound'  # Critical fix applied
        assert result['breed']['is_mixed'] is True
        assert result['age']['min_months'] == 36
        assert result['age']['category'] == 'Adult'
        assert result['size']['category'] == 'Large'