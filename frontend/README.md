# Frontend

Next.js 15 application with React 18, TypeScript, and Tailwind CSS.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

- **Framework**: Next.js 15.0.3 with App Router
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 3.4.14
- **Components**: Radix UI primitives
- **Data Fetching**: SWR
- **Testing**: Jest + React Testing Library (1,249+ tests)

## Development Commands

```bash
npm run dev           # Development server
npm test             # Run tests
npm run build        # Production build
npm run lint         # ESLint
npm run check:types  # TypeScript check
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
```

## Key Features

- **Server/Client Separation**: SEO metadata (server) + interactivity (client)
- **Security**: XSS prevention, content sanitization, URL validation
- **Performance**: Lazy loading, Cloudinary images, component memoization
- **Accessibility**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Testing**: Comprehensive test coverage across all features

## Deployment

Deploy to Vercel (auto-detects Next.js) or any Node.js hosting platform.

---

*For complete documentation, see [docs/](../docs/)*