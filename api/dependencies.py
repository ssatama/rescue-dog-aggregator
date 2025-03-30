# api/dependencies.py

import os
import sys
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor

# Add project root to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_CONFIG

def get_db_connection() -> Generator:
    """
    Create and yield a database connection for use in API endpoints.
    Connection is automatically closed after use.
    """
    conn = None
    try:
        # Build connection parameters
        conn_params = {
            'host': DB_CONFIG['host'],
            'user': DB_CONFIG['user'],
            'database': DB_CONFIG['database'],
            'cursor_factory': RealDictCursor  # Return results as dictionaries
        }
        
        # Only add password if it's not empty
        if DB_CONFIG['password']:
            conn_params['password'] = DB_CONFIG['password']
            
        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        yield conn
    finally:
        if conn:
            conn.close()