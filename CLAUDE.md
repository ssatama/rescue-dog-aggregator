# CLAUDE.md - Guide for Claude AI Agents

## 🎯 Mission
Help maintain and improve the Rescue Dog Aggregator platform by following strict Test-Driven Development (TDD) practices to ensure code quality and reliability.

## ⚡ Quick Start Commands

```bash
# Backend Development
source venv/bin/activate
python -m pytest tests/ -m "not slow" -v  # Run fast tests (259 tests)
python -m pytest tests/ -v                # Run all tests

# Frontend Development  
cd frontend
npm test                                  # Run all tests (1,249 tests across 88 suites)
npm run build                            # Verify production build
npm run dev                              # Start development server

# Quality Checks (REQUIRED before ANY commit)
black . && isort .                       # Format Python code
python -m pytest tests/ -m "not slow"    # Backend tests MUST pass
cd frontend && npm test                  # Frontend tests MUST pass
```

## 🚨 CRITICAL RULES FOR CLAUDE AGENTS

### 1. Test-Driven Development (TDD) is MANDATORY
ALWAYS follow this sequence:
- **RED**: Write failing tests FIRST
- **GREEN**: Write minimal code to pass tests  
- **REFACTOR**: Improve code while keeping tests green

Example TDD workflow:
```bash
# 1. Write test first
# Create test_new_feature.py with failing test

# 2. Run test to see it fail
python -m pytest tests/test_new_feature.py -v

# 3. Implement feature
# Write minimal code to pass

# 4. Run test to see it pass
python -m pytest tests/test_new_feature.py -v

# 5. Run ALL tests to ensure nothing broke
python -m pytest tests/ -m "not slow" -v
```

### 2. NEVER Delete or Skip Tests
- **DO NOT** delete tests to make them pass
- **DO NOT** add skip decorators without explicit user approval
- **DO NOT** modify test expectations unless fixing actual bugs
- If a test fails, **FIX THE CODE**, not the test

### 3. All Tests MUST Pass
Before considering ANY task complete:
- Backend: All 259 tests passing
- Frontend: All 1,249 tests passing (88 suites)
- No exceptions, no "we'll fix it later"

### 4. Update Development Log
After EVERY coding session, update DEVELOPMENT_LOG.md:
```markdown
## YYYY-MM-DD - Feature/Session Name
### Added
- Component/feature with test coverage
### Changed  
- What was modified and why
### Fixed
- Bug description and solution
### Technical Notes
- Test count changes, performance impact
```

## 📁 Project Structure
```
rescue-dog-aggregator/
├── api/                    # FastAPI backend
├── scrapers/              # Web scrapers
├── tests/                 # Backend tests (259 tests)
├── frontend/              # Next.js 15 app
│   ├── src/              # React components
│   └── __tests__/        # Frontend tests (1,249 tests)
├── configs/              # Organization configs
├── database/             # Schema and migrations
└── docs/                 # Documentation
```

## 🧪 Testing Guidelines

### Backend Testing
```bash
# Always run in virtual environment
source venv/bin/activate

# Test categories
pytest -m "unit"      # Fast unit tests (~1s)
pytest -m "api"       # API endpoint tests
pytest -m "database"  # Database tests
pytest -m "not slow"  # All fast tests (default)
```

### Frontend Testing
```bash
cd frontend

# Run specific test suites
npm test -- --testPathPattern="DogCard"        # Component tests
npm test -- --testPathPattern="performance"    # Performance tests
npm test -- --testPathPattern="accessibility"  # A11y tests

# Debug failing tests
npm test -- --verbose --no-coverage
```

## 🔧 Common Tasks

### Adding a New Feature

1. **Create test file first**
   ```python
   # tests/test_new_feature.py
   def test_feature_behavior():
       assert False  # Start with failing test
   ```

2. **Run test to confirm failure**
   ```bash
   pytest tests/test_new_feature.py -v
   ```

3. **Implement feature**
   - Write minimal code
   - Follow existing patterns
   - Update documentation

4. **Verify all tests pass**
   ```bash
   pytest tests/ -m "not slow" -v
   ```

5. **Update development log**

### Modifying Existing Code

1. Run tests first to establish baseline
2. Add/modify tests for new behavior
3. Make code changes
4. Ensure ALL tests still pass
5. Update relevant documentation
6. Log changes in DEVELOPMENT_LOG.md

## ⚠️ Common Pitfalls to Avoid

### ❌ DON'T DO THIS:
```python
# Deleting a failing test
# @pytest.mark.skip("Temporarily disabled")  # NO!
# def test_important_functionality():
#     pass

# Modifying test to match broken code
def test_data_validation():
    # assert result.is_valid == True  # Original
    assert result.is_valid == False  # Changed to pass - NO!
```

### ✅ DO THIS INSTEAD:
```python
# Fix the code to make test pass
def validate_data(data):
    # Add proper validation logic
    return DataValidator(data).is_valid  # Returns True as expected
```

## 📊 Test Coverage Requirements

- **Backend**: Minimum 93% coverage
- **Frontend**: All components must have tests
- **New features**: 100% test coverage required
- **Bug fixes**: Must include regression tests

## 🚀 Performance Considerations

- Run `not slow` tests during development
- Full test suite before commits
- Use test markers to organize test runs
- Profile slow tests and optimize

## 📝 Documentation Updates

When modifying code, update:
- Inline code comments
- Function/class docstrings
- Relevant `docs/` files
- API documentation if endpoints change
- README.md if adding major features

## 🆘 Getting Help

- Check existing docs in `docs/` directory
- Review test examples for patterns
- Search error messages in troubleshooting guide
- Ask for clarification rather than skip tests

## 🎯 Remember

Your primary goals as a Claude agent:
1. **Write tests first** (TDD)
2. **Keep all tests passing** (no exceptions)
3. **Never delete tests** (fix the code instead)
4. **Document changes** (in DEVELOPMENT_LOG.md)
5. **Maintain quality** (code coverage, linting, type safety)

This approach ensures the codebase remains stable, reliable, and maintainable for all future contributors and rescue dogs! 🐕