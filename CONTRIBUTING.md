# Contributing to Rescue Dog Aggregator

## Welcome Contributors! 🐕

Thank you for your interest in contributing to the Rescue Dog Aggregator platform. This guide will help you get started with contributing to our mission of helping rescue dogs find homes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Issue Guidelines](#issue-guidelines)
- [Adding New Organizations](#adding-new-organizations)
- [Release Process](#release-process)
- [Getting Help](#getting-help)
- [Recognition](#recognition)
- [Questions?](#questions)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and collaborative in all interactions.

### Our Standards

- **Be respectful**: Treat everyone with kindness and respect
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together toward our shared mission
- **Be patient**: Help newcomers and be understanding of different skill levels

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Development Environment**: Follow our [Installation Guide](docs/guides/installation.md)
2. **Testing Setup**: Review [Testing Guide](docs/guides/testing.md)
3. **Git Knowledge**: Basic familiarity with Git and GitHub workflows
4. **uv**: Python package manager - [install](https://docs.astral.sh/uv/getting-started/installation/)
5. **pnpm**: Node.js package manager - `npm install -g pnpm`

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/rescue-dog-aggregator.git
   cd rescue-dog-aggregator
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/rescue-dog-aggregator/rescue-dog-aggregator.git
   ```

### Development Setup

Follow the complete setup in our [Installation Guide](docs/guides/installation.md):

```bash
# Backend setup
uv sync

# Frontend setup
cd frontend
pnpm install

# Verify setup
uv run pytest tests/ -m "not slow" --tb=no -q  # Backend tests (168 test files)
cd frontend && pnpm test                        # Frontend tests (276 test files)
```

## Development Workflow

### Branch Strategy

We use a simplified Git flow:

- **`main`**: Production-ready code
- **Feature branches**: `feature/feature-name` or `fix/bug-description`
- **Documentation**: `docs/update-description`

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "Add feature: descriptive commit message"

# Push to your fork
git push origin feature/your-feature-name
```

### Commit Guidelines

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `style`: Code style changes (formatting, etc.)

**Examples:**
```bash
feat(api): add curation_type parameter to animals endpoint
fix(frontend): resolve image loading race condition
docs(readme): update installation instructions
test(scrapers): add tests for unified DOM extraction
```

## Pull Request Process

### Before Submitting

1. **Run all tests**:
   ```bash
   # Backend tests (REQUIRED - 168 test files)
   uv run pytest tests/ -m "not slow" -v      # Fast tests for development
   uv run pytest tests/ -m "unit or fast" -v  # Unit + fast tests

   # Frontend tests (REQUIRED - 276 test files)
   cd frontend
   pnpm test

   # Build verification
   pnpm build
   ```

2. **Code quality checks**:
   ```bash
   # Python linting and formatting
   uv run ruff check . --fix
   uv run ruff format .
   ```

3. **Documentation updates**: Update relevant documentation if needed

### Pull Request Template

Use this template for your PR description:

```markdown
## Summary
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Backend tests pass (`uv run pytest tests/ -m "not slow"`)
- [ ] Frontend tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Manual testing completed
- [ ] Database isolation automatically enforced (via global conftest.py)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] Tests added/updated for new functionality
- [ ] All tests pass locally

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information, dependencies, or migration steps.
```

### Review Process

1. **Automated Checks**: All tests must pass
2. **Code Review**: At least one maintainer review required
3. **Documentation Review**: Ensure docs are updated
4. **Testing**: Verify functionality works as expected

## Coding Standards

### Python (Backend)

**Style Guidelines:**
- Follow PEP 8 with line length of 120 characters
- Use type hints where appropriate
- Write docstrings for functions and classes
- Use ruff for linting and formatting

**Example:**
```python
from typing import List, Optional

def get_animals_by_organization(
    organization_id: int, 
    limit: Optional[int] = 20
) -> List[Dict[str, Any]]:
    """
    Fetch animals from a specific organization.
    
    Args:
        organization_id: ID of the organization
        limit: Maximum number of animals to return
        
    Returns:
        List of animal dictionaries
    """
    # Implementation here
    pass
```

**Required Patterns:**
- Configuration-driven approach for new scrapers (YAML-based)
- Modern BaseScraper architecture with Context Manager pattern
- Service injection for metrics and session management
- Comprehensive error handling with logging
- Database transactions for data consistency
- Database isolation automatically enforced in tests

### JavaScript/React (Frontend)

**Style Guidelines:**
- Use ES6+ features and modern React patterns
- Prefer functional components with hooks
- Use TypeScript types when available
- Follow existing component structure

**Example:**
```javascript
'use client';

import { useState, useEffect } from 'react';
import { sanitizeText } from '@/utils/security';

export default function DogCard({ dog, className = "" }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Component logic
  }, [dog.id]);

  return (
    <div className={`dog-card ${className}`}>
      <h3>{sanitizeText(dog.name)}</h3>
      {/* Rest of component */}
    </div>
  );
}
```

**Required Patterns:**
- Use `sanitizeText()` for all user content
- Client components must have `'use client'` directive
- Server components handle metadata generation
- Follow mobile-first responsive design

### Database

**Migration Guidelines:**
- All schema changes require migrations
- Test migrations on copy of production data
- Include rollback instructions
- Document in `database/migration_history.md`

**Example Migration:**
```sql
-- Migration: 004_add_new_feature.sql
-- Description: Add new functionality for feature X

-- Add new column
ALTER TABLE animals ADD COLUMN new_field VARCHAR(100);

-- Create index
CREATE INDEX idx_animals_new_field ON animals(new_field);

-- Update migration history
-- Document this migration in database/migration_history.md
```

## Testing Requirements

### Test-Driven Development (TDD)

We follow TDD principles:

1. **Write tests first** for new features
2. **Run tests frequently** during development
3. **Achieve good coverage** for new code
4. **All tests must pass** before merging

### Backend Testing

```bash
# Fast test suite (recommended for development - 168 test files)
uv run pytest tests/ -m "not slow" -v      # Excludes slow tests
uv run pytest tests/ -m "unit or fast" -v  # Unit + fast tests

# Specific test categories
uv run pytest tests/ -m "unit" -v          # Unit tests (~1s)
uv run pytest tests/ -m "api" -v           # API tests
uv run pytest tests/ -m "database" -v      # Database tests

# Full test suite (CI/CD)
uv run pytest tests/ -v
```

**Critical: Database Isolation**
- All tests automatically protected by global `conftest.py`
- Impossible to write to production database during tests
- No manual setup required - protection is automatic

**Test Standards:**
- Unit tests for business logic
- API tests for endpoint functionality
- Integration tests for complex workflows
- Mock external dependencies appropriately
- Database isolation automatically enforced
- Use optimized test markers (unit, fast, slow)

### Frontend Testing

```bash
cd frontend

# All tests (276 test files)
pnpm test

# Specific test categories
pnpm test -- --testPathPattern="performance"     # Performance tests
pnpm test -- --testPathPattern="accessibility"   # Accessibility tests
pnpm test -- --testPathPattern="cross-browser"   # Cross-browser tests

# Coverage report
pnpm test -- --coverage
```

**Next.js 15 Compatibility**:
- Environment-aware testing patterns for dynamic routes
- Automatic mocking of Next.js navigation in test setup

**Test Standards:**
- Component tests for UI functionality
- Integration tests for user workflows
- Performance tests for load times
- Accessibility tests for WCAG 2.1 AA compliance
- Next.js 15 compatible environment-aware patterns
- Mobile-first responsive design testing

## Documentation

### Requirements

- **Update docs** for any user-facing changes
- **Include examples** for new features
- **Follow existing style** and structure
- **Test documentation** by following instructions

### Documentation Structure

```
docs/
├── features/           # Feature documentation
├── guides/             # Installation, testing, deployment
├── reference/          # Database schema, API reference
└── technical/          # Architecture, scraper docs
```

### Writing Guidelines

- Use clear, concise language
- Include working code examples
- Provide troubleshooting steps
- Update related documentation
- Test all commands and examples

## Issue Guidelines

### Reporting Bugs

Use this template for bug reports:

```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. macOS, Ubuntu]
- Python version: [e.g. 3.12]
- Node version: [e.g. 18.17.0]
- Browser: [e.g. Chrome, Safari]

**Additional Context**
- Error messages
- Screenshots
- Relevant log output
```

### Feature Requests

Use this template for feature requests:

```markdown
**Feature Summary**
Brief description of the proposed feature.

**Problem Statement**
What problem does this solve? Who benefits?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
What other approaches did you consider?

**Implementation Notes**
Technical considerations or suggestions.

**Priority**
- [ ] Critical (security, data loss)
- [ ] High (user experience impact)
- [ ] Medium (nice to have)
- [ ] Low (future consideration)
```

## Adding New Organizations

To add a new rescue organization:

### 1. Create Configuration

Create `configs/organizations/new-org.yaml`:

```yaml
schema_version: "1.0"
id: "new-org"
name: "New Organization Name"
enabled: true
scraper:
  class_name: "NewOrgScraper"
  module: "scrapers.new_org.dogs_scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
metadata:
  website_url: "https://neworg.com"
  description: "Organization description"
  location:
    country: "US"
    city: "City Name"
  service_regions: ["US"]
  ships_to: ["US", "CA"]
  social_media:
    website: "https://neworg.com"
    facebook: "https://facebook.com/neworg"
  established_year: 2020
```

### 2. Implement Scraper

Create `scrapers/new_org/dogs_scraper.py`:

```python
from scrapers.base_scraper import BaseScraper

class NewOrgScraper(BaseScraper):
    def collect_data(self):
        """Extract animal data from organization website."""
        animals = []
        
        # Implement scraping logic here
        # Use self.respect_rate_limit() between requests
        # Return list of animal dictionaries
        
        return animals
```

### 3. Test Implementation

```bash
# Validate configuration
uv run python management/config_commands.py validate new-org

# Sync to database
uv run python management/config_commands.py sync

# Test scraper
uv run python management/config_commands.py run new-org

# Verify results
uv run python management/config_commands.py show new-org
```

### 4. Documentation

- Add organization to README.md
- Update any relevant documentation
- Include in PR description

## Release Process

### Version Numbering

We use semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Performance verified
- [ ] Security review completed
- [ ] Deployment plan ready

## Getting Help

### Resources

- **Documentation**: Check [docs/](docs/) directory
- **Installation**: [docs/guides/installation.md](docs/guides/installation.md)
- **Testing**: [docs/guides/testing.md](docs/guides/testing.md)
- **Troubleshooting**: [docs/troubleshooting.md](docs/troubleshooting.md)

### Communication

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Security**: Email security issues privately (see SECURITY.md)

### Development Help

**Common Commands:**
```bash
# Backend development
uv run pytest tests/ -m "not slow" -v
uv run python management/config_commands.py list

# Frontend development
cd frontend
pnpm test
pnpm dev

# Full verification
uv run pytest tests/ -m "not slow" && cd frontend && pnpm test && pnpm build
```

## Recognition

We appreciate all contributions! Contributors will be:

- **Listed in README.md** (with permission)
- **Mentioned in release notes** for significant contributions
- **Invited to review** related future changes

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search existing issues and discussions
3. Create a new issue with the "question" label
4. Be specific about what you're trying to accomplish

Thank you for contributing to help rescue dogs find their forever homes! 🐕❤️