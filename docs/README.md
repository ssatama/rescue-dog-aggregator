# Rescue Dog Aggregator Documentation

Welcome to the documentation for the Rescue Dog Aggregator - an open-source platform that aggregates rescue dog listings from multiple organizations. Built with modern design patterns, TypeScript throughout, and comprehensive testing (2,400+ tests).

## 📚 Documentation Structure

This documentation is organized into logical categories for easy navigation. Each section contains detailed guides, examples, and reference materials updated for August 2025.

### 🚀 Getting Started
Start here if you're new to the project or setting up a development environment.

- **[Installation Guide](getting-started/installation.md)** - System requirements and setup instructions
- **[Quick Start Guide](getting-started/quick-start.md)** - Get up and running in minutes
- **[Configuration Guide](getting-started/configuration.md)** - Environment and application configuration

### 🏗️ Architecture
Deep dive into the technical architecture and modern design patterns (2024-2025).

- **[Project Overview](architecture/project-overview.md)** - High-level system architecture with Next.js 15.3.0
- **[Backend Architecture](architecture/backend.md)** - FastAPI backend with modern patterns
- **[Frontend Architecture](architecture/frontend-architecture.md)** - Next.js 15.3.0 with App Router and TypeScript
- **[Scraper Design](architecture/scraper-design.md)** - Modern scraper patterns: Null Object, Context Manager, Template Method
- **[README](architecture/README.md)** - Architecture overview and highlights

*[Browse all architecture docs →](architecture/)*

### 🛠️ Development
Essential resources for developers contributing to the project with TDD-first approach.

- **[Contributing Guide](development/contributing.md)** - How to contribute to the project
- **[Testing Guide](development/testing.md)** - Comprehensive testing strategies and examples
- **[Workflow Guide](development/workflow.md)** - Development workflow and best practices

*[Browse all development docs →](development/)*

### 🧪 Testing
Comprehensive testing documentation for our 2,400+ test suite.

- **[Test Optimization](testing/optimization.md)** - Test execution strategies and performance (434+ backend, 1,249 frontend)
- **[Performance Testing](testing/performance.md)** - Core Web Vitals, API benchmarks, Cloudflare R2 optimization
- **[Security Testing](testing/security.md)** - XSS prevention, SQL injection protection, DOMPurify integration

*[Browse all testing docs →](testing/)*

### 🎯 Features
Documentation for specific platform features and capabilities.

- **[CTA Optimization Guide](features/cta-optimization.md)** - MobileStickyBar, Toast notifications, ShareButton with TypeScript
- **[Performance Optimization](features/performance-optimization.md)** - Cloudflare R2, Progressive Images, React.memo patterns
- **[Data Standardization](features/data-standardization.md)** - Automated breed/size normalization system

*[Browse all feature docs →](features/)*

### 🔧 Operations
Production deployment, monitoring, and maintenance guides for Railway deployment.

- **[Production Deployment](operations/production-deployment.md)** - Railway PostgreSQL deployment and setup
- **[Weekly Scraping](operations/weekly-scraping.md)** - Automated scraping operations
- **[Troubleshooting](operations/troubleshooting.md)** - Common issues and solutions

*[Browse all operations docs →](operations/)*

### 📖 API & Reference
Complete API documentation and database schema reference.

- **[API Reference](api/reference.md)** - Complete API endpoint documentation
- **[API Examples](api/examples.md)** - Practical usage examples and code samples
- **[Database Schema](reference/database-schema.md)** - PostgreSQL schema with 2025 updates, Railway deployment

*[Browse all API docs →](api/)* | *[Browse reference docs →](reference/)*

### 💡 Examples
Practical examples and code samples for common tasks.

- **[Code Style Guide](examples/code-style-guide.md)** - Coding standards and best practices
- **[Naming Conventions](examples/naming-conventions.md)** - Consistent naming across the codebase
- **[TDD Patterns](examples/tdd-patterns.md)** - Test-driven development examples
- **[Test Data Patterns](examples/test-data-patterns.md)** - Test data creation and management

*[Browse all examples →](examples/)*

---

## 🎯 Quick Navigation

### For New Developers
1. **[Installation Guide](getting-started/installation.md)** → **[Quick Start](getting-started/quick-start.md)** → **[Contributing Guide](development/contributing.md)**

### For Operators
1. **[Production Deployment](operations/production-deployment.md)** → **[Weekly Scraping](operations/weekly-scraping.md)** → **[Troubleshooting](operations/troubleshooting.md)**

### For API Users
1. **[API Reference](api/reference.md)** → **[API Examples](api/examples.md)** → **[Project Overview](architecture/project-overview.md)**

### For Architects
1. **[Project Overview](architecture/project-overview.md)** → **[Frontend Architecture](architecture/frontend-architecture.md)** → **[Scraper Design](architecture/scraper-design.md)**

---

## 📊 Project Stats (August 2025)

- **🧪 Tests**: 2,400+ comprehensive tests (434+ backend, 1,249 frontend) with global database isolation
- **🚀 Performance**: 95+ Core Web Vitals score, Cloudflare R2 + Images API optimization
- **🔒 Security**: 25+ security tests, XSS prevention, SQL injection protection, DOMPurify integration
- **🏗️ Architecture**: Modern patterns (Null Object, Context Manager, Template Method), TypeScript throughout
- **🌍 Organizations**: 8 rescue organizations across multiple countries
- **🐕 Animals**: 2,000+ tracked rescue dogs with standardized data
- **⚡ Infrastructure**: Railway PostgreSQL deployment, automated migrations, comprehensive monitoring

---

## 🤝 Contributing

We welcome contributions to both the codebase and documentation! Please read our **[Contributing Guide](development/contributing.md)** for details on:

- Code standards and review process
- Testing requirements (TDD mandatory)
- Documentation standards
- Issue reporting and feature requests

### Quick Contribution Links
- **Report Issues**: [GitHub Issues](https://github.com/rescue-dog-aggregator/rescue-dog-aggregator/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/rescue-dog-aggregator/rescue-dog-aggregator/discussions)
- **Code Contributions**: [Contributing Guide](development/contributing.md)
- **Documentation**: Help improve these docs!

---

## 🆘 Need Help?

### Common Resources
- **🐛 Something broken?** → [Troubleshooting Guide](operations/troubleshooting.md)
- **🔧 Setting up locally?** → [Installation Guide](getting-started/installation.md)
- **📝 Need API help?** → [API Examples](api/examples.md)
- **🧪 Writing tests?** → [Test Optimization](testing/optimization.md) | [Testing Guide](development/testing.md)
- **🏗️ Understanding architecture?** → [Modern Patterns](architecture/scraper-design.md) | [Backend](architecture/backend.md)
- **📊 Database schema?** → [Database Schema](reference/database-schema.md)

### Contact & Support
- **Documentation Issues**: Create an issue with the `documentation` label
- **Technical Questions**: Check [Troubleshooting](operations/troubleshooting.md) first
- **Feature Discussions**: Use GitHub Discussions

---

## 📝 Documentation Standards

This documentation follows strict quality standards:

- **🎯 User-Focused**: Written for specific user personas and use cases
- **📚 Comprehensive**: Complete coverage with examples and edge cases
- **🔄 Up-to-Date**: Synchronized with code changes and version updates
- **🔗 Cross-Referenced**: Extensive linking between related topics
- **✅ Tested**: All code examples are tested and verified
- **♿ Accessible**: Clear language, good structure, and inclusive content

---

*Last updated: August 4, 2025 | Version: 2.0.0 | Modern Architecture & Comprehensive Testing*