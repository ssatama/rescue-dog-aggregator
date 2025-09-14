"""Tests for the check_adoptions management command."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch
import sys

import pytest
import psycopg2

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from management.check_adoptions import CheckAdoptionsCommand
from services.adoption_detection import AdoptionCheckResult


@pytest.fixture
def mock_db_connection():
    """Mock database connection."""
    with patch('management.check_adoptions.psycopg2.connect') as mock_connect:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        yield mock_conn, mock_cursor


@pytest.fixture  
def mock_config_loader():
    """Mock config loader."""
    with patch('management.check_adoptions.ConfigLoader') as mock_loader_class:
        mock_loader = MagicMock()
        mock_loader_class.return_value = mock_loader
        yield mock_loader


@pytest.fixture
def mock_adoption_service():
    """Mock adoption detection service."""
    with patch('management.check_adoptions.AdoptionDetectionService') as mock_service_class:
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        yield mock_service


@pytest.fixture
def sample_organization_config():
    """Sample organization configuration."""
    return {
        'id': 1,
        'name': 'Dogs Trust',
        'slug': 'dogstrust',
        'check_adoption_status': True,
        'adoption_check_threshold': 3,
        'adoption_check_config': {
            'max_checks_per_run': 50,
            'check_interval_hours': 24
        }
    }


@pytest.fixture
def sample_eligible_dogs():
    """Sample eligible dogs for testing."""
    return [
        {
            'id': 1,
            'name': 'Max',
            'url': 'https://dogstrust.org.uk/dogs/max',
            'status': 'unknown',
            'consecutive_scrapes_missing': 5,
            'adoption_checked_at': None,
            'adoption_check_data': None
        },
        {
            'id': 2,
            'name': 'Bella',
            'url': 'https://dogstrust.org.uk/dogs/bella',
            'status': 'unknown',
            'consecutive_scrapes_missing': 3,
            'adoption_checked_at': datetime.utcnow() - timedelta(hours=48),
            'adoption_check_data': None
        }
    ]


class TestCheckAdoptionsCommand:
    """Test the CheckAdoptionsCommand class."""
    
    def test_initialization(self):
        """Test command initialization."""
        command = CheckAdoptionsCommand(dry_run=True, verbose=True)
        assert command.dry_run is True
        assert command.verbose is True
        assert command.conn is None
        assert command.cursor is None
    
    def test_connect_success(self, mock_db_connection):
        """Test successful database connection."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(verbose=True)
        
        with patch('management.check_adoptions.os.getenv') as mock_getenv:
            mock_getenv.side_effect = lambda key, default=None: {
                'DB_NAME': 'rescue_dogs',
                'DB_USER': 'postgres',
                'DB_PASSWORD': 'password',
                'DB_HOST': 'localhost',
                'DB_PORT': '5432'
            }.get(key, default)
            
            command.connect()
            
            assert command.conn is not None
            assert command.cursor is not None
    
    def test_get_organizations_specific(self, mock_config_loader, sample_organization_config):
        """Test getting a specific organization."""
        command = CheckAdoptionsCommand()
        command.config_loader = mock_config_loader
        
        mock_config_loader.get_config.return_value = sample_organization_config
        
        orgs = command.get_organizations(org_slug='dogstrust')
        
        assert len(orgs) == 1
        assert orgs[0]['slug'] == 'dogstrust'
        mock_config_loader.get_config.assert_called_once_with('dogstrust')
    
    def test_get_organizations_all_enabled(self, mock_config_loader, sample_organization_config):
        """Test getting all organizations with adoption checking enabled."""
        command = CheckAdoptionsCommand()
        command.config_loader = mock_config_loader
        
        # Create configs with different settings
        config_enabled = sample_organization_config.copy()
        config_disabled = sample_organization_config.copy()
        config_disabled['check_adoption_status'] = False
        config_disabled['slug'] = 'other-org'
        
        mock_config_loader.load_all_configs.return_value = [
            config_enabled,
            config_disabled
        ]
        
        orgs = command.get_organizations(all_orgs=True)
        
        assert len(orgs) == 1
        assert orgs[0]['slug'] == 'dogstrust'
    
    def test_get_eligible_dogs(self, mock_db_connection, sample_eligible_dogs):
        """Test getting eligible dogs for checking."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand()
        command.conn = mock_conn
        command.cursor = mock_cursor
        
        mock_cursor.fetchall.return_value = sample_eligible_dogs
        
        dogs = command.get_eligible_dogs(
            org_id=1,
            threshold=3,
            limit=50,
            check_interval_hours=24
        )
        
        assert len(dogs) == 2
        assert dogs[0]['name'] == 'Max'
        assert dogs[1]['name'] == 'Bella'
        
        # Verify query was executed with correct parameters
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args[0]
        assert call_args[1][0] == 1  # org_id
        assert call_args[1][1] == 3  # threshold
        assert call_args[1][3] == 50  # limit
    
    def test_check_organization_dry_run(
        self, 
        mock_db_connection,
        mock_adoption_service,
        sample_organization_config,
        sample_eligible_dogs,
        capsys
    ):
        """Test checking organization in dry-run mode."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(dry_run=True, verbose=False)
        command.conn = mock_conn
        command.cursor = mock_cursor
        command.adoption_service = mock_adoption_service
        
        mock_cursor.fetchall.return_value = sample_eligible_dogs
        
        command.check_organization(sample_organization_config, limit=50)
        
        # Verify no actual checks were made
        mock_adoption_service.check_adoption_status.assert_not_called()
        
        # Verify dry-run output
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out
        assert "Max" in captured.out
        assert "Bella" in captured.out
    
    def test_check_organization_real_run(
        self,
        mock_db_connection,
        mock_adoption_service,
        sample_organization_config,
        sample_eligible_dogs
    ):
        """Test checking organization with real API calls."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(dry_run=False, verbose=True)
        command.conn = mock_conn
        command.cursor = mock_cursor
        command.adoption_service = mock_adoption_service
        
        mock_cursor.fetchall.return_value = sample_eligible_dogs
        
        # Mock adoption check results
        mock_results = [
            AdoptionCheckResult(
                animal_id=1,
                animal_name='Max',
                previous_status='unknown',
                detected_status='adopted',
                evidence='Page shows REHOMED',
                confidence=0.95,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error=None
            ),
            AdoptionCheckResult(
                animal_id=2,
                animal_name='Bella',
                previous_status='unknown',
                detected_status='available',
                evidence='Still listed as available',
                confidence=0.90,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error=None
            )
        ]
        
        mock_adoption_service.check_adoption_status.side_effect = mock_results
        
        command.check_organization(sample_organization_config, limit=50)
        
        # Verify adoption checks were made
        assert mock_adoption_service.check_adoption_status.call_count == 2
        
        # Verify database updates
        assert mock_cursor.execute.call_count >= 3  # 1 for eligible dogs + 2 for updates
        assert mock_conn.commit.call_count == 2
    
    def test_update_dog_status(self, mock_db_connection):
        """Test updating dog status in database."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(dry_run=False)
        command.conn = mock_conn
        command.cursor = mock_cursor
        
        result = AdoptionCheckResult(
            animal_id=1,
            animal_name='Max',
            previous_status='unknown',
            detected_status='adopted',
            evidence='Page shows REHOMED',
            confidence=0.95,
            checked_at=datetime.utcnow(),
            raw_response={'markdown': 'test'},
            error=None
        )
        
        command.update_dog_status(1, result)
        
        # Verify update query was executed
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args[0]
        
        assert 'UPDATE animals' in call_args[0]
        assert call_args[1][0] == 'adopted'  # status
        assert 'evidence' in call_args[1][1]  # JSON data
        assert call_args[1][3] == 1  # dog_id
        
        mock_conn.commit.assert_called_once()
    
    def test_update_dog_status_dry_run(self, mock_db_connection):
        """Test that no updates happen in dry-run mode."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(dry_run=True)
        command.conn = mock_conn
        command.cursor = mock_cursor
        
        result = AdoptionCheckResult(
            animal_id=1,
            animal_name='Max',
            previous_status='unknown',
            detected_status='adopted',
            evidence='Page shows REHOMED',
            confidence=0.95,
            checked_at=datetime.utcnow(),
            raw_response=None,
            error=None
        )
        
        command.update_dog_status(1, result)
        
        # Verify no database operations occurred
        mock_cursor.execute.assert_not_called()
        mock_conn.commit.assert_not_called()
    
    def test_print_summary(self, capsys):
        """Test printing summary of results."""
        command = CheckAdoptionsCommand()
        
        results = [
            AdoptionCheckResult(
                animal_id=1,
                animal_name='Max',
                previous_status='unknown',
                detected_status='adopted',
                evidence='',
                confidence=0.95,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error=None
            ),
            AdoptionCheckResult(
                animal_id=2,
                animal_name='Bella',
                previous_status='unknown',
                detected_status='adopted',
                evidence='',
                confidence=0.90,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error=None
            ),
            AdoptionCheckResult(
                animal_id=3,
                animal_name='Charlie',
                previous_status='unknown',
                detected_status='available',
                evidence='',
                confidence=0.85,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error=None
            ),
            AdoptionCheckResult(
                animal_id=4,
                animal_name='Luna',
                previous_status='unknown',
                detected_status='unknown',
                evidence='',
                confidence=0.0,
                checked_at=datetime.utcnow(),
                raw_response=None,
                error='Failed to fetch page'
            )
        ]
        
        command.print_summary('Dogs Trust', results)
        
        captured = capsys.readouterr()
        output = captured.out
        
        assert 'Summary for Dogs Trust' in output
        assert 'Total checked: 4' in output
        assert 'adopted: 2 (50.0%)' in output
        assert 'available: 1 (25.0%)' in output
        assert 'unknown: 1 (25.0%)' in output
        assert 'Errors: 1' in output
    
    def test_cleanup(self, mock_db_connection):
        """Test cleanup of database connections."""
        mock_conn, mock_cursor = mock_db_connection
        command = CheckAdoptionsCommand(verbose=True)
        command.conn = mock_conn
        command.cursor = mock_cursor
        
        command.cleanup()
        
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()


class TestMainFunction:
    """Test the main entry point."""
    
    def test_main_with_org_flag(self):
        """Test main function with --org flag."""
        with patch('sys.argv', ['check_adoptions.py', '--org', 'dogstrust']):
            with patch('management.check_adoptions.CheckAdoptionsCommand') as mock_command_class:
                mock_command = MagicMock()
                mock_command_class.return_value = mock_command
                
                from management.check_adoptions import main
                
                # Should not raise SystemExit for valid args
                try:
                    main()
                except SystemExit as e:
                    if e.code != 0:
                        raise
                
                mock_command.connect.assert_called_once()
                mock_command.get_organizations.assert_called_once_with(
                    org_slug='dogstrust',
                    all_orgs=False
                )
    
    def test_main_with_all_flag(self):
        """Test main function with --all flag."""
        with patch('sys.argv', ['check_adoptions.py', '--all']):
            with patch('management.check_adoptions.CheckAdoptionsCommand') as mock_command_class:
                mock_command = MagicMock()
                mock_command_class.return_value = mock_command
                mock_command.get_organizations.return_value = []
                
                from management.check_adoptions import main
                
                try:
                    main()
                except SystemExit as e:
                    if e.code != 0:
                        raise
                
                mock_command.get_organizations.assert_called_once_with(
                    org_slug=None,
                    all_orgs=True
                )
    
    def test_main_missing_required_args(self):
        """Test main function without required arguments."""
        with patch('sys.argv', ['check_adoptions.py']):
            from management.check_adoptions import main
            
            with pytest.raises(SystemExit) as exc_info:
                main()
            
            assert exc_info.value.code == 2  # argparse error code
    
    def test_main_with_dry_run_and_verbose(self):
        """Test main function with --dry-run and --verbose flags."""
        with patch('sys.argv', ['check_adoptions.py', '--org', 'dogstrust', '--dry-run', '--verbose']):
            with patch('management.check_adoptions.CheckAdoptionsCommand') as mock_command_class:
                mock_command = MagicMock()
                mock_command_class.return_value = mock_command
                mock_command.get_organizations.return_value = [{'slug': 'dogstrust'}]
                
                from management.check_adoptions import main
                
                try:
                    main()
                except SystemExit as e:
                    if e.code != 0:
                        raise
                
                mock_command_class.assert_called_once_with(dry_run=True, verbose=True)
    
    def test_main_with_limit(self):
        """Test main function with --limit flag."""
        with patch('sys.argv', ['check_adoptions.py', '--org', 'dogstrust', '--limit', '10']):
            with patch('management.check_adoptions.CheckAdoptionsCommand') as mock_command_class:
                mock_command = MagicMock()
                mock_command_class.return_value = mock_command
                mock_command.get_organizations.return_value = [{'slug': 'dogstrust'}]
                
                from management.check_adoptions import main
                
                try:
                    main()
                except SystemExit as e:
                    if e.code != 0:
                        raise
                
                mock_command.check_organization.assert_called_with(
                    {'slug': 'dogstrust'},
                    10
                )