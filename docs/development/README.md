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
- ✅ All 2,000+ tests passing
- ✅ Code coverage thresholds maintained
- ✅ Zero linting errors
- ✅ No type errors
- ✅ Performance benchmarks met
- ✅ Security checks passed

## 🧪 Testing Strategy

### Backend Testing (876 Tests)
- **Unit Tests**: Pure logic validation
- **Integration Tests**: Database and API testing
- **Security Tests**: Input validation and injection prevention
- **Performance Tests**: Load testing and optimization

### Frontend Testing (1,249+ Tests)
- **Component Tests**: UI behavior validation
- **Accessibility Tests**: WCAG 2.1 AA compliance
- **Performance Tests**: Core Web Vitals optimization
- **Cross-Browser Tests**: Modern browser compatibility

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
pytest tests/ -v              # Backend tests
npm test                      # Frontend tests

# 4. Start development servers
python run_api.py             # Backend API
npm run dev                   # Frontend (separate terminal)
```

---

*Navigate back to [Documentation Home](../README.md)*