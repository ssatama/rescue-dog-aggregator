import os
import getpass

# Get system username as the likely PostgreSQL user
system_user = getpass.getuser()

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'database': os.environ.get('DB_NAME', 'rescue_dogs'),
    'user': os.environ.get('DB_USER', system_user),  # Use system username as default
    'password': os.environ.get('DB_PASSWORD', '')  # Empty default password
}