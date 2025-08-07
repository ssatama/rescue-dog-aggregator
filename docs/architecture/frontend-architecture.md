# Frontend Architecture Guide - Rescue Dog Aggregator

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Component Library & Design System](#component-library--design-system)
- [State Management](#state-management)
- [Routing & Navigation](#routing--navigation)
- [Performance Optimization](#performance-optimization)
- [Security Implementation](#security-implementation)
- [Accessibility Features](#accessibility-features)
- [Testing Strategy](#testing-strategy)
- [Mobile Experience](#mobile-experience)
- [SEO & Metadata](#seo--metadata)
- [Development Workflow](#development-workflow)
- [Build & Deployment](#build--deployment)
- [Error Handling](#error-handling)
- [Performance Monitoring](#performance-monitoring)
- [Advanced Features](#advanced-features)
- [Code Quality & Standards](#code-quality--standards)
- [Future Considerations](#future-considerations)

## Overview

The Rescue Dog Aggregator frontend is a modern web application built with **Next.js 15** and the **App Router** architecture. It implements React 18 patterns with a focus on **performance**, **security**, **accessibility**, and **maintainability**. The architecture follows a **test-driven development (TDD)** approach with comprehensive test coverage.

### Key Metrics (Current State - 2025)
- **Framework**: Next.js 15.0.3 with App Router architecture
- **Test Coverage**: 2,598 comprehensive tests (2,586 passing, 12 skipped) across 201 test suites
- **Component Count**: 50+ reusable components with shadcn/ui design system
- **Organizations**: 8 active rescue organizations integrated
- **Performance**: Core Web Vitals optimized with Cloudflare Images CDN
- **Accessibility**: WCAG 2.1 AA compliant with automated testing
- **Security**: XSS prevention, content sanitization, and secure headers
- **Build Optimization**: Advanced webpack configuration with code splitting

## Technology Stack

### Core Technologies
- **Framework**: Next.js 15.0.3 with App Router and React 18.3.1
- **Language**: TypeScript/JavaScript (mixed codebase with gradual TypeScript migration)
- **Styling**: Tailwind CSS 3.4.17 with custom warm color palette and CSS variables
- **Component Library**: shadcn/ui with Radix UI primitives for accessibility
- **State Management**: React hooks with Context API (no localStorage/sessionStorage for app state)
- **Animation**: Framer Motion 12.18.1 for sophisticated animations and transitions
- **Icons**: Heroicons 2.2.0 + Lucide React 0.487.0 for comprehensive icon coverage

### Development & Testing Tools
- **Testing Framework**: Jest 29.7.0 + React Testing Library 16.3.0
- **E2E Testing**: Playwright 1.54.1 with multi-browser support
- **Build System**: Next.js optimized bundling with webpack customizations
- **Code Quality**: ESLint 9.28.0 with Next.js config + Prettier 3.6.2
- **Image Optimization**: Cloudflare R2 + Cloudflare Images with security validation
- **Accessibility**: jest-axe 10.0.0 for automated accessibility testing
- **Analytics**: Vercel Analytics 1.5.0 + Speed Insights 1.2.0 for performance monitoring

### UI Framework
- **Base**: Tailwind CSS with mobile-first responsive design
- **Components**: shadcn/ui components with Radix UI primitives
- **Variants**: class-variance-authority (cva) for component variants
- **Utilities**: clsx 2.1.1 and tailwind-merge 2.7.0 for conditional classes
- **Animations**: tailwindcss-animate 1.0.7 for smooth transitions

## Architecture Patterns

### Next.js 15 App Router Architecture

The application leverages the App Router's powerful features for optimal performance and developer experience.

#### Directory Structure
```
src/app/
├── layout.js                          # Root layout with global metadata
├── page.jsx                           # Homepage (server component)
├── HomeClient.jsx                     # Homepage client component
├── globals.css                        # Global styles with Tailwind
├── dogs/
│   ├── page.jsx                      # Dogs listing (server component)
│   ├── DogsPageClient.jsx            # Dogs listing client component
│   └── [slug]/                       # Dynamic dog routes (slug-based)
│       ├── page.jsx                  # Dog detail (server component with metadata)
│       └── DogDetailClient.jsx       # Dog detail client component
├── organizations/
│   ├── page.jsx                      # Organizations listing
│   ├── OrganizationsClient.jsx       # Organizations client component
│   └── [slug]/                       # Dynamic organization routes (slug-based)
│       ├── page.jsx                  # Organization detail (server component)
│       └── OrganizationDetailClient.jsx # Organization detail client
├── about/
│   └── page.jsx                      # About page
├── api/                               # API routes (minimal usage)
├── sitemap.xml/
│   └── route.js                      # Dynamic sitemap generation
└── robots.txt/
    └── route.js                      # Dynamic robots.txt generation
```

### Server/Client Component Separation

The application uses a clear separation between Server Components (for SEO and data fetching) and Client Components (for interactivity).

#### Server Components (SEO & Metadata)

Server components handle metadata generation, SEO optimization, and initial data fetching.

**Example: Dog Detail Page (Slug-based routing)**
```javascript
// src/app/dogs/[slug]/page.jsx
import { getAnimalBySlug, getAllAnimals } from '@/services/animalsService';
import { generatePetSchema } from '@/utils/schema';
import DogDetailClient from './DogDetailClient';

// Static generation for popular dogs
export async function generateStaticParams() {
  const dogs = await getAllAnimals();
  return dogs.slice(0, 50).map(dog => ({
    slug: dog.slug
  }));
}

// Dynamic metadata generation for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dog = await getAnimalBySlug(slug);
  
  return {
    title: `${dog.name} - ${dog.standardized_breed} Available for Adoption`,
    description: generateSEODescription(dog),
    openGraph: {
      title: `${dog.name} - Available for Adoption`,
      description: dog.description,
      images: [{
        url: dog.primary_image_url,
        width: 800,
        height: 600,
        alt: `Photo of ${dog.name}`
      }],
      type: 'article',
      article: {
        publishedTime: dog.created_at,
        section: 'Pet Adoption',
        tags: ['rescue dogs', dog.standardized_breed, dog.organization.city]
      }
    },
    twitter: {
      card: dog.primary_image_url ? 'summary_large_image' : 'summary',
      title: `${dog.name} - Available for Adoption`,
      description: truncateDescription(dog.description, 200)
    },
    alternates: {
      canonical: `https://www.rescuedogs.me/dogs/${slug}`
    }
  };
}

export default async function DogPage({ params }) {
  const { slug } = await params;
  const dog = await getAnimalBySlug(slug);
  
  // Server component passes data to client component
  return <DogDetailClient dog={dog} />;
}
```

#### Client Components (Interactivity)

Client components handle user interactions, state management, and dynamic UI updates.

**Example: Dog Detail Client Component**
```javascript
'use client';

import { useState, useEffect } from 'react';
import { HeroImageWithBlurredBackground } from '@/components/ui/HeroImageWithBlurredBackground';
import { RelatedDogsSection } from '@/components/dogs/RelatedDogsSection';
import { MobileStickyBar } from '@/components/ui/MobileStickyBar';
import { DogDescription } from '@/components/dogs/DogDescription';
import { ShareButton } from '@/components/ui/ShareButton';
import { useShare } from '@/hooks/useShare';

export default function DogDetailClient({ dog }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { share, canShare } = useShare();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with blurred background */}
      <HeroImageWithBlurredBackground
        src={dog.primary_image_url}
        alt={`Photo of ${dog.name}`}
        onLoad={() => setIsImageLoaded(true)}
      />
      
      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dog information */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{dog.name}</h1>
            <DogDescription dog={dog} />
          </div>
          
          {/* Action buttons */}
          <div className="space-y-4">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => window.open(dog.adoption_url, '_blank')}
            >
              Contact Organization
            </Button>
            {canShare && (
              <ShareButton
                title={`Check out ${dog.name} for adoption!`}
                text={dog.description}
                url={window.location.href}
              />
            )}
          </div>
        </div>
        
        {/* Related dogs from same organization */}
        <RelatedDogsSection 
          organizationId={dog.organization_id}
          currentDogId={dog.id}
        />
      </div>
      
      {/* Mobile sticky action bar */}
      <MobileStickyBar dog={dog} />
    </div>
  );
}
```

### Component Architecture Patterns

#### Compound Components Pattern
Components are designed as composable units for flexibility:

```javascript
// Filter system with compound components
<DogFilters onFiltersChange={handleFiltersChange}>
  <DogFilters.Search placeholder="Search by name or breed..." />
  <DogFilters.BreedSelect options={breeds} />
  <DogFilters.AgeRange min={0} max={15} />
  <DogFilters.SizeFilter sizes={['small', 'medium', 'large']} />
  <DogFilters.LocationFilter countries={countries} />
</DogFilters>
```

#### Custom Hooks Pattern
Business logic is extracted into reusable hooks:

```javascript
// src/hooks/useFilteredDogs.js
export function useFilteredDogs(initialDogs = []) {
  const [dogs, setDogs] = useState(initialDogs);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  
  const filteredDogs = useMemo(() => {
    if (!Object.keys(filters).length) return dogs;
    
    return dogs.filter(dog => {
      if (filters.breed && dog.breed !== filters.breed) return false;
      if (filters.age && !matchesAgeRange(dog.age, filters.age)) return false;
      if (filters.size && dog.size !== filters.size) return false;
      if (filters.location && !dog.location.includes(filters.location)) return false;
      return true;
    });
  }, [dogs, filters]);
  
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return { 
    dogs: filteredDogs, 
    filters, 
    updateFilter, 
    loading,
    totalCount: dogs.length,
    filteredCount: filteredDogs.length
  };
}
```

## Component Library & Design System

### Design Tokens

The application uses a warm, inviting color palette with comprehensive theming support.

**Color System with Dark Mode Support**
```css
:root {
  /* Light mode - warm, inviting palette */
  --background: 31 100% 98%;        /* #FDFBF7 warm off-white */
  --foreground: 222.2 84% 4.9%;     /* Dark text */
  --card: 31 100% 99%;               /* Slightly warmer card background */
  --primary: 221 83% 53%;            /* Primary blue */
  --orange-600: 25 95% 53%;          /* Primary orange for CTAs */
  --orange-700: 21 90% 48%;          /* Darker orange for hover */
  
  /* Blue-tinted shadows for depth */
  --shadow-blue-sm: 0 1px 3px rgba(59, 130, 246, 0.1);
  --shadow-blue-md: 0 4px 6px rgba(59, 130, 246, 0.07);
  --shadow-blue-lg: 0 10px 15px rgba(59, 130, 246, 0.1);
  
  /* Responsive typography with clamp() */
  --font-size-hero: clamp(2.25rem, 4vw + 1rem, 3.75rem);
  --font-size-title: clamp(2rem, 3vw + 1rem, 3rem);
  --font-size-body: 1rem;
  
  /* Animation tokens */
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

.dark {
  --background: 222.2 84% 4.9%;      /* Dark background */
  --foreground: 210 40% 98%;         /* Light text */
  --card: 222.2 84% 8%;              /* Dark card background */
  /* ... dark mode overrides */
}
```

### Component Categories

#### Core UI Components (shadcn/ui)
- **Button**: `button.tsx` - Multiple variants (default, outline, ghost, destructive)
- **Card**: `card.tsx` - Content containers with consistent styling
- **Input**: `input.tsx` - Form inputs with validation states
- **Badge**: `badge.tsx` - Status indicators and tags
- **Sheet**: `sheet.tsx` - Mobile-friendly drawer components
- **Alert**: `alert.tsx` - Notification and message display
- **Select**: `select.tsx` - Accessible dropdown menus
- **Toast**: `Toast.tsx` - Non-blocking notifications

#### Specialized Components
- **LazyImage**: `LazyImage.tsx` - Progressive image loading with IntersectionObserver
- **AnimatedCounter**: `AnimatedCounter.tsx` - Scroll-triggered number animations
- **CountryFlag**: `CountryFlag.tsx` - SVG country flags with error boundaries
- **ThemeToggle**: `ThemeToggle.tsx` - Dark/light mode switcher
- **ShareButton**: `ShareButton.tsx` - Native Web Share API integration
- **HeroImageWithBlurredBackground**: Background blur effect for hero images
- **MobileStickyBar**: `MobileStickyBar.tsx` - Mobile-specific action bar
- **ProgressiveImage**: `ProgressiveImage.tsx` - Multi-stage image loading

#### Business Components
- **DogCard**: `DogCard.jsx` - Responsive dog display cards
- **OrganizationCard**: `OrganizationCard.jsx` - Organization display with statistics
- **FilterControls**: `FilterControls.jsx` - Advanced search and filtering
- **RelatedDogsSection**: `RelatedDogsSection.jsx` - Related dogs carousel
- **HeroSection**: `HeroSection.jsx` - Homepage hero with animated statistics
- **TrustSection**: `TrustSection.jsx` - Trust indicators and social proof
- **DogDescription**: `DogDescription.jsx` - Rich text dog descriptions

### Component Patterns

#### Lazy Loading with Progressive Enhancement
```javascript
// src/components/ui/LazyImage.tsx
import { useLazyImage } from '@/hooks/useLazyImage';

export function LazyImage({ 
  src, 
  alt, 
  priority = false,
  sizes,
  className 
}: LazyImageProps) {
  const {
    isLoaded,
    isInView,
    hasError,
    imgRef,
    handlers
  } = useLazyImage(src, { priority });
  
  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {/* Main image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...handlers}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <span className="text-gray-500">Image unavailable</span>
        </div>
      )}
    </div>
  );
}
```

## State Management

### React Hooks & Context API

The application uses React's built-in state management without external libraries.

#### Theme Management (Safe localStorage Usage)
The only use of localStorage is for theme persistence, handled safely with SSR compatibility:

```javascript
// src/components/providers/ThemeProvider.jsx
'use client';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Safe localStorage access after mount
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### Application State Management
All application state is managed through React hooks and props - no localStorage/sessionStorage:

```javascript
// Filter state managed in memory
export function DogsPageClient() {
  const [filters, setFilters] = useState({
    breed: '',
    age: '',
    size: '',
    location: ''
  });
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // URL parameters for shareable filters
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Sync filters with URL
  useEffect(() => {
    const urlFilters = {
      breed: searchParams.get('breed') || '',
      age: searchParams.get('age') || '',
      size: searchParams.get('size') || '',
      location: searchParams.get('location') || ''
    };
    setFilters(urlFilters);
  }, [searchParams]);
  
  // Update URL when filters change
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/dogs?${params.toString()}`);
  };
  
  return (
    <DogFilters filters={filters} onFiltersChange={updateFilters}>
      <DogsGrid dogs={dogs} loading={loading} />
    </DogFilters>
  );
}
```

## Routing & Navigation

### Slug-based Dynamic Routing

The application uses SEO-friendly slug-based routing for both dogs and organizations:

```
/dogs/bella-labrador-mix-turkey         # Individual dog page
/organizations/pets-in-turkey            # Organization page
```

#### Static Generation with ISR
```javascript
// src/app/dogs/[slug]/page.jsx
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  // Pre-generate popular dog pages at build time
  const dogs = await getAllAnimals();
  return dogs
    .slice(0, 50)
    .map(dog => ({ slug: dog.slug }));
}
```

#### Organization Routing
```javascript
// src/app/organizations/[slug]/page.jsx
export async function generateStaticParams() {
  const orgs = await getOrganizations();
  return orgs.map(org => ({ slug: org.slug }));
}

export default async function OrganizationPage({ params }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  const dogs = await getDogsByOrganization(org.id);
  
  return <OrganizationDetailClient organization={org} dogs={dogs} />;
}
```

### Navigation Components

#### Responsive Header with Navigation
```javascript
// src/components/layout/Header.jsx
export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Find Dogs', href: '/dogs' },
    { name: 'Organizations', href: '/organizations' },
    { name: 'About', href: '/about' }
  ];
  
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">
            Rescue Dogs
          </Link>
          
          <div className="flex items-center gap-8">
            {navigation.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors",
                  pathname === item.href 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.name}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile navigation */}
        <MobileNav 
          navigation={navigation}
          isOpen={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      </nav>
    </header>
  );
}
```

## Performance Optimization

### Image Optimization with Cloudflare Images

The application uses Cloudflare R2 and Cloudflare Images for optimized image delivery:

```javascript
// src/utils/imageUtils.js
const R2_CUSTOM_DOMAIN = 'images.rescuedogs.me';

export function getOptimizedImage(url, preset = 'catalog', options = {}) {
  if (!url || !isR2Url(url)) return url;
  
  const presets = {
    catalog: { width: 400, height: 300, fit: 'cover', quality: 'auto' },
    hero: { width: 800, height: 600, fit: 'contain', quality: 'auto' },
    thumbnail: { width: 200, height: 200, fit: 'cover', quality: 60 },
    mobile: { width: 320, height: 240, fit: 'cover', quality: 70 }
  };
  
  const config = { ...presets[preset], ...options };
  
  // Network-aware quality adjustment
  if (navigator.connection?.effectiveType === '2g') {
    config.quality = Math.min(config.quality, 60);
  }
  
  const params = `w=${config.width},h=${config.height},fit=${config.fit},quality=${config.quality}`;
  const imagePath = url.replace(`https://${R2_CUSTOM_DOMAIN}/`, '');
  
  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${params}/${imagePath}`;
}
```

### Component-level Optimizations

#### React.memo for Expensive Components
```javascript
const DogCard = memo(function DogCard({ dog, onClick }) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(dog.slug)}
    >
      <LazyImage 
        src={getOptimizedImage(dog.primary_image_url, 'catalog')}
        alt={`Photo of ${dog.name}`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <CardContent>
        <h3 className="font-semibold text-lg">{dog.name}</h3>
        <p className="text-muted-foreground">{dog.breed}</p>
        <Badge>{dog.age_text}</Badge>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return prevProps.dog.id === nextProps.dog.id;
});
```

#### Virtual Scrolling for Large Lists
```javascript
// Using intersection observer for infinite scroll
export function DogsGrid({ initialDogs }) {
  const [dogs, setDogs] = useState(initialDogs);
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreDogs();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [page]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dogs.map(dog => (
        <DogCard key={dog.id} dog={dog} />
      ))}
      <div ref={loadMoreRef} className="h-10" />
    </div>
  );
}
```

## Security Implementation

### XSS Prevention

All user-generated content is sanitized before rendering:

```javascript
// src/utils/security.js
import DOMPurify from 'dompurify';

export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });
}

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
}

// URL validation for external links
export function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
```

### Content Security Policy

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rescuedogs.me',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
};
```

## Accessibility Features

### WCAG 2.1 AA Compliance

The application implements comprehensive accessibility features:

#### Semantic HTML & ARIA
```javascript
<main role="main" aria-label="Dog listings">
  <section aria-label="Search and filters">
    <input
      type="search"
      aria-label="Search for dogs"
      aria-describedby="search-help"
      aria-invalid={errors.search ? "true" : "false"}
      aria-errormessage="search-error"
    />
    <span id="search-help" className="sr-only">
      Enter keywords to find rescue dogs
    </span>
  </section>
  
  <section 
    aria-label="Search results"
    aria-live="polite"
    aria-busy={loading}
  >
    <h2 className="sr-only">Available dogs</h2>
    {dogs.map(dog => (
      <article
        key={dog.id}
        aria-label={`${dog.name}, ${dog.breed}`}
      >
        {/* Dog card content */}
      </article>
    ))}
  </section>
</main>
```

#### Keyboard Navigation
```javascript
// Focus management and keyboard interactions
export function DogCard({ dog, onSelect }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(dog);
    }
  };
  
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect(dog)}
      className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Card content */}
    </div>
  );
}
```

#### Skip Links
```javascript
// src/app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <Header />
          <main id="main-content">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Testing Strategy

### Comprehensive Test Suite

**Current Coverage**: 2,598 tests across 201 test suites
- Unit Tests: Component logic and utilities
- Integration Tests: User workflows and API interactions
- E2E Tests: Critical user journeys
- Accessibility Tests: WCAG compliance
- Performance Tests: Bundle size and render performance
- Visual Regression: Dark mode and responsive design

#### Test Organization
```
src/__tests__/
├── accessibility/           # WCAG compliance, keyboard nav, screen readers
├── bug-fixes/              # Regression tests for fixed bugs
├── critical/               # Critical functionality tests
├── cross-browser/          # Browser compatibility
├── cta/                    # Call-to-action optimization
├── dark-mode/              # Dark mode visual consistency
├── e2e/                    # End-to-end user journeys
├── error-handling/         # Error boundaries and fallbacks
├── integration/            # API and service integration
├── mobile/                 # Mobile-specific functionality
├── performance/            # Performance benchmarks
├── regression/             # Regression prevention
├── responsive/             # Responsive design breakpoints
├── routing/                # Navigation and routing
├── security/               # XSS prevention, sanitization
├── seo/                    # Metadata and structured data
└── visual-consistency/     # Theme and styling consistency
```

#### Example Test Patterns

**Component Testing**
```javascript
// src/components/dogs/__tests__/DogCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import DogCard from '../DogCard';

describe('DogCard', () => {
  const mockDog = {
    id: 1,
    slug: 'bella-labrador-mix',
    name: 'Bella',
    breed: 'Labrador Mix',
    age_text: '3 years',
    primary_image_url: 'https://images.rescuedogs.me/bella.jpg'
  };

  it('renders dog information correctly', () => {
    render(<DogCard dog={mockDog} />);
    
    expect(screen.getByText('Bella')).toBeInTheDocument();
    expect(screen.getByText('Labrador Mix')).toBeInTheDocument();
    expect(screen.getByText('3 years')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    const onSelect = jest.fn();
    render(<DogCard dog={mockDog} onSelect={onSelect} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(onSelect).toHaveBeenCalledWith(mockDog);
  });

  it('applies hover effects on mouse interaction', () => {
    render(<DogCard dog={mockDog} />);
    
    const card = screen.getByRole('button');
    fireEvent.mouseEnter(card);
    
    expect(card).toHaveClass('hover:shadow-lg');
  });
});
```

**Accessibility Testing**
```javascript
// src/__tests__/accessibility/wcag-compliance.test.js
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import DogsPage from '@/app/dogs/page';

expect.extend(toHaveNoViolations);

describe('WCAG Compliance', () => {
  it('has no accessibility violations on dogs page', async () => {
    const { container } = render(<DogsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains proper heading hierarchy', () => {
    render(<DogsPage />);
    
    const headings = screen.getAllByRole('heading');
    const levels = headings.map(h => parseInt(h.tagName[1]));
    
    // Ensure no skipped heading levels
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
    }
  });
});
```

**Performance Testing**
```javascript
// src/__tests__/performance/optimization.test.js
describe('Performance Optimization', () => {
  it('lazy loads images efficiently', () => {
    const mockObserver = jest.fn();
    global.IntersectionObserver = jest.fn(() => ({
      observe: mockObserver,
      disconnect: jest.fn()
    }));
    
    render(<LazyImage src="test.jpg" alt="Test" />);
    expect(mockObserver).toHaveBeenCalled();
  });

  it('renders large lists without performance degradation', () => {
    const largeDogList = Array(1000).fill(null).map((_, i) => ({
      id: i,
      name: `Dog ${i}`,
      breed: 'Mixed',
      age_text: '2 years'
    }));
    
    const start = performance.now();
    render(<DogsGrid dogs={largeDogList} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100); // Should render in under 100ms
  });
});
```

## Mobile Experience

### Mobile-First Responsive Design

The application is built with a mobile-first approach using Tailwind CSS:

#### Responsive Breakpoints
```javascript
// src/constants/breakpoints.ts
export const BREAKPOINTS = {
  sm: 640,   // Small devices
  md: 768,   // Tablets
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
  '2xl': 1536 // Extra large
};
```

#### Mobile-Optimized Components

**Mobile Filter Drawer**
```javascript
// src/components/filters/MobileFilterDrawer.jsx
export function MobileFilterDrawer({ filters, onFiltersChange, isOpen, onClose }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Filter Dogs</SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto py-4 space-y-6">
          <FilterSection 
            title="Breed"
            value={filters.breed}
            onChange={(value) => onFiltersChange({ ...filters, breed: value })}
            options={breeds}
          />
          {/* More filter sections */}
        </div>
        
        <div className="sticky bottom-0 bg-background p-4 border-t">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onClose} className="flex-1 bg-orange-600">
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Mobile Sticky Bar**
```javascript
// src/components/ui/MobileStickyBar.tsx
export function MobileStickyBar({ dog }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden z-40">
      <div className="flex gap-3 max-w-md mx-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleFavorite(dog)}
        >
          <Heart className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          className="flex-1 bg-orange-600 hover:bg-orange-700"
          onClick={() => window.open(dog.adoption_url, '_blank')}
        >
          Contact
        </Button>
      </div>
    </div>
  );
}
```

#### Touch-Optimized Interactions
```css
/* Touch target minimum 44px for accessibility */
.touch-target {
  @apply min-h-[44px] min-w-[44px] touch-manipulation;
}

/* Smooth scrolling with momentum */
.mobile-scroll {
  @apply overflow-y-auto overscroll-contain 
         [-webkit-overflow-scrolling:touch]
         [scroll-behavior:smooth];
}

/* Disable hover effects on touch devices */
@media (hover: none) {
  .hover\:shadow-lg:hover {
    box-shadow: none;
  }
}
```

## SEO & Metadata

### Dynamic Metadata Generation

Each page generates optimized metadata for search engines and social sharing:

```javascript
// src/app/dogs/[slug]/page.jsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dog = await getAnimalBySlug(slug);
  
  // Quality-focused description generation
  const description = generateSEODescription(dog);
  
  return {
    title: `${dog.name} - ${dog.breed} Available for Adoption`,
    description,
    keywords: [
      'dog adoption',
      dog.breed,
      'rescue dog',
      dog.organization.city,
      'pet adoption'
    ].join(', '),
    
    openGraph: {
      title: `${dog.name} - Available for Adoption`,
      description: truncateDescription(description, 300),
      images: [{
        url: dog.primary_image_url,
        width: 1200,
        height: 630,
        alt: `Photo of ${dog.name}, a ${dog.breed}`
      }],
      type: 'article',
      article: {
        publishedTime: dog.created_at,
        section: 'Pet Adoption',
        tags: ['rescue dogs', dog.breed, dog.organization.name]
      }
    },
    
    twitter: {
      card: 'summary_large_image',
      title: `${dog.name} - Available for Adoption`,
      description: truncateDescription(description, 200),
      images: [dog.primary_image_url]
    },
    
    alternates: {
      canonical: `https://www.rescuedogs.me/dogs/${slug}`
    }
  };
}
```

### Structured Data (JSON-LD)

```javascript
// src/utils/schema.js
export function generatePetSchema(dog) {
  return {
    "@context": "https://schema.org",
    "@type": "Animal",
    "name": dog.name,
    "species": "Dog",
    "breed": dog.standardized_breed || dog.breed,
    "age": dog.age_text,
    "description": dog.description,
    "image": dog.primary_image_url,
    "availableForAdoption": true,
    "location": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": dog.organization.country,
        "addressLocality": dog.organization.city
      }
    },
    "provider": {
      "@type": "AnimalShelter",
      "name": dog.organization.name,
      "url": dog.organization.website
    }
  };
}
```

### Dynamic Sitemap Generation

```javascript
// src/app/sitemap.xml/route.js
export async function GET() {
  const dogs = await getAllAnimalsForSitemap();
  const organizations = await getOrganizations();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>https://www.rescuedogs.me</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      ${dogs.map(dog => `
        <url>
          <loc>https://www.rescuedogs.me/dogs/${dog.slug}</loc>
          <lastmod>${dog.updated_at}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
      ${organizations.map(org => `
        <url>
          <loc>https://www.rescuedogs.me/organizations/${org.slug}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `).join('')}
    </urlset>`;
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
```

## Development Workflow

### Test-Driven Development (TDD)

The project strictly follows TDD principles:

1. **Write failing test first**
```javascript
// Write test before implementation
describe('NewFeature', () => {
  it('should handle user interaction', () => {
    render(<NewFeature />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

2. **Implement minimal code to pass**
```javascript
export function NewFeature() {
  const [clicked, setClicked] = useState(false);
  
  return (
    <div>
      <button onClick={() => setClicked(true)}>
        Click me
      </button>
      {clicked && <p>Success</p>}
    </div>
  );
}
```

3. **Refactor and optimize**
```javascript
// Add error handling, accessibility, performance
export const NewFeature = memo(function NewFeature() {
  const [clicked, setClicked] = useState(false);
  
  const handleClick = useCallback(() => {
    setClicked(true);
  }, []);
  
  return (
    <div>
      <button 
        onClick={handleClick}
        aria-pressed={clicked}
      >
        Click me
      </button>
      {clicked && (
        <p role="status" aria-live="polite">
          Success
        </p>
      )}
    </div>
  );
});
```

### Code Quality Standards

#### Pre-commit Checks
```bash
# Required checks before any commit
npm test                    # Run all 2,598 tests
npm run build              # Verify production build
npm run lint               # ESLint validation
npm run type-check         # TypeScript checking
npm run check:duplicates   # Prevent duplicate files
```

#### Component Development Checklist
- [ ] Test written and passing
- [ ] Component is accessible (ARIA, keyboard nav)
- [ ] Responsive design implemented
- [ ] Dark mode supported
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] Performance optimized (memo, lazy loading)
- [ ] TypeScript types defined
- [ ] Documentation updated

## Build & Deployment

### Production Build Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rescuedogs.me',
      },
    ],
  },
  
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.rescuedogs.me
NEXT_PUBLIC_SITE_URL=https://www.rescuedogs.me
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me
NEXT_PUBLIC_ENVIRONMENT=production
```

### Deployment Process

```bash
# Build and analyze
npm run build
npm run analyze  # Check bundle size

# Production deployment (Vercel)
vercel --prod

# Docker deployment
docker build -t rescue-dogs-frontend .
docker run -p 3000:3000 rescue-dogs-frontend
```

## Error Handling

### Error Boundaries

Multiple levels of error boundaries provide graceful fallbacks:

```javascript
// src/components/error/ErrorBoundary.jsx
'use client';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Something went wrong
              </h2>
              <p className="text-muted-foreground mb-6">
                We're sorry, but we encountered an error loading this content.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => this.setState({ hasError: false })}
                >
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling

```javascript
// src/services/animalsService.js
export async function getAnimals(filters = {}) {
  try {
    const response = await fetch(`${API_URL}/api/animals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch animals: ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new Error('Unable to load dogs. Please check your connection.');
  }
}
```

## Performance Monitoring

### Core Web Vitals Tracking

```javascript
// src/app/layout.js
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-inter`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Performance Monitoring

```javascript
// src/utils/performance.js
export function measurePerformance(metricName, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  // Log to analytics
  if (window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: metricName,
      value: Math.round(duration),
      event_category: 'Performance',
    });
  }
  
  return result;
}

// Usage
const dogs = measurePerformance('fetch_dogs', () => {
  return fetchDogs(filters);
});
```

## Advanced Features

### Animated Statistics

The homepage features scroll-triggered animated counters:

```javascript
// src/components/ui/AnimatedCounter.tsx
export function AnimatedCounter({ value, duration = 2000, label }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef(null);
  
  useEffect(() => {
    if (!isInView) return;
    
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }
    
    // Easing function for smooth animation
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setDisplayValue(Math.round(value * easeOutCubic(progress)));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, value, duration]);
  
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
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <span 
      ref={elementRef}
      role="status"
      aria-live="polite"
      aria-label={`${label}: ${value}`}
    >
      {displayValue.toLocaleString()}
    </span>
  );
}
```

### Progressive Image Loading

Multi-stage image loading for optimal user experience:

```javascript
// src/hooks/useLazyImage.ts
export function useLazyImage(src: string, options: UseLazyImageOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(options.priority || false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  // Generate progressive URLs
  const progressiveUrls = useMemo(() => {
    if (!options.enableProgressiveLoading) return {};
    
    return {
      lowQuality: getOptimizedImage(src, 'thumbnail', { quality: 20 }),
      blurPlaceholder: getOptimizedImage(src, 'thumbnail', { quality: 10, blur: 20 })
    };
  }, [src, options.enableProgressiveLoading]);
  
  useEffect(() => {
    if (options.priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.01 
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [options.priority]);
  
  return {
    isLoaded,
    isInView,
    hasError,
    imgRef,
    progressiveUrls,
    handlers: {
      onLoad: () => setIsLoaded(true),
      onError: () => setHasError(true)
    }
  };
}
```

### Share Functionality

Native Web Share API integration:

```javascript
// src/hooks/useShare.ts
export function useShare() {
  const [canShare, setCanShare] = useState(false);
  
  useEffect(() => {
    setCanShare(
      typeof navigator !== 'undefined' && 
      'share' in navigator &&
      // Check if we're on HTTPS (required for Web Share API)
      window.location.protocol === 'https:'
    );
  }, []);
  
  const share = async ({ title, text, url }) => {
    if (!canShare) {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      return;
    }
    
    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      if (error.name !== 'AbortError') {
        // User didn't cancel, actual error
        console.error('Share failed:', error);
        toast.error('Unable to share');
      }
    }
  };
  
  return { share, canShare };
}
```

## Code Quality & Standards

### TypeScript Integration

The codebase uses TypeScript for type safety with gradual migration:

```typescript
// src/types/dog.ts
export interface Dog {
  id: number;
  slug: string;
  name: string;
  breed: string;
  standardized_breed?: string;
  age_text: string;
  age_years?: number;
  description?: string;
  primary_image_url: string;
  adoption_url: string;
  size?: 'small' | 'medium' | 'large';
  good_with_children?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  organization_id: number;
  organization: Organization;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  slug: string;
  name: string;
  website: string;
  city: string;
  country: string;
  adoption_fee?: AdoptionFee;
  social_media?: SocialMedia;
}

export interface DogFilters {
  breed?: string;
  age?: string;
  size?: 'small' | 'medium' | 'large';
  location?: string;
  search?: string;
  organization?: string;
}
```

### Component Prop Types

```typescript
// src/components/dogs/DogCard.tsx
interface DogCardProps {
  dog: Dog;
  onSelect?: (dog: Dog) => void;
  priority?: boolean;
  className?: string;
  showOrganization?: boolean;
}

export const DogCard = memo<DogCardProps>(({ 
  dog, 
  onSelect,
  priority = false,
  className,
  showOrganization = true
}) => {
  // Component implementation
});
```

### Code Style Guidelines

- **Components**: PascalCase (`DogCard`, `FilterControls`)
- **Hooks**: camelCase with `use` prefix (`useFilteredDogs`, `useLazyImage`)
- **Utilities**: camelCase (`sanitizeText`, `getOptimizedImage`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `BREAKPOINTS`)
- **File naming**: kebab-case for files, PascalCase for components

## Future Considerations

### Planned Enhancements

1. **Progressive Web App (PWA)**
   - Service worker for offline functionality
   - Push notifications for new dogs
   - Installable app experience

2. **Advanced Search**
   - AI-powered dog matching
   - Visual similarity search
   - Breed recommendations

3. **User Features**
   - Favorite dogs (with account)
   - Search alerts
   - Application tracking

4. **Performance**
   - Edge caching with Cloudflare Workers
   - Streaming SSR
   - React Server Components optimization

5. **Internationalization**
   - Multi-language support
   - Localized content
   - Regional organization integration

### Technical Debt & Improvements

1. **Complete TypeScript Migration**
   - Convert remaining JavaScript files
   - Strict type checking
   - API type generation

2. **Component Library**
   - Storybook documentation
   - Visual regression testing
   - Component playground

3. **Testing Enhancements**
   - Visual regression with Percy
   - Performance regression tests
   - Mutation testing

4. **Architecture Evolution**
   - Micro-frontends for scaling
   - GraphQL API integration
   - Real-time updates with WebSockets

---

This comprehensive frontend architecture documentation reflects the current state of the Rescue Dog Aggregator application, built with Next.js 15's App Router, React 18, and modern web technologies. The architecture emphasizes performance, accessibility, security, and maintainability through comprehensive testing (2,598 tests), clean code patterns, and industry best practices. The mobile-first, responsive design ensures an optimal experience across all devices while maintaining WCAG 2.1 AA compliance for accessibility.