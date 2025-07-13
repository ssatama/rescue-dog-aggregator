#!/usr/bin/env python3
try:
    print("Testing imports...")
    import api.main

    print("✅ All imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback

    traceback.print_exc()
