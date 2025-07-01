import json
import subprocess
import sys
from pathlib import Path

import yaml

from utils.config_models import OrganizationConfig

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def test_config_models():
    """Test that our config models work with the YAML file we created."""

    # Load the YAML config (path relative to project root)
    config_path = project_root / "configs" / "organizations" / "pets-in-turkey.yaml"

    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)

    print("Loaded YAML data:")
    print(json.dumps(config_data, indent=2))

    try:
        # Create the config object
        config = OrganizationConfig(**config_data)

        print("\n✅ Config model created successfully!")
        print(f"Organization: {config.get_display_name()}")
        print(f"Enabled: {config.is_enabled_for_scraping()}")
        print(f"Module path: {config.get_full_module_path()}")
        print(f"Scraper config: {config.get_scraper_config_dict()}")

        # Test validation
        warnings = config.validate_business_rules()
        if warnings:
            print("\n⚠️  Business rule warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        else:
            print("\n✅ No business rule warnings")

        return True

    except Exception as e:
        print(f"\n❌ Error creating config: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Install required dependency first
    try:
        import pydantic  # noqa: F401
    except ImportError:
        print("Installing required dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pydantic", "PyYAML"])
        import pydantic  # noqa: F401

    test_config_models()
