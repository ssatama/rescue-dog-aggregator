import pytest
from unittest.mock import Mock, patch
from api.services.animal_service import AnimalService
from datetime import datetime


class TestCrossbreedCounting:
    """Test suite for crossbreed counting functionality in breed statistics"""

    @pytest.fixture
    def animal_service(self):
        """Create an instance of AnimalService for testing"""
        mock_cursor = Mock()
        return AnimalService(mock_cursor)

    @pytest.fixture
    def mock_animals_data(self):
        """Mock data representing various breed types"""
        return [
            # Crossbreeds (should be counted)
            {"id": 1, "primary_breed": "Labrador Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 2, "primary_breed": "Collie Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 3, "primary_breed": "German Shepherd Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 4, "primary_breed": "Terrier Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 5, "primary_breed": "Spaniel Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            
            # Pure breeds (should NOT be counted as crossbreeds)
            {"id": 6, "primary_breed": "Labrador Retriever", "breed_type": "purebred", "status": "available", "active": True},
            {"id": 7, "primary_breed": "German Shepherd", "breed_type": "purebred", "status": "available", "active": True},
            
            # Mixed breeds (should NOT be counted as crossbreeds)
            {"id": 8, "primary_breed": "Mixed Breed", "breed_type": "mixed", "status": "available", "active": True},
            {"id": 9, "primary_breed": "Mixed", "breed_type": "mixed", "status": "available", "active": True},
            
            # Sighthounds (special case, should NOT be counted as crossbreeds)
            {"id": 10, "primary_breed": "Lurcher", "breed_type": "sighthound", "status": "available", "active": True},
            
            # Unknown breed type (should NOT be counted)
            {"id": 11, "primary_breed": "Unknown Mix", "breed_type": "unknown", "status": "available", "active": True},
            
            # Inactive/adopted animals (should NOT be counted)
            {"id": 12, "primary_breed": "Poodle Mix", "breed_type": "crossbreed", "status": "adopted", "active": True},
            {"id": 13, "primary_breed": "Beagle Mix", "breed_type": "crossbreed", "status": "available", "active": False},
        ]

    def test_crossbreed_count_returns_correct_number(self, animal_service, mock_animals_data):
        """Test that crossbreed counting returns the correct number of crossbreeds"""
        with patch.object(animal_service, 'get_all_animals', return_value=mock_animals_data):
            stats = animal_service.get_breed_statistics()
            
            # Should count only available, active crossbreeds (IDs 1-5)
            assert stats['crossbreed_count'] == 5
            assert stats['crossbreed_count'] > 0  # Not hardcoded to 0

    def test_crossbreed_count_excludes_purebreds(self, animal_service, mock_animals_data):
        """Test that purebred dogs are not counted as crossbreeds"""
        with patch.object(animal_service, 'get_all_animals', return_value=mock_animals_data):
            stats = animal_service.get_breed_statistics()
            
            # Verify purebreds are counted separately
            assert stats['purebred_count'] == 2
            assert stats['crossbreed_count'] == 5
            assert stats['purebred_count'] != stats['crossbreed_count']

    def test_crossbreed_count_excludes_mixed_breeds(self, animal_service, mock_animals_data):
        """Test that general mixed breeds are not counted as crossbreeds"""
        with patch.object(animal_service, 'get_all_animals', return_value=mock_animals_data):
            stats = animal_service.get_breed_statistics()
            
            # Mixed breeds should be in their own category
            mixed_count = len([a for a in mock_animals_data 
                             if a['breed_type'] == 'mixed' 
                             and a['status'] == 'available' 
                             and a['active']])
            assert mixed_count == 2  # IDs 8-9
            assert stats['crossbreed_count'] == 5  # Should not include mixed

    def test_crossbreed_count_with_no_crossbreeds(self, animal_service):
        """Test crossbreed count when there are no crossbreeds"""
        mock_data = [
            {"id": 1, "primary_breed": "Labrador", "breed_type": "purebred", "status": "available", "active": True},
            {"id": 2, "primary_breed": "Mixed", "breed_type": "mixed", "status": "available", "active": True},
        ]
        
        with patch.object(animal_service, 'get_all_animals', return_value=mock_data):
            stats = animal_service.get_breed_statistics()
            assert stats['crossbreed_count'] == 0

    def test_crossbreed_count_filters_by_status(self, animal_service):
        """Test that only available dogs are counted as crossbreeds"""
        mock_data = [
            {"id": 1, "primary_breed": "Lab Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 2, "primary_breed": "Collie Mix", "breed_type": "crossbreed", "status": "adopted", "active": True},
            {"id": 3, "primary_breed": "Poodle Mix", "breed_type": "crossbreed", "status": "pending", "active": True},
            {"id": 4, "primary_breed": "Beagle Mix", "breed_type": "crossbreed", "status": "hold", "active": True},
        ]
        
        with patch.object(animal_service, 'get_all_animals', return_value=mock_data):
            stats = animal_service.get_breed_statistics()
            assert stats['crossbreed_count'] == 1  # Only ID 1 is available

    def test_crossbreed_count_filters_by_active_status(self, animal_service):
        """Test that only active dogs are counted as crossbreeds"""
        mock_data = [
            {"id": 1, "primary_breed": "Lab Mix", "breed_type": "crossbreed", "status": "available", "active": True},
            {"id": 2, "primary_breed": "Collie Mix", "breed_type": "crossbreed", "status": "available", "active": False},
            {"id": 3, "primary_breed": "Poodle Mix", "breed_type": "crossbreed", "status": "available", "active": None},
        ]
        
        with patch.object(animal_service, 'get_all_animals', return_value=mock_data):
            stats = animal_service.get_breed_statistics()
            assert stats['crossbreed_count'] == 1  # Only ID 1 is active

    def test_crossbreed_breeds_list_in_stats(self, animal_service, mock_animals_data):
        """Test that crossbreed types are properly listed in statistics"""
        with patch.object(animal_service, 'get_all_animals', return_value=mock_animals_data):
            stats = animal_service.get_breed_statistics()
            
            # Should have a list of crossbreed types with counts
            assert 'crossbreed_types' in stats
            crossbreed_types = stats['crossbreed_types']
            
            # Verify specific crossbreed types are counted
            type_names = [ct['name'] for ct in crossbreed_types]
            assert "Labrador Mix" in type_names
            assert "Collie Mix" in type_names
            assert "German Shepherd Mix" in type_names
            
            # Verify counts are correct
            lab_mix = next(ct for ct in crossbreed_types if ct['name'] == "Labrador Mix")
            assert lab_mix['count'] == 1

    def test_crossbreed_percentage_calculation(self, animal_service, mock_animals_data):
        """Test that crossbreed percentage is calculated correctly"""
        with patch.object(animal_service, 'get_all_animals', return_value=mock_animals_data):
            stats = animal_service.get_breed_statistics()
            
            total_available = 10  # IDs 1-11 minus adopted/inactive
            crossbreed_count = 5
            expected_percentage = (crossbreed_count / total_available) * 100
            
            assert 'crossbreed_percentage' in stats
            assert abs(stats['crossbreed_percentage'] - expected_percentage) < 0.01

    @patch('api.services.animal_service.db')
    def test_crossbreed_count_database_query(self, mock_db, animal_service):
        """Test that the database query for crossbreeds is correct"""
        mock_db.query.return_value.filter.return_value.count.return_value = 229
        
        result = animal_service.get_crossbreed_count()
        
        # Verify the query was constructed correctly
        mock_db.query.assert_called_once()
        # Should filter by breed_type='crossbreed', status='available', active=True
        assert result == 229

    def test_crossbreed_count_api_endpoint_integration(self, animal_service):
        """Test that crossbreed count is properly integrated in API response"""
        with patch.object(animal_service, 'get_crossbreed_count', return_value=229):
            stats = animal_service.get_breed_statistics()
            
            assert stats['crossbreed_count'] == 229
            # Ensure it's not the hardcoded 0 value
            assert stats['crossbreed_count'] != 0