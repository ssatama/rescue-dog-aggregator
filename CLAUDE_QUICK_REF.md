# Claude Code Quick Reference

## 🚀 Common Tasks (Copy & Paste)

### Add New API Endpoint

```
TASK: Add /api/v1/breeds endpoint that returns all unique breeds

PHASE 1 - RESEARCH:
- Read api/routes/ structure
- Check existing endpoint patterns
- Review database models

PHASE 2 - PLAN:
□ Write failing test for endpoint
□ Create route handler
□ Add database query
□ Handle errors
□ Update API documentation

PHASE 3 - EXECUTE:
[Let me implement this with TDD...]
```

### Add New Scraper

```
TASK: Add scraper for [Organization Name]

PHASE 1 - RESEARCH:
- Analyze target website structure
- Identify data patterns
- Check existing scraper implementations

PHASE 2 - PLAN:
□ Create YAML config
□ Write extraction tests
□ Implement scraper class
□ Test with real data
□ Add to documentation

PHASE 3 - EXECUTE:
[Let me implement this step by step...]
```

### Fix Failing Test

```
TASK: Fix failing test [test name]

PHASE 1 - RESEARCH:
- Read the failing test
- Understand expected behavior
- Check related code

PHASE 2 - PLAN:
□ Identify root cause
□ Plan fix approach
□ Consider edge cases
□ Verify no side effects

PHASE 3 - EXECUTE:
[Let me fix this properly...]
```

### Add Frontend Component

```
TASK: Create [Component] with [requirements]

PHASE 1 - RESEARCH:
- Review similar components
- Check design system
- Identify data needs

PHASE 2 - PLAN:
□ Write component tests
□ Create component structure
□ Add TypeScript types
□ Implement responsive design
□ Test accessibility

PHASE 3 - EXECUTE:
[Starting with tests...]
```

## 🔧 Quick Fixes

### "Module not found" (Python)

```bash
touch utils/__init__.py
source venv/bin/activate
pip install -e .
```

### "Cannot find module" (JS)

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Test Won't Run

```bash
# Backend
pytest tests/path/to/test.py::test_name -v

# Frontend
npm test -- --testNamePattern="test name"
```
