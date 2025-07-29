# Rescue Dog Aggregator (Frontend)

This is a Next.js + Tailwind CSS application that consumes the FastAPI backend  
(locally at `http://localhost:8000` by default, configurable via `NEXT_PUBLIC_API_URL`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router pages (Server/Client separation)
│   │   ├── dogs/[id]/
│   │   │   ├── page.jsx         # Server component (SEO metadata)
│   │   │   ├── DogDetailClient.jsx    # Client component (UI/state)
│   │   │   └── __tests__/       # Page-specific tests
│   │   ├── organizations/[id]/
│   │   │   ├── page.jsx         # Server component (SEO metadata)
│   │   │   ├── OrganizationDetailClient.jsx  # Client component (UI/state)
│   │   │   └── __tests__/       # Page-specific tests
│   │   └── globals.css          # Global styles with Tailwind
│   ├── components/              # Shared UI components
│   │   ├── dogs/               # Dog-specific components
│   │   ├── error/              # Error boundary components
│   │   ├── layout/             # Layout components
│   │   ├── organizations/      # Organization components
│   │   └── ui/                 # Generic UI (LazyImage, SocialMediaLinks, etc.)
│   ├── services/               # API helper functions (animalsService, organizationsService)
│   ├── utils/                  # Utilities (logger, security, imageUtils, api)
│   └── __tests__/              # Cross-cutting test suites
│       ├── accessibility/      # Accessibility compliance tests
│       ├── build/              # Build quality tests (console detection)
│       ├── error-handling/     # Error boundary tests
│       ├── performance/        # Performance optimization tests
│       ├── security/           # Security validation tests
│       └── seo/                # SEO metadata tests
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Test setup with Next.js mocks and browser API mocks
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

## Scripts

- `npm run dev` – Development server (usually port 3001)
- `npm run build` – Build for production  
- `npm run start` – Start production build  
- `npm test` – Run all Jest tests (95+ tests across 17 suites)
- `npm run test:watch` – Watch mode
- `npm run lint` – ESLint code quality check

### Recommended Development Workflow
```bash
# Full verification before commits
npm test && npm run build && npm run lint

# Run specific test categories
npm test -- src/__tests__/security/          # Security tests
npm test -- src/__tests__/performance/       # Performance tests  
npm test -- src/__tests__/accessibility/     # Accessibility tests
```

## Testing Strategy (Test-Driven Development)

### Test Coverage: 95+ Tests Across 17 Suites
- **Component tests**: `src/components/**/__tests__/*.test.jsx`  
- **Page tests**: `src/app/**/__tests__/*.test.jsx`  
- **Service tests**: `src/services/**/__tests__/`
- **Security tests**: `src/__tests__/security/` - XSS prevention, content sanitization
- **Performance tests**: `src/__tests__/performance/` - Lazy loading, optimization
- **Accessibility tests**: `src/__tests__/accessibility/` - ARIA compliance, keyboard navigation
- **Build quality tests**: `src/__tests__/build/` - Console statement detection
- **SEO tests**: `src/__tests__/seo/` - Metadata generation validation

### Key Features Tested
- **Social Media Integration**: `<SocialMediaLinks>` component with proper URL validation
- **Server/Client Architecture**: Metadata generation and component separation
- **Error Boundaries**: Resilient error handling with retry functionality
- **Security**: Content sanitization and XSS prevention validation
- **Performance**: Lazy image loading and component memoization
- **Accessibility**: Screen reader support and keyboard navigation

## Architecture & Recent Improvements (2024)

### Next.js 15 App Router with Server/Client Separation
This application uses a modern architecture that separates server-side metadata generation from client-side interactivity:

- **Server Components** handle SEO metadata generation (`generateMetadata`)
- **Client Components** handle user interactions and state management
- **Example**: `dogs/[id]/page.jsx` (server) + `dogs/[id]/DogDetailClient.jsx` (client)

### Security Features
- **XSS Prevention**: All user content sanitized via `src/utils/security.js`
- **Content Sanitization**: `sanitizeText()` and `sanitizeHtml()` utilities
- **URL Validation**: External links validated before rendering
- **Production Logging**: Development-only logging (no console statements in production)

### Performance Optimizations
- **Lazy Loading**: `LazyImage` component with IntersectionObserver
- **Image Optimization**: Cloudinary integration with fallback handling
- **Component Memoization**: Strategic use of `React.memo` for expensive components
- **Error Boundaries**: Resilient error handling with retry functionality

### Accessibility Features
- **ARIA Compliance**: Comprehensive labeling for screen readers
- **Keyboard Navigation**: Full keyboard support and focus management
- **Semantic HTML**: Proper heading hierarchy and landmark usage
- **Screen Reader Support**: Descriptive announcements and navigation

## Environment

Configure the backend API host with:

```bash
export NEXT_PUBLIC_API_URL="http://localhost:8000"
```

## Deployment

Recommended: push this directory to Vercel (it auto-detects Next.js).  
See the [Next.js deploying docs](https://nextjs.org/docs/deployment).
