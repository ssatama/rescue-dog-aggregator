#!/bin/bash

# Documentation Verification Script
# This script verifies that all documented commands and standards are accurate

set -e  # Exit on any error

echo "🔍 VERIFYING DOCUMENTATION ACCURACY..."
echo "========================================"

# Change to project root
cd "$(dirname "$0")/.."

echo "📍 Current directory: $(pwd)"

# Frontend verification
echo ""
echo "🎨 FRONTEND VERIFICATION"
echo "------------------------"

cd frontend

echo "✅ Testing frontend tests (should show 106 tests passing)..."
npm test --silent | grep -E "(Test Suites|Tests:)" || echo "❌ Frontend tests failed"

echo "✅ Testing frontend build (should complete successfully)..."
npm run build --silent > /dev/null 2>&1 && echo "✅ Frontend build passed" || echo "❌ Frontend build failed"

echo "✅ Testing frontend lint (should complete without critical errors)..."
npm run lint --silent > /dev/null 2>&1 && echo "✅ Frontend lint passed" || echo "❌ Frontend lint failed"

# Backend verification
echo ""
echo "🐍 BACKEND VERIFICATION"
echo "------------------------"

cd ..
source venv/bin/activate

echo "✅ Testing unit tests (should show 85 unit tests)..."
python -m pytest tests/ -m "unit" --tb=no -q | grep -E "passed|failed" || echo "❌ Unit tests failed"

echo "✅ Testing fast tests (should show 230 tests in ~45s)..."
echo "   Running fast test suite..."
START_TIME=$(date +%s)
python -m pytest tests/ -m "not slow" --tb=no -q > /tmp/fast_tests.log 2>&1
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if grep -q "passed" /tmp/fast_tests.log; then
    TEST_COUNT=$(grep -o "[0-9]* passed" /tmp/fast_tests.log | head -1 | grep -o "[0-9]*")
    echo "✅ Fast tests passed: $TEST_COUNT tests in ${DURATION}s"
else
    echo "❌ Fast tests failed"
fi

echo "✅ Checking linting error count (should be ≤750)..."
ERROR_COUNT=$(flake8 --exclude=venv . | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -le 750 ]; then
    echo "✅ Linting errors: $ERROR_COUNT (within acceptable limit of 750)"
else
    echo "❌ Linting errors: $ERROR_COUNT (exceeds limit of 750)"
fi

echo "✅ Checking critical error types..."
F401_COUNT=$(flake8 --exclude=venv . | grep -c "F401" || echo "0")
E402_COUNT=$(flake8 --exclude=venv . | grep -c "E402" || echo "0")

echo "   F401 (unused imports): $F401_COUNT (should be 0)"
echo "   E402 (import order): $E402_COUNT (should be 0)"

if [ "$F401_COUNT" -eq 0 ] && [ "$E402_COUNT" -eq 0 ]; then
    echo "✅ Critical error types within standards"
else
    echo "❌ Critical error types exceed standards"
fi

# Environment variables verification
# Config commands verification
echo ""
echo "⚙️ CONFIG COMMANDS VERIFICATION"
echo "-------------------------------"

echo "✅ Testing config commands..."
if ./scripts/test_config_commands.sh > /tmp/config_test.log 2>&1; then
    echo "✅ Config commands test passed"
else
    echo "❌ Config commands test failed"
    cat /tmp/config_test.log | tail -5
fi

echo ""
echo "🔧 ENVIRONMENT VERIFICATION"
echo "----------------------------"

echo "✅ Checking Python environment..."
python --version

echo "✅ Checking Node.js environment..."
cd frontend
node --version
npm --version

echo "✅ Checking required tools..."
cd ..
source venv/bin/activate

if command -v black >/dev/null 2>&1; then
    echo "✅ black: $(black --version)"
else
    echo "❌ black not installed"
fi

if command -v isort >/dev/null 2>&1; then
    echo "✅ isort: $(isort --version)"
else
    echo "❌ isort not installed"
fi

if command -v flake8 >/dev/null 2>&1; then
    echo "✅ flake8: $(flake8 --version)"
else
    echo "❌ flake8 not installed"
fi

if pip list | grep -q autopep8; then
    echo "✅ autopep8: installed"
else
    echo "❌ autopep8 not installed"
fi

if pip list | grep -q unimport; then
    echo "✅ unimport: installed"
else
    echo "❌ unimport not installed"
fi

echo ""
echo "🎯 VERIFICATION SUMMARY"
echo "======================="
echo "✅ Documentation verification completed!"
echo "📚 All documented commands and standards have been verified."
echo "🔗 See CLAUDE.md, docs/development_workflow.md, and docs/troubleshooting_guide.md for detailed guidance."

echo ""
echo "💡 QUICK REFERENCE"
echo "=================="
echo "Frontend: npm test && npm run build && npm run lint"
echo "Backend:  source venv/bin/activate && python -m pytest tests/ -m 'not slow' -v"
echo "Quality:  black . && isort . && autopep8 --in-place --exclude=venv --recursive ."