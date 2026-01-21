#!/usr/bin/env python3
"""Clear Railway database for fresh sync"""

import os
import sys

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text  # noqa: E402

from services.railway.connection import railway_session  # noqa: E402


def clear_railway_database():
    """Clear all data from Railway database tables."""
    try:
        with railway_session() as session:
            # Clear in reverse dependency order
            tables = [
                "service_regions",
                "animal_images",
                "scrape_logs",
                "animals",
                "organizations",
            ]

            for table in tables:
                result = session.execute(text(f"DELETE FROM {table}"))
                print(f"Cleared {result.rowcount} rows from {table}")

            session.commit()
            print("✅ Railway database cleared successfully")

    except Exception as e:
        print(f"❌ Error clearing Railway database: {e}")


if __name__ == "__main__":
    clear_railway_database()
