# Documentation Hub for Claude Code

*This documentation is optimized for Claude Code AI assistant to efficiently navigate and execute tasks.*

## Primary References

### 🚀 Essential Documents
- **[Quick Start Commands](quick-start.md)** - All commands you need for any task
- **[CLAUDE.md](../CLAUDE.md)** - Core rules, workflow, and project conventions
- **[Architecture](technical/architecture.md)** - Complete technical architecture

### 📚 Detailed Guides
- **[Testing Guide](guides/testing.md)** - TDD approach and test strategies
- **[Deployment Guide](guides/deployment.md)** - Production deployment process
- **[Installation Guide](guides/installation.md)** - Local environment setup
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

### 🗂️ Component Documentation
- **[Frontend](../frontend/README.md)** - Next.js architecture and patterns
- **[Scrapers](../scrapers/README.md)** - Web scraping patterns
- **[Database](../database/README.md)** - Schema and migrations
- **[Services](../services/llm/README.md)** - Service layer patterns

## Quick Navigation for Common Tasks

### When Fixing Bugs
1. Check [Quick Start Commands](quick-start.md) for debugging commands
2. Review [Troubleshooting](troubleshooting.md) for known issues
3. Use test commands from [Testing Guide](guides/testing.md)

### When Adding Features
1. Follow TDD workflow in [CLAUDE.md](../CLAUDE.md)
2. Check [Architecture](technical/architecture.md) for system design
3. Use patterns from existing code

### When Deploying
1. Run quality gates from [Quick Start](quick-start.md)
2. Follow [Deployment Guide](guides/deployment.md)
3. Monitor via Sentry MCP tools

## Documentation Structure
```
docs/
├── quick-start.md          # All essential commands
├── README.md               # This file - navigation hub
├── troubleshooting.md      # Problem-solving guide
├── guides/                 # How-to guides
│   ├── installation.md     # Setup instructions
│   ├── testing.md          # Test strategies
│   └── deployment.md       # Deploy to production
├── technical/              # Technical reference
│   └── architecture.md     # System architecture
└── reference/              # Data references
    └── database-schema.md  # Database structure
```

## Key Principles for Claude Code

1. **Always check quick-start.md first** - Contains all commands needed
2. **Follow CLAUDE.md strictly** - Core rules and workflow
3. **Use MCP tools extensively** - Sentry, Postgres, Playwright, Zen tools
4. **TDD is mandatory** - Write test first, always
5. **No partial implementations** - Complete all work fully

## Available MCP Tools

- **Postgres MCP**: Query local dev database directly
- **Sentry MCP**: Analyze errors in dev/prod
- **Playwright MCP**: Browser automation and screenshots
- **Zen Tools**: Planning, debugging, code review
- **Serena MCP**: Powerful code analysis and editing

## Environment Context
- **Production**: www.rescuedogs.me
- **Backend**: Railway (PostgreSQL + FastAPI)
- **Frontend**: Vercel (Next.js)
- **Current Stats**: 2500+ dogs, 13 organizations, 434+ backend tests, 1249+ frontend tests

---
*Remember: You are Claude Code. This documentation is your primary reference. Use quick-start.md for all commands.*