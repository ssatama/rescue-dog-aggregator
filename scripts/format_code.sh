#!/bin/bash
# Auto-format code for the Rescue Dog Aggregator project

set -e  # Exit on error

echo "🐕 Rescue Dog Aggregator - Code Formatting"
echo "=========================================="

# Check if we're in the project root
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  Warning: No virtual environment found. Using system Python."
fi

# Install formatting tools if not present
echo "🔧 Checking formatting tools..."
pip install -q black isort flake8 2>/dev/null || {
    echo "📥 Installing formatting tools..."
    pip install black isort flake8
}

# Format Python code with black
echo "🎨 Formatting Python code with Black..."
black . --quiet || {
    echo "❌ Black formatting failed"
    exit 1
}

# Sort imports with isort
echo "📚 Sorting imports with isort..."
isort . --quiet || {
    echo "❌ Import sorting failed"
    exit 1
}

# Run flake8 to check for remaining issues
echo "🔍 Checking code with flake8..."
flake8 . --select=E9,F63,F7,F82 --quiet || {
    echo "❌ Critical flake8 errors found"
    exit 1
}

# Show statistics
echo ""
echo "✅ Code formatting complete!"
echo ""
echo "📊 Statistics:"
echo "  - Python files formatted: $(find . -name "*.py" -not -path "./venv/*" | wc -l)"
echo "  - Directories processed: $(find . -type d -name "__pycache__" -prune -o -type d -not -path "./venv/*" -not -path "./.git/*" | wc -l)"

# Check if there are changes
if git diff --quiet; then
    echo ""
    echo "✨ No formatting changes needed - code is already clean!"
else
    echo ""
    echo "📝 Formatting changes made. Run 'git diff' to review."
    echo "💡 Tip: Run this script before every commit!"
fi

echo ""
echo "🚀 Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Run tests: python -m pytest tests/ -m 'not slow'"
echo "  3. Commit changes: git add -A && git commit -m 'Format code'"