# Frontend

Next.js 16 application with React 19, TypeScript, and Tailwind CSS.

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.8.2
- **Styling**: Tailwind CSS 3.3.2
- **Components**: Radix UI primitives
- **Data Fetching**: SWR and React Query (@tanstack/react-query)
- **Testing**: Jest + React Testing Library (276 test files)
- **Package Manager**: pnpm

## Development Commands

```bash
pnpm dev           # Development server
pnpm test          # Run tests  
pnpm build         # Production build
pnpm lint          # ESLint
pnpm tsc --noEmit  # Type check
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
```

## Key Features

- **Server/Client Separation**: SEO metadata (server) + interactivity (client)
- **Security**: XSS prevention, content sanitization, URL validation
- **Performance**: Lazy loading, Cloudflare R2 images, component memoization
- **Accessibility**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Testing**: Comprehensive test coverage across all features

## Deployment

Deploy to Vercel (auto-detects Next.js) or any Node.js hosting platform.

---

*For complete documentation, see [docs/](../docs/)*