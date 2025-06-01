import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.cloudinary_service import CloudinaryService

# Debug: Check if environment variables are loaded
print("🔍 Debug - Environment variables:")
print(f"CLOUDINARY_CLOUD_NAME: {os.getenv('CLOUDINARY_CLOUD_NAME')}")
print(f"CLOUDINARY_API_KEY: {os.getenv('CLOUDINARY_API_KEY')}")
print(
    f"CLOUDINARY_API_SECRET: {'***' if os.getenv('CLOUDINARY_API_SECRET') else 'None'}"
)

# Test with a simple public image
test_url = "https://httpbin.org/image/jpeg"
service = CloudinaryService()

print("\nTesting Cloudinary upload...")
url, success = service.upload_image_from_url(test_url, "test_dog", "test_org")

if success:
    print(f"✅ Success! Cloudinary URL: {url}")
else:
    print("❌ Failed to upload to Cloudinary")
    print("Check your .env file has the correct Cloudinary credentials")
