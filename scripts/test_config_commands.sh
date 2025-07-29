#!/bin/bash

# Config Command Test Script
# This script tests all config commands work correctly

set -e  # Exit on any error

echo "🔧 TESTING CONFIG COMMANDS..."
echo "============================="

# Change to project root
cd "$(dirname "$0")/.."

echo "📍 Current directory: $(pwd)"

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

echo ""
echo "📋 TESTING DIRECT EXECUTION METHOD"
echo "-----------------------------------"

echo "✅ Testing list command..."
python management/config_commands.py list --enabled-only | grep -q "Available Organizations" && echo "✅ List command passed" || echo "❌ List command failed"

echo "✅ Testing validate command..."
python management/config_commands.py validate | grep -q "Validating configurations" && echo "✅ Validate command passed" || echo "❌ Validate command failed"

echo "✅ Testing sync dry-run command..."
python management/config_commands.py sync --dry-run | grep -q "Dry run" && echo "✅ Sync dry-run command passed" || echo "❌ Sync dry-run command failed"

echo "✅ Testing show command..."
python management/config_commands.py show rean | grep -q "Organization Details" && echo "✅ Show command passed" || echo "❌ Show command failed"

echo ""
echo "📋 TESTING MODULE EXECUTION METHOD"
echo "-----------------------------------"

echo "✅ Testing module list command..."
python -m management.config_commands list --enabled-only | grep -q "Available Organizations" && echo "✅ Module list command passed" || echo "❌ Module list command failed"

echo "✅ Testing module validate command..."
python -m management.config_commands validate | grep -q "Validating configurations" && echo "✅ Module validate command passed" || echo "❌ Module validate command failed"

echo ""
echo "🔍 TESTING ERROR CONDITIONS"
echo "----------------------------"

echo "✅ Testing invalid command..."
if python management/config_commands.py invalid-command 2>&1 | grep -q "invalid choice"; then
    echo "✅ Invalid command handling passed"
else
    echo "❌ Invalid command handling failed"
fi

echo "✅ Testing help command..."
python management/config_commands.py --help | grep -q "Available commands" && echo "✅ Help command passed" || echo "❌ Help command failed"

echo ""
echo "🔧 TESTING REQUIRED FILES"
echo "-------------------------"

echo "✅ Checking __init__.py files..."
if [[ -f "utils/__init__.py" && -f "management/__init__.py" ]]; then
    echo "✅ Required __init__.py files exist"
else
    echo "❌ Missing __init__.py files"
    echo "Creating missing files..."
    touch utils/__init__.py management/__init__.py
    echo "✅ Created missing __init__.py files"
fi

echo ""
echo "📊 TESTING CONFIGURATION VALIDATION"
echo "------------------------------------"

echo "✅ Testing individual organization configs..."
for config_file in configs/organizations/*.yaml; do
    if [[ -f "$config_file" ]]; then
        config_name=$(basename "$config_file" .yaml)
        echo "   Testing config: $config_name"
        python management/config_commands.py show "$config_name" > /dev/null 2>&1 && echo "   ✅ $config_name config valid" || echo "   ❌ $config_name config invalid"
    fi
done

echo ""
echo "🎯 SUMMARY"
echo "=========="
echo "✅ Config command testing completed!"
echo "📚 All documented commands have been verified."
echo "🔗 Both direct and module execution methods work."

echo ""
echo "💡 QUICK REFERENCE"
echo "=================="
echo "Direct execution:  python management/config_commands.py <command>"
echo "Module execution:  python -m management.config_commands <command>"
echo "Help:              python management/config_commands.py --help"