"""
Test suite for async database connection pooling.

Following CLAUDE.md principles:
- TDD approach
- Test first, implement second
- Pure functions, no mutations
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import Dict, Any

# Import the module we're about to create
from services.llm.async_database_pool import (
    AsyncDatabasePool,
    PoolConfig,
    ConnectionContext
)


class TestAsyncDatabasePool:
    """Test async database connection pooling."""
    
    @pytest.fixture
    def pool_config(self):
        """Pool configuration fixture."""
        return PoolConfig(
            host="localhost",
            database="test_rescue_dogs",
            user="test_user",
            password="",
            min_connections=2,
            max_connections=10,
            timeout=5.0
        )
    
    @pytest.mark.asyncio
    async def test_pool_initialization(self, pool_config):
        """Test pool initializes with correct configuration."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            mock_create.assert_called_once_with(
                host=pool_config.host,
                database=pool_config.database,
                user=pool_config.user,
                password=pool_config.password,
                min_size=pool_config.min_connections,
                max_size=pool_config.max_connections,
                timeout=pool_config.timeout
            )
            assert pool.is_initialized
    
    @pytest.mark.asyncio
    async def test_pool_acquire_connection(self, pool_config):
        """Test acquiring connection from pool."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_connection = AsyncMock()
            
            # Create a proper async context manager mock - set directly, not as return_value
            mock_acquire_ctx = AsyncMock()
            mock_acquire_ctx.__aenter__ = AsyncMock(return_value=mock_connection)
            mock_acquire_ctx.__aexit__ = AsyncMock(return_value=None)
            mock_pool.acquire = Mock(return_value=mock_acquire_ctx)
            
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            async with pool.acquire() as conn:
                assert conn == mock_connection
            
            mock_pool.acquire.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pool_execute_query(self, pool_config):
        """Test executing query through pool."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_connection = AsyncMock()
            mock_connection.fetch.return_value = [
                {"id": 1, "name": "Buddy"},
                {"id": 2, "name": "Max"}
            ]
            
            # Create a proper async context manager mock - set directly, not as return_value
            mock_acquire_ctx = AsyncMock()
            mock_acquire_ctx.__aenter__ = AsyncMock(return_value=mock_connection)
            mock_acquire_ctx.__aexit__ = AsyncMock(return_value=None)
            mock_pool.acquire = Mock(return_value=mock_acquire_ctx)
            
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            query = "SELECT id, name FROM animals WHERE organization_id = $1"
            results = await pool.fetch(query, 11)
            
            assert len(results) == 2
            assert results[0]["name"] == "Buddy"
            mock_connection.fetch.assert_called_once_with(query, 11)
    
    @pytest.mark.asyncio
    async def test_pool_execute_many(self, pool_config):
        """Test executing multiple statements through pool."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_connection = AsyncMock()
            
            # Create a proper async context manager mock - set directly, not as return_value
            mock_acquire_ctx = AsyncMock()
            mock_acquire_ctx.__aenter__ = AsyncMock(return_value=mock_connection)
            mock_acquire_ctx.__aexit__ = AsyncMock(return_value=None)
            mock_pool.acquire = Mock(return_value=mock_acquire_ctx)
            
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            updates = [
                ({"description": "Updated 1"}, 1),
                ({"description": "Updated 2"}, 2),
            ]
            
            query = "UPDATE animals SET dog_profiler_data = $1 WHERE id = $2"
            await pool.execute_many(query, updates)
            
            mock_connection.executemany.assert_called_once_with(query, updates)
    
    @pytest.mark.asyncio
    async def test_pool_transaction_context(self, pool_config):
        """Test transaction context manager."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_connection = AsyncMock()
            
            # Create a proper async context manager for transaction
            mock_transaction = AsyncMock()
            mock_transaction.__aenter__ = AsyncMock(return_value=mock_transaction)
            mock_transaction.__aexit__ = AsyncMock(return_value=None)
            mock_connection.transaction = Mock(return_value=mock_transaction)
            
            # Create a proper async context manager mock - set directly, not as return_value
            mock_acquire_ctx = AsyncMock()
            mock_acquire_ctx.__aenter__ = AsyncMock(return_value=mock_connection)
            mock_acquire_ctx.__aexit__ = AsyncMock(return_value=None)
            mock_pool.acquire = Mock(return_value=mock_acquire_ctx)
            
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            async with pool.transaction() as conn:
                await conn.execute("UPDATE animals SET name = $1 WHERE id = $2", "NewName", 1)
            
            mock_connection.transaction.assert_called_once()
            mock_connection.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pool_cleanup(self, pool_config):
        """Test pool cleanup on close."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            await pool.close()
            
            mock_pool.close.assert_called_once()
            assert not pool.is_initialized
    
    @pytest.mark.asyncio
    async def test_pool_context_manager(self, pool_config):
        """Test pool as async context manager."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_create.return_value = mock_pool
            
            async with AsyncDatabasePool(pool_config) as pool:
                assert pool.is_initialized
                mock_create.assert_called_once()
            
            mock_pool.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pool_retry_on_connection_error(self, pool_config):
        """Test pool retries on connection errors."""
        # Need to patch asyncpg.exceptions with the actual exception
        import asyncpg.exceptions
        
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            mock_connection = AsyncMock()
            
            # First call fails with the actual asyncpg exception, second succeeds
            mock_connection.fetch.side_effect = [
                asyncpg.exceptions.ConnectionDoesNotExistError("Connection lost"),
                [{"id": 1, "name": "Buddy"}]
            ]
            
            # Create a proper async context manager mock - set directly, not as return_value
            mock_acquire_ctx = AsyncMock()
            mock_acquire_ctx.__aenter__ = AsyncMock(return_value=mock_connection)
            mock_acquire_ctx.__aexit__ = AsyncMock(return_value=None)
            mock_pool.acquire = Mock(return_value=mock_acquire_ctx)
            
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            results = await pool.fetch_with_retry("SELECT * FROM animals", max_retries=2)
            assert len(results) == 1
            assert mock_connection.fetch.call_count == 2
    
    @pytest.mark.asyncio
    async def test_pool_metrics(self, pool_config):
        """Test pool metrics collection."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool = AsyncMock()
            # Mock the _holders attribute that the implementation checks
            mock_pool._holders = [1, 2, 3, 4, 5]  # 5 mock connections
            mock_create.return_value = mock_pool
            
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            metrics = pool.get_metrics()
            assert metrics["current_connections"] == 5
            assert metrics["min_connections"] == pool_config.min_connections
            assert metrics["max_connections"] == pool_config.max_connections
            assert "queries_executed" in metrics


class TestPoolConfig:
    """Test pool configuration."""
    
    def test_config_from_environment(self):
        """Test loading config from environment variables."""
        with patch.dict('os.environ', {
            'DB_HOST': 'test-host',
            'DB_NAME': 'test-db',
            'DB_USER': 'test-user',
            'DB_PASSWORD': 'test-pass',
            'DB_POOL_MIN': '5',
            'DB_POOL_MAX': '20'
        }):
            config = PoolConfig.from_environment()
            assert config.host == 'test-host'
            assert config.database == 'test-db'
            assert config.user == 'test-user'
            assert config.password == 'test-pass'
            assert config.min_connections == 5
            assert config.max_connections == 20
    
    def test_config_validation(self):
        """Test config validation."""
        # Min > Max should raise
        with pytest.raises(ValueError, match="min_connections.*max_connections"):
            PoolConfig(
                host="localhost",
                database="test",
                user="user",
                password="",
                min_connections=20,
                max_connections=10
            )
        
        # Negative values should raise
        with pytest.raises(ValueError, match="must be positive"):
            PoolConfig(
                host="localhost",
                database="test",
                user="user",
                password="",
                min_connections=-1,
                max_connections=10
            )

