# Development Documentation

This section contains essential resources for developers contributing to the Rescue Dog Aggregator project, including standards, workflows, and best practices.

## 📋 Documents in this Section

### 🛠️ Development Guides
- **[Contributing](contributing.md)** - How to contribute to the project
- **[Testing](testing.md)** - Comprehensive testing strategies and examples
- **[Workflow](workflow.md)** - Development workflow and best practices

## 🔗 Related Documentation
- **[Code Style Guide](../examples/code-style-guide.md)** - Coding standards and conventions
- **[TDD Patterns](../examples/tdd-patterns.md)** - Test-driven development examples
- **[Architecture Overview](../architecture/project-overview.md)** - System design and architecture

## 🎯 Development Standards

### Code Quality Requirements
- **Test-Driven Development**: Mandatory TDD workflow for all changes
- **Test Coverage**: 95%+ coverage required for all new code
- **Zero Technical Debt**: No compromises on code quality
- **Type Safety**: Comprehensive type checking (TypeScript + Python)

### Quality Gates (Pre-Commit)
- ✅ All backend tests passing (99+ test files)
- ✅ All frontend tests passing (384+ test files)
- ✅ Code coverage thresholds maintained (>93% backend, >90% frontend)
- ✅ Zero linting errors (TypeScript + Python)
- ✅ No type errors (Next.js 15 build successful)
- ✅ Performance benchmarks met
- ✅ Security checks passed
- ✅ Database isolation enforced (global conftest.py protection)

## 🧪 Testing Strategy

### Modern Architecture Patterns
- **BaseScraper Refactoring**: Null Object Pattern, Context Manager, Template Method
- **Service Injection**: Clean dependency injection for metrics, session management
- **Database Isolation**: Global test protection via conftest.py automation
- **Configuration-Driven**: YAML-based organization management

### Backend Testing (99+ Test Files)
- **Unit Tests**: Pure logic validation with optimized markers
- **Integration Tests**: Database and API testing
- **Security Tests**: Input validation and injection prevention
- **Performance Tests**: Load testing and optimization
- **Test Markers**: Optimized for CI/CD with unit/fast/slow categories

### Frontend Testing (384+ Test Files)
- **Component Tests**: UI behavior validation
- **Accessibility Tests**: WCAG 2.1 AA compliance
- **Performance Tests**: Core Web Vitals optimization
- **Cross-Browser Tests**: Modern browser compatibility
- **Next.js 15 Compatibility**: Environment-aware testing patterns

## 🔄 Development Workflow

1. **Setup**: [Installation](../getting-started/installation.md) → [Configuration](../getting-started/configuration.md)
2. **Development**: [TDD Workflow](workflow.md) → [Code Standards](../examples/code-style-guide.md)
3. **Testing**: [Testing Guide](testing.md) → [TDD Patterns](../examples/tdd-patterns.md)
4. **Contribution**: [Contributing Guide](contributing.md) → Pull Request

## 🚀 Quick Start for Contributors

```bash
# 1. Setup development environment
git clone <repository>
cd rescue-dog-aggregator
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# 2. Setup frontend
cd frontend
npm install

# 3. Run tests to verify setup
source venv/bin/activate                              # Activate virtual environment
python -m pytest tests/ -m "not slow" -v           # Fast backend tests (recommended)
npm test                                             # Frontend tests

# 4. Start development servers
source venv/bin/activate && python run_api.py      # Backend API
cd frontend && npm run dev                          # Frontend (separate terminal)

# 5. Configuration management
python management/config_commands.py list          # List organizations
python management/config_commands.py sync          # Sync configs to database
```

---

*Navigate back to [Documentation Home](../README.md)*