# Claude Code Cheatsheet

## 🚨 Emergency Commands

```bash
# When nothing works
source venv/bin/activate
touch utils/__init__.py management/__init__.py
pip install -r requirements.txt
python main.py --setup

# Frontend issues
cd frontend && rm -rf node_modules .next
npm install && npm run build

# Database issues
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals;"
python management/emergency_operations.py --reset-stale-data
```

## 📊 Test Commands at a Glance

```bash
# Backend
pytest tests/scrapers/test_specific.py::test_name -v  # One test
pytest tests/ -m "unit" -v                            # Fast unit tests
pytest tests/ -m "not slow" -v                        # Dev tests (307)
pytest tests/ -v                                      # All tests (555)

# Frontend
npm test DogCard                                      # One component
npm test -- --testNamePattern="renders correctly"     # Pattern match
npm test                                              # All (1,249)
```

## 🎯 Common Regex Patterns

```python
# Scraper patterns
AGE_PATTERN = r'(\d+)\s*(year|month|week)s?\s*old'
WEIGHT_PATTERN = r'(\d+\.?\d*)\s*(kg|lb|pound)'
ID_PATTERN = r'[A-Z0-9]{6,12}'

# Validation patterns
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
URL_PATTERN = r'^https?://[^\s<>"{}|\\^`\[\]]+$'
```

## 🔄 Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
    test-all = !pytest tests/ -m 'not slow' && cd frontend && npm test
    quality = !black . && isort . && flake8
    fresh = !git checkout main && git pull && source venv/bin/activate
```

## 💡 VS Code Snippets

```json
// Python test snippet
"pytest": {
  "prefix": "pyt",
  "body": [
    "def test_${1:feature_name}():",
    "    \"\"\"Test ${2:description}.\"\"\"",
    "    # Arrange",
    "    ${3:setup}",
    "    ",
    "    # Act",
    "    ${4:action}",
    "    ",
    "    # Assert",
    "    assert ${5:assertion}"
  ]
}

// React component snippet
"func-component": {
  "prefix": "rfc",
  "body": [
    "export default function ${1:ComponentName}({ ${2:props} }) {",
    "  ${3:// hooks}",
    "  ",
    "  return (",
    "    <div className=\"${4:class-name}\">",
    "      ${5:content}",
    "    </div>",
    "  );",
    "}"
  ]
}
```
