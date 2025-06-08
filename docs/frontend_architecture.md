# Frontend Architecture Guide

## Overview

The Rescue Dog Aggregator frontend is built with **Next.js 15** using the **App Router** architecture, implementing modern React patterns with a focus on **performance**, **security**, **accessibility**, and **maintainability**. The architecture follows a **test-driven development (TDD)** approach with comprehensive coverage across security, performance, accessibility, and functionality.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript/JavaScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks with component-level state
- **Testing**: Jest + React Testing Library (95+ tests across 17 suites)
- **Image Optimization**: Cloudinary integration with lazy loading
- **Build Tools**: Next.js built-in bundling and optimization

## Architecture Patterns

### Server/Client Component Separation

The application uses **Server Components** for SEO and metadata generation, while **Client Components** handle interactivity and user state.

#### Server Components (SEO Optimized)

**Purpose**: Generate dynamic metadata, improve SEO, and handle server-side rendering.

**Key Files**:
- `src/app/dogs/[id]/page.jsx` - Dog detail metadata generation
- `src/app/organizations/[id]/page.jsx` - Organization metadata generation

**Implementation Pattern**:
```javascript
// Server Component for SEO metadata
export async function generateMetadata({ params }) {
  const dog = await fetchDogById(params.id);
  
  return {
    title: `${dog.name} - Available for Adoption`,
    description: `Meet ${dog.name}, a ${dog.age_text} old dog looking for a loving home.`,
    openGraph: {
      title: `${dog.name} - Rescue Dog`,
      description: dog.description,
      images: [{ url: dog.primary_image_url }],
    },
  };
}

export default function DogPage({ params }) {
  // Server component renders client component with initial data
  return <DogDetailClient dogId={params.id} />;
}
```

#### Client Components (Interactive)

**Purpose**: Handle user interactions, form state, and dynamic UI updates.

**Key Files**:
- `src/app/dogs/[id]/DogDetailClient.jsx` - Dog detail UI and state
- `src/app/organizations/[id]/OrganizationDetailClient.jsx` - Organization UI
- `src/components/dogs/FilterControls.jsx` - Search and filtering

**Implementation Pattern**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export default function DogDetailClient({ dogId }) {
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDogDetails(dogId)
      .then(setDog)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [dogId]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBoundary error={error} />;

  return (
    <div>
      {/* Interactive UI components */}
    </div>
  );
}
```

## Security Implementation

### XSS Prevention

**Comprehensive content sanitization** protects against cross-site scripting attacks.

**Key File**: `src/utils/security.js`

```javascript
import DOMPurify from 'dompurify';

export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove HTML tags and dangerous content
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });
}

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  
  // Allow safe HTML tags only
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
}

export function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
```

**Usage Pattern**:
```javascript
import { sanitizeText, sanitizeHtml } from '@/utils/security';

// Sanitize all user-generated content
const safeName = sanitizeText(dog.name);
const safeDescription = sanitizeHtml(dog.description);
```

### Development Security

- **No console statements in production** - All logging uses development-only logger
- **Secure external resource handling** - URL validation for all external links
- **Content Security Policy** considerations for safe resource loading

## Performance Optimization

### Lazy Image Loading

**Custom LazyImage component** with IntersectionObserver for optimal loading performance.

**Key File**: `src/components/ui/LazyImage.jsx`

```javascript
import { useState, useRef, useEffect } from 'react';

export default function LazyImage({ src, alt, className, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
}
```

### Component Memoization

**Strategic use of React.memo** for expensive components:

```javascript
import React, { memo } from 'react';

const DogCard = memo(function DogCard({ dog, onClick }) {
  return (
    <div onClick={() => onClick(dog.id)}>
      <LazyImage src={dog.primary_image_url} alt={dog.name} />
      <h3>{dog.name}</h3>
      <p>{dog.age_text}</p>
    </div>
  );
});

export default DogCard;
```

### Image Optimization

**Cloudinary integration** with automatic optimization:

```javascript
// src/utils/imageUtils.js
export function getOptimizedImageUrl(originalUrl, options = {}) {
  const {
    width = 'auto',
    height = 'auto',
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Transform Cloudinary URLs for optimization
  if (originalUrl?.includes('res.cloudinary.com')) {
    const transformation = `w_${width},h_${height},c_${crop},g_${gravity},q_${quality},f_${format}`;
    return originalUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  return originalUrl;
}
```

## Accessibility Features

### ARIA Compliance

**Comprehensive accessibility implementation** ensures the application works for all users.

**Key Features**:
- **Semantic HTML structure** with proper landmark roles
- **ARIA labels** for all interactive elements
- **Screen reader optimization** with descriptive content

**Implementation Example**:
```javascript
<main role="main" aria-label="Dog listings">
  <section aria-label="Search and filters">
    <input
      type="search"
      aria-label="Search for dogs by name, breed, or location"
      aria-describedby="search-help"
    />
    <div id="search-help" className="sr-only">
      Enter keywords to find available rescue dogs
    </div>
  </section>

  <section aria-label="Dog results" aria-live="polite">
    {dogs.map(dog => (
      <article key={dog.id} aria-label={`${dog.name}, ${dog.age_text} old`}>
        <img 
          src={dog.image} 
          alt={`Photo of ${dog.name}, a ${dog.breed} available for adoption`}
        />
        <h3>{dog.name}</h3>
        <button 
          aria-label={`View details for ${dog.name}`}
          onClick={() => viewDog(dog.id)}
        >
          Learn More
        </button>
      </article>
    ))}
  </section>
</main>
```

### Keyboard Navigation

**Full keyboard accessibility** with logical tab order:

```css
/* Focus indicators */
.focus-visible:focus {
  @apply outline-2 outline-blue-500 outline-offset-2;
}

/* Skip links for keyboard users */
.skip-link {
  @apply absolute left-0 top-0 -translate-y-full;
  @apply focus:translate-y-0 focus:z-50;
  @apply bg-blue-600 text-white p-2;
}
```

**JavaScript focus management**:
```javascript
function handleKeyPress(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleAction();
  }
}
```

## Error Handling & User Experience

### Error Boundaries

**Multi-level error handling** with graceful degradation:

**Global Error Boundary** (`src/components/error/ErrorBoundary.jsx`):
```javascript
'use client';

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-4 border border-red-200 rounded">
          <h3>Something went wrong</h3>
          <p>We're sorry, but something unexpected happened.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Component-specific Error Boundary** (`src/components/error/DogCardErrorBoundary.jsx`):
```javascript
export function DogCardErrorBoundary({ children, fallback }) {
  return (
    <ErrorBoundary
      fallback={fallback || <DogCardPlaceholder />}
      onError={(error) => console.error('Dog card error:', error)}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Loading States

**Progressive loading** with skeleton screens:

```javascript
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-48 w-full rounded mb-4"></div>
      <div className="bg-gray-200 h-4 w-3/4 rounded mb-2"></div>
      <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
    </div>
  );
}
```

## Test-Driven Development

### Test Architecture (95+ tests across 17 suites)

**Comprehensive test coverage** ensuring reliability and maintainability:

#### Security Tests (`src/__tests__/security/`)

```javascript
// content-sanitization.test.js
describe('Content Sanitization', () => {
  test('sanitizeText removes HTML tags', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello';
    const result = sanitizeText(maliciousInput);
    expect(result).toBe('Hello');
    expect(result).not.toContain('<script>');
  });

  test('sanitizeHtml allows safe tags only', () => {
    const input = '<p>Safe content</p><script>alert("bad")</script>';
    const result = sanitizeHtml(input);
    expect(result).toBe('<p>Safe content</p>');
  });
});
```

#### Performance Tests (`src/__tests__/performance/`)

```javascript
// optimization.test.jsx
describe('Performance Optimization', () => {
  test('LazyImage only loads when in viewport', () => {
    const mockIntersectionObserver = jest.fn();
    global.IntersectionObserver = jest.fn(() => ({
      observe: mockIntersectionObserver,
      disconnect: jest.fn()
    }));

    render(<LazyImage src="test.jpg" alt="Test" />);
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  test('Component memoization prevents unnecessary re-renders', () => {
    const renderSpy = jest.fn();
    const MemoizedComponent = memo(() => {
      renderSpy();
      return <div>Test</div>;
    });

    const { rerender } = render(<MemoizedComponent prop="value" />);
    rerender(<MemoizedComponent prop="value" />);
    
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
```

#### Accessibility Tests (`src/__tests__/accessibility/`)

```javascript
// a11y.test.jsx
describe('Accessibility', () => {
  test('all interactive elements have ARIA labels', () => {
    render(<DogCard dog={mockDog} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt');
  });

  test('keyboard navigation works correctly', () => {
    render(<FilterControls />);
    
    const searchInput = screen.getByRole('searchbox');
    searchInput.focus();
    
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    expect(document.activeElement).not.toBe(searchInput);
  });
});
```

### Testing Best Practices

**Setup and Configuration**:
- **Jest configuration** with Next.js integration
- **React Testing Library** for component testing
- **Mock setup** for external dependencies (Cloudinary, API calls)
- **Test utilities** for common testing patterns

**Test Organization**:
```
src/__tests__/
├── accessibility/     # ARIA compliance, keyboard navigation
├── build/            # Production build validation
├── error-handling/   # Error boundary testing
├── integration/      # Full workflow testing
├── performance/      # Optimization verification
├── security/         # XSS prevention, sanitization
└── seo/             # Metadata validation
```

## Development Workflow

### Code Quality Standards

**Pre-commit checks**:
```bash
# Frontend verification workflow
npm test                 # Run all tests
npm run build           # Verify production build
npm run lint            # ESLint validation
```

**Component Development Pattern**:
1. **Write tests first** (TDD approach)
2. **Implement component** with security and accessibility in mind
3. **Add error boundaries** for graceful degradation
4. **Optimize performance** with memoization and lazy loading
5. **Validate accessibility** with screen readers and keyboard testing

### File Organization

```
src/
├── app/                 # Next.js App Router pages
│   ├── dogs/
│   │   └── [id]/       # Dynamic dog detail pages
│   └── organizations/
│       └── [id]/       # Dynamic organization pages
├── components/          # Reusable UI components
│   ├── dogs/           # Dog-specific components
│   ├── error/          # Error boundaries
│   ├── layout/         # Layout components
│   ├── organizations/  # Organization components
│   └── ui/             # Base UI components (shadcn/ui)
├── services/           # API communication
├── utils/              # Utility functions
│   ├── api.js          # API configuration
│   ├── imageUtils.js   # Image optimization
│   ├── logger.js       # Development logging
│   └── security.js     # Sanitization utilities
└── __tests__/          # Test suites
```

## Performance Monitoring

### Key Metrics

**Core Web Vitals tracking**:
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

**Custom Metrics**:
- Image loading performance
- Component render times
- Error boundary activation rates
- Accessibility compliance scores

### Optimization Strategies

**Build Optimization**:
- Tree shaking for unused code elimination
- Code splitting for optimal bundle sizes
- Image optimization through Cloudinary
- CSS optimization with Tailwind purging

**Runtime Optimization**:
- Lazy loading for images and heavy components
- Memoization for expensive calculations
- Efficient state management
- Progressive enhancement patterns

## Future Considerations

### Planned Enhancements

1. **Progressive Web App (PWA)** features
2. **Advanced caching strategies** with Service Workers
3. **Internationalization (i18n)** support
4. **Advanced analytics** integration
5. **Real-time updates** with WebSocket integration

### Scalability Patterns

- **Component library** extraction for reuse
- **Micro-frontend** architecture for team scaling
- **Advanced state management** (Redux/Zustand) if needed
- **CDN optimization** for global distribution

This architecture provides a solid foundation for a modern, accessible, secure, and performant web application while maintaining excellent developer experience through comprehensive testing and clear organization patterns.