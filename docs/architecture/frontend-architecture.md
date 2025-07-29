# Frontend Architecture Guide - Rescue Dog Aggregator

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Component Library & Design System](#component-library--design-system)
- [Security Implementation](#security-implementation)
- [Performance Optimization](#performance-optimization)
- [Accessibility Features](#accessibility-features)
- [State Management](#state-management)
- [Routing & Navigation](#routing--navigation)
- [Testing Strategy](#testing-strategy)
- [Development Workflow](#development-workflow)
- [Build & Deployment](#build--deployment)
- [Error Handling](#error-handling)
- [Performance Monitoring](#performance-monitoring)
- [Advanced Features](#advanced-features)
- [Mobile Experience](#mobile-experience)
- [SEO & Metadata](#seo--metadata)
- [Code Quality & Standards](#code-quality--standards)
- [Future Considerations](#future-considerations)

## Overview

The Rescue Dog Aggregator frontend is a modern web application built with **Next.js 15** and the **App Router** architecture. It implements React patterns with a focus on **performance**, **security**, **accessibility**, and **maintainability**. The architecture follows a **test-driven development (TDD)** approach.

### Key Metrics
- **Framework**: Next.js 15 with App Router
- **Test Coverage**: 1,897 tests (1,896 passing, 1 failed)
- **Component Count**: 45+ reusable components
- **Performance**: Core Web Vitals optimized
- **Accessibility**: WCAG 2.1 AA compliant
- **Security**: XSS prevention and content sanitization

## Technology Stack

### Core Technologies
- **Framework**: Next.js 15.3.0 with App Router
- **Language**: TypeScript/JavaScript (mixed codebase)
- **Styling**: Tailwind CSS 3.3.2 with custom design system
- **Component Library**: shadcn/ui with Radix UI primitives
- **State Management**: React hooks with component-level state
- **Animation**: Framer Motion 12.18.1 for complex animations
- **Icons**: Heroicons 2.2.0 + Lucide React 0.487.0

### Development Tools
- **Testing**: Jest 29.7.0 + React Testing Library 16.3.0
- **Build**: Next.js built-in bundling and optimization
- **Linting**: ESLint 9.28.0 with Next.js config
- **Image Optimization**: Cloudflare R2 + Images with comprehensive security validation
- **Accessibility Testing**: jest-axe 10.0.0

### UI Framework
- **Base**: Tailwind CSS with custom color scheme
- **Components**: shadcn/ui components with Radix UI
- **Variants**: class-variance-authority for component variants
- **Utilities**: clsx and tailwind-merge for conditional classes
- **Animations**: tailwindcss-animate for smooth transitions

## Architecture Patterns

### Server/Client Component Separation

The application uses **Server Components** for SEO and metadata generation, while **Client Components** handle interactivity and user state.

#### Server Components (SEO Optimized)

**Purpose**: Generate dynamic metadata, improve SEO, and handle server-side rendering.

**Key Files**:
- `src/app/dogs/[id]/page.jsx` - Dog detail metadata generation
- `src/app/organizations/[id]/page.jsx` - Organization metadata generation
- `src/app/layout.js` - Root layout with global metadata

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
    twitter: {
      card: 'summary_large_image',
      title: `${dog.name} - Rescue Dog`,
      description: dog.description,
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
- `src/components/home/HeroSection.jsx` - Animated hero section
- `src/app/HomeClient.jsx` - Homepage client interactions

**Implementation Pattern**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

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
  if (!dog) return <EmptyState message="Dog not found" />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Interactive UI components */}
      <HeroImageWithBlurredBackground dog={dog} />
      <RelatedDogsSection organizationId={dog.organization_id} currentDogId={dog.id} />
      <MobileStickyBar dog={dog} />
    </div>
  );
}
```

### Component Architecture Patterns

#### Compound Components Pattern
```javascript
// Filter system with compound components
<DogFilters onFiltersChange={handleFiltersChange}>
  <DogFilters.Search />
  <DogFilters.Breed />
  <DogFilters.Age />
  <DogFilters.Size />
  <DogFilters.Location />
</DogFilters>
```

#### Render Props Pattern
```javascript
// Error boundary with render props
<ErrorBoundary fallback={({ error, retry }) => (
  <div className="text-center p-8">
    <h3>Something went wrong</h3>
    <button onClick={retry}>Try again</button>
  </div>
)}>
  <DogsList />
</ErrorBoundary>
```

#### Hook-based State Management
```javascript
// Custom hooks for complex state
const useDogFilters = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [filteredDogs, setFilteredDogs] = useState([]);
  
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return { filters, filteredDogs, updateFilter };
};
```

## Component Library & Design System

### Design Tokens

**Color System**: Custom warm color palette with dark mode support
```css
:root {
  /* Light mode - warm palette */
  --background: 31 100% 98%; /* #FDFBF7 warm off-white */
  --foreground: 222.2 84% 4.9%;
  --card: 31 100% 99%;
  --primary: 221 83% 53%;
  --orange-600: 234 88% 47%; /* Primary orange */
  --orange-700: 221 83% 41%; /* Darker orange */
  
  /* Shadows with blue tint for premium feel */
  --shadow-blue-md: 0 4px 6px rgba(59, 130, 246, 0.07);
  --shadow-blue-lg: 0 10px 15px rgba(59, 130, 246, 0.1);
}

.dark {
  /* Dark mode variants */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
}
```

**Typography Scale**: Responsive typography with custom font loading
```css
.text-hero {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.1;
  font-weight: 700;
}

.text-body {
  font-size: clamp(1rem, 2vw, 1.125rem);
  line-height: 1.6;
}
```

### Component Categories

#### Base Components (shadcn/ui)
- **Button**: `src/components/ui/button.tsx` - Primary, secondary, outline variants
- **Card**: `src/components/ui/card.tsx` - Content containers with shadows
- **Input**: `src/components/ui/input.tsx` - Form inputs with validation states
- **Badge**: `src/components/ui/badge.tsx` - Status indicators and tags
- **Alert**: `src/components/ui/alert.tsx` - Notification and message display

#### Layout Components
- **Header**: `src/components/layout/Header.jsx` - Navigation with theme toggle
- **Footer**: `src/components/layout/Footer.jsx` - Site footer with links
- **Layout**: `src/components/layout/Layout.jsx` - Main layout wrapper

#### Specialized Components
- **AnimatedCounter**: `src/components/ui/AnimatedCounter.jsx` - Scroll-triggered counters
- **LazyImage**: `src/components/ui/LazyImage.jsx` - Optimized image loading
- **ThemeToggle**: `src/components/ui/ThemeToggle.jsx` - Dark/light mode switcher
- **CountryFlag**: `src/components/ui/CountryFlag.jsx` - SVG country flags

#### Business Logic Components
- **DogCard**: `src/components/dogs/DogCard.jsx` - Dog display cards
- **FilterControls**: `src/components/dogs/FilterControls.jsx` - Search and filtering
- **RelatedDogsSection**: `src/components/dogs/RelatedDogsSection.jsx` - Related dogs display
- **HeroSection**: `src/components/home/HeroSection.jsx` - Animated hero section

### Component Patterns

#### Variant-based Components
```javascript
// Using class-variance-authority for variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

#### Responsive Component Design
```javascript
// Mobile-first responsive components
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="p-4 md:p-6 lg:p-8">
    <h3 className="text-lg md:text-xl lg:text-2xl font-semibold">
      {dog.name}
    </h3>
  </div>
</div>
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
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
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

export function sanitizeClassName(className) {
  if (!className || typeof className !== 'string') return '';
  
  // Only allow alphanumeric, hyphens, underscores, and spaces
  return className.replace(/[^a-zA-Z0-9\-_\s]/g, '');
}
```

**Usage Pattern**:
```javascript
import { sanitizeText, sanitizeHtml } from '@/utils/security';

// Sanitize all user-generated content
const safeName = sanitizeText(dog.name);
const safeDescription = sanitizeHtml(dog.description);
const safeBreed = sanitizeText(dog.breed);
```

### Content Security Policy

**Next.js configuration** for secure resource loading:
```javascript
// next.config.js
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rescuedogs.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Additional security headers
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
        ],
      },
    ];
  },
};
```

### Development Security

- **No console statements in production** - All logging uses development-only logger
- **Secure external resource handling** - URL validation for all external links
- **Environment-based configurations** - Different security levels for dev/prod
- **Input validation** - All user inputs sanitized before processing

## Performance Optimization

### Image Optimization

**Cloudflare R2 + Images Integration** with advanced security and performance:

```javascript
// src/utils/imageUtils.js - Updated for Cloudflare Images v2.0
export function createTransformationParams(preset = 'catalog', options = {}, isSlowConnection = false) {
  const presets = {
    catalog: { width: 400, height: 300, fit: 'cover', quality: 'auto' },
    hero: { width: 800, height: 600, fit: 'contain', quality: 'auto' },
    thumbnail: { width: 200, height: 200, fit: 'cover', quality: 60 },
    mobile: { width: 320, height: 240, fit: 'cover', quality: 70 }
  };
  
  const config = presets[preset] || presets.catalog;
  const finalConfig = { ...config, ...options };
  
  // Network-aware quality adjustment
  if (isSlowConnection && finalConfig.quality === 'auto') {
    finalConfig.quality = 60;
  }
  
  return `w=${finalConfig.width},h=${finalConfig.height},fit=${finalConfig.fit},quality=${finalConfig.quality}`;
}

export function buildSecureCloudflareUrl(imageUrl, params) {
  if (!imageUrl || !isR2Url(imageUrl)) {
    return imageUrl;
  }
  
  // Comprehensive security validation
  if (!validateImageUrl(imageUrl)) {
    throw new Error('Invalid image path - security validation failed');
  }
  
  // Parameter sanitization for injection prevention
  if (params) {
    const allowedParams = /^[wh]=\d+|fit=(cover|contain|crop|scale-down|fill|pad)|quality=(auto|\d+)$/;
    const paramsList = params.split(',');
    
    for (const param of paramsList) {
      if (!allowedParams.test(param.trim())) {
        throw new Error('Invalid transformation parameters');
      }
    }
  }
  
  if (!params) return imageUrl;
  
  const imagePath = imageUrl.replace(`https://${R2_CUSTOM_DOMAIN}/`, '');
  return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${params}/${imagePath}`;
}

export function getOptimizedImage(url, preset = 'catalog', options = {}, isSlowConnection = false) {
  if (!url) return '/placeholder_dog.svg';
  if (!isR2Url(url)) return url;
  
  // Memoization for performance
  const cacheKey = `${url}:${preset}:${JSON.stringify(options)}:${isSlowConnection}`;
  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey);
  }
  
  try {
    const params = createTransformationParams(preset, options, isSlowConnection);
    const result = buildSecureCloudflareUrl(url, params);
    
    // Cache with size management
    imageUrlCache.set(cacheKey, result);
    if (imageUrlCache.size > 1000) {
      const firstKey = imageUrlCache.keys().next().value;
      imageUrlCache.delete(firstKey);
    }
    
    return result;
  } catch (error) {
    logger.warn('Failed to create optimized image URL', { url, error: error.message });
    return url;
  }
}
```

**Security Features**:
- **Path traversal prevention** - Validates URLs before processing
- **Parameter injection protection** - Sanitizes transformation parameters
- **R2 domain validation** - Only processes trusted domain images
- **Error boundary fallbacks** - Graceful handling of transformation failures

**LazyImage Component** with IntersectionObserver:

```javascript
// src/components/ui/LazyImage.jsx
import { useState, useRef, useEffect } from 'react';

export default function LazyImage({ src, alt, className, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
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
          onError={() => setHasError(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
      {hasError && (
        <div className="bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">Image unavailable</span>
        </div>
      )}
    </div>
  );
}
```

### Component Optimization

**Strategic React.memo** for expensive components:

```javascript
import React, { memo } from 'react';

const DogCard = memo(function DogCard({ dog, onClick }) {
  return (
    <div onClick={() => onClick(dog.id)} className="dog-card">
      <LazyImage src={dog.primary_image_url} alt={dog.name} />
      <h3>{dog.name}</h3>
      <p>{dog.age_text}</p>
    </div>
  );
});

// Only re-render when dog data changes
export default DogCard;
```

**Custom hooks** for performance optimization:

```javascript
// src/hooks/useFilteredDogs.js
import { useMemo } from 'react';

export function useFilteredDogs(dogs, filters) {
  return useMemo(() => {
    if (!dogs || !filters) return dogs;
    
    return dogs.filter(dog => {
      if (filters.breed && !dog.breed.includes(filters.breed)) return false;
      if (filters.age && !matchesAgeRange(dog.age, filters.age)) return false;
      if (filters.size && dog.size !== filters.size) return false;
      return true;
    });
  }, [dogs, filters]);
}
```

### Bundle Optimization

**Code splitting** and lazy loading:

```javascript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
});

// Route-based code splitting (automatic with App Router)
export default function DogsPage() {
  return <DogsPageClient />;
}
```

**Tree shaking** configuration:
```javascript
// package.json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
}
```

## Accessibility Features

### ARIA Compliance

**Comprehensive accessibility implementation** ensures the application works for all users.

**Key Features**:
- **Semantic HTML structure** with proper landmark roles
- **ARIA labels** for all interactive elements
- **Screen reader optimization** with descriptive content
- **Keyboard navigation** support
- **Focus management** and visual indicators

**Implementation Example**:
```javascript
<main role="main" aria-label="Dog listings">
  <section aria-label="Search and filters">
    <input
      type="search"
      aria-label="Search for dogs by name, breed, or location"
      aria-describedby="search-help"
      onKeyDown={handleKeyDown}
    />
    <div id="search-help" className="sr-only">
      Enter keywords to find available rescue dogs
    </div>
  </section>

  <section aria-label="Dog results" aria-live="polite">
    {dogs.map(dog => (
      <article 
        key={dog.id} 
        aria-label={`${dog.name}, ${dog.age_text} old`}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
      >
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

```javascript
// Focus management utilities
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  });
}

// Keyboard event handlers
function handleKeyPress(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleAction();
  }
}
```

**CSS Focus Indicators**:
```css
/* High-contrast focus indicators */
.focus-visible:focus {
  @apply outline-2 outline-blue-500 outline-offset-2;
}

/* Skip links for keyboard users */
.skip-link {
  @apply absolute left-0 top-0 -translate-y-full z-50;
  @apply focus:translate-y-0;
  @apply bg-blue-600 text-white p-2 rounded;
}
```

### Screen Reader Support

**Optimized content** for assistive technologies:

```javascript
// Screen reader announcements
export function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Usage in components
const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  announceToScreenReader(`Filters updated. Showing ${filteredDogs.length} dogs.`);
};
```

## State Management

### Hook-based State Management

**React hooks** for component-level state management:

```javascript
// Complex state with useReducer
const initialState = {
  dogs: [],
  filters: {},
  loading: false,
  error: null,
  pagination: { page: 1, limit: 20 }
};

function dogsReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        dogs: action.payload,
        pagination: { ...state.pagination, ...action.pagination }
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    default:
      return state;
  }
}

export function useDogs() {
  const [state, dispatch] = useReducer(dogsReducer, initialState);
  
  const fetchDogs = useCallback(async (filters) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await getAnimals(filters);
      dispatch({ type: 'FETCH_SUCCESS', payload: response.dogs });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  }, []);
  
  return { ...state, fetchDogs };
}
```

### Context for Global State

**Theme and global state management**:

```javascript
// src/components/providers/ThemeProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Local Storage Management

**Safe localStorage** with SSR compatibility:

```javascript
// src/utils/storage.js
export class SafeStorage {
  static isAvailable() {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch {
      return false;
    }
  }

  static getItem(key, defaultValue = null) {
    if (!this.isAvailable()) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static setItem(key, value) {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  static removeItem(key) {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Routing & Navigation

### App Router Structure

**Next.js 15 App Router** with nested layouts:

```
src/app/
├── layout.js                 # Root layout
├── page.jsx                  # Homepage
├── dogs/
│   ├── layout.js            # Dogs section layout
│   ├── page.jsx             # Dogs listing page
│   └── [id]/
│       ├── page.jsx         # Individual dog page
│       └── loading.jsx      # Loading UI
├── organizations/
│   ├── page.jsx             # Organizations listing
│   └── [id]/
│       └── page.jsx         # Organization detail
└── about/
    └── page.jsx             # About page
```

**Dynamic routing** with type-safe parameters:

```javascript
// src/app/dogs/[id]/page.jsx
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const dogs = await getPopularDogs();
  return dogs.map(dog => ({ id: dog.id.toString() }));
}

export default async function DogPage({ params }) {
  const dog = await getDogById(params.id);
  
  if (!dog) {
    notFound();
  }
  
  return <DogDetailClient dog={dog} />;
}
```

### Navigation Components

**Responsive navigation** with mobile support:

```javascript
// src/components/layout/Header.jsx
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Find Dogs', href: '/dogs' },
    { name: 'Organizations', href: '/organizations' },
    { name: 'About', href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-primary">
            Rescue Dogs
          </Link>
          
          <div className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
```

### Programmatic Navigation

**Type-safe navigation** with Next.js hooks:

```javascript
import { useRouter, useSearchParams } from 'next/navigation';

export function useNavigationHelpers() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToDog = (dogId) => {
    router.push(`/dogs/${dogId}`);
  };

  const updateSearchParams = (params) => {
    const current = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    router.push(`${pathname}?${current.toString()}`);
  };

  return { navigateToDog, updateSearchParams };
}
```

## Testing Strategy

### Comprehensive Test Suite

**Test Coverage**: 2,427 total tests (2,419 passing, 8 skipped)

**Test Structure**:
```
src/__tests__/
├── accessibility/           # ARIA compliance, keyboard navigation
├── build/                  # Production build validation
├── cross-browser/          # Browser compatibility
├── dark-mode/             # Dark mode functionality
├── error-handling/        # Error boundary testing
├── integration/           # Full workflow testing
├── performance/           # Optimization verification
├── security/              # XSS prevention, sanitization
├── seo/                   # Metadata validation
└── responsive/            # Mobile responsiveness
```

### Test Categories

#### Component Tests
```javascript
// src/components/dogs/__tests__/DogCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import DogCard from '../DogCard';

describe('DogCard Component', () => {
  const mockDog = {
    id: 1,
    name: 'Buddy',
    breed: 'Golden Retriever',
    age_text: '3 years',
    primary_image_url: 'https://example.com/image.jpg'
  };

  it('renders dog information correctly', () => {
    render(<DogCard dog={mockDog} />);
    
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText('3 years')).toBeInTheDocument();
  });

  it('handles image loading states', () => {
    render(<DogCard dog={mockDog} />);
    
    const image = screen.getByAltText('Photo of Buddy');
    expect(image).toHaveAttribute('src', mockDog.primary_image_url);
  });

  it('supports keyboard navigation', () => {
    const onClick = jest.fn();
    render(<DogCard dog={mockDog} onClick={onClick} />);
    
    const card = screen.getByRole('article');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(mockDog.id);
  });
});
```

#### Integration Tests
```javascript
// src/__tests__/integration/dog-search-flow.test.js
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DogsPage from '../../app/dogs/page';

describe('Dog Search Flow', () => {
  it('completes full search and filter workflow', async () => {
    const user = userEvent.setup();
    render(<DogsPage />);
    
    // Search for dogs
    const searchInput = screen.getByLabelText(/search for dogs/i);
    await user.type(searchInput, 'Golden Retriever');
    
    // Apply filters
    const breedFilter = screen.getByLabelText(/breed/i);
    await user.selectOptions(breedFilter, 'Golden Retriever');
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/golden retriever/i)).toBeInTheDocument();
    });
    
    // Click on a dog card
    const dogCard = screen.getByRole('article');
    await user.click(dogCard);
    
    // Verify navigation
    await waitFor(() => {
      expect(window.location.pathname).toMatch(/\/dogs\/\d+/);
    });
  });
});
```

#### Accessibility Tests
```javascript
// src/__tests__/accessibility/a11y.test.jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import DogsPage from '../../app/dogs/page';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<DogsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', () => {
    render(<DogsPage />);
    
    // Test tab navigation
    const firstButton = screen.getByRole('button', { name: /search/i });
    firstButton.focus();
    
    fireEvent.keyDown(firstButton, { key: 'Tab' });
    expect(document.activeElement).not.toBe(firstButton);
  });
});
```

#### Performance Tests
```javascript
// src/__tests__/performance/optimization.test.js
import { render, screen } from '@testing-library/react';
import { performance } from 'perf_hooks';
import LazyImage from '../../components/ui/LazyImage';

describe('Performance Optimization', () => {
  it('lazy loads images efficiently', () => {
    const mockIntersectionObserver = jest.fn();
    global.IntersectionObserver = jest.fn(() => ({
      observe: mockIntersectionObserver,
      disconnect: jest.fn()
    }));

    render(<LazyImage src="test.jpg" alt="Test" />);
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('renders large dog lists without performance degradation', () => {
    const start = performance.now();
    const largeDogList = Array(1000).fill(null).map((_, i) => ({
      id: i,
      name: `Dog ${i}`,
      breed: 'Mixed',
      age_text: '2 years'
    }));

    render(<DogsGrid dogs={largeDogList} />);
    
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should render in under 100ms
  });
});
```

### Test Configuration

**Jest Configuration**:
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};
```

## Development Workflow

### Code Quality Standards

**Pre-commit workflow**:
```bash
# Frontend verification workflow
npm test                 # Run all tests (2,427 tests)
npm run build           # Verify production build
npm run lint            # ESLint validation
npm run type-check      # TypeScript validation
```

**ESLint Configuration**:
```javascript
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
];

export default eslintConfig;
```

### Component Development Pattern

**TDD Approach**:
1. **Write tests first** - Define expected behavior
2. **Implement component** - Meet test requirements
3. **Add error handling** - Graceful failure modes
4. **Optimize performance** - Memoization and lazy loading
5. **Validate accessibility** - ARIA compliance and keyboard support

**Example Development Flow**:
```javascript
// 1. Write test first
describe('NewComponent', () => {
  it('renders with required props', () => {
    render(<NewComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

// 2. Implement component
export default function NewComponent({ title }) {
  return <h1>{title}</h1>;
}

// 3. Add error handling
export default function NewComponent({ title }) {
  if (!title) return null;
  return <h1>{sanitizeText(title)}</h1>;
}

// 4. Optimize performance
const NewComponent = memo(function NewComponent({ title }) {
  if (!title) return null;
  return <h1>{sanitizeText(title)}</h1>;
});

// 5. Add accessibility
export default function NewComponent({ title, level = 1 }) {
  if (!title) return null;
  
  const Tag = `h${level}`;
  return (
    <Tag 
      role="heading" 
      aria-level={level}
      className="focus:outline-2 focus:outline-blue-500"
    >
      {sanitizeText(title)}
    </Tag>
  );
}
```

### File Organization

**Project Structure**:
```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.js          # Root layout
│   ├── page.jsx           # Homepage
│   ├── dogs/              # Dogs section
│   │   ├── page.jsx       # Dogs listing
│   │   └── [id]/          # Dynamic dog pages
│   └── organizations/      # Organizations section
├── components/            # Reusable UI components
│   ├── dogs/             # Dog-specific components
│   ├── error/            # Error boundaries
│   ├── home/             # Homepage components
│   ├── layout/           # Layout components
│   ├── organizations/    # Organization components
│   ├── providers/        # Context providers
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── services/             # API communication
├── utils/                # Utility functions
├── types/                # TypeScript definitions
└── __tests__/            # Test suites
```

## Build & Deployment

### Production Build

**Next.js Build Configuration**:
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
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

module.exports = nextConfig;
```

**Build Optimization**:
```bash
# Production build with optimization
npm run build

# Build output analysis
npm run analyze

# Static export (if needed)
npm run export
```

### Environment Configuration

**Environment Variables**:
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.rescuedogs.com
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me
NEXT_PUBLIC_ENVIRONMENT=production

# Build-time variables
ANALYZE=true
BUNDLE_ANALYZE=true
```

### Deployment Checklist

**Pre-deployment Verification**:
- [ ] All tests pass (1,897 tests)
- [ ] Build succeeds without warnings
- [ ] Bundle size analysis reviewed
- [ ] Accessibility audit complete
- [ ] Performance metrics validated
- [ ] Security headers configured
- [ ] SEO metadata verified

## Error Handling

### Error Boundary Implementation

**Global Error Boundary**:
```javascript
// src/components/error/ErrorBoundary.jsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            We're sorry, but something unexpected happened.
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mr-4"
          >
            Try Again
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Component-specific Error Boundaries**:
```javascript
// src/components/error/DogCardErrorBoundary.jsx
export function DogCardErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div className="dog-card-error p-4 border border-red-200 rounded">
          <p className="text-sm text-red-600 mb-2">
            Unable to load dog information
          </p>
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### API Error Handling

**Service-level Error Handling**:
```javascript
// src/services/animalsService.js
import { reportError } from '@/utils/logger';

export async function getAnimals(filters = {}) {
  try {
    const response = await fetch('/api/animals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    reportError('Failed to fetch animals', {
      error: error.message,
      filters,
      timestamp: new Date().toISOString(),
    });
    
    throw new Error('Unable to load dogs. Please try again.');
  }
}
```

**Error State Management**:
```javascript
// Custom hook for error handling
export function useErrorHandler() {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((error, context = {}) => {
    setError({
      message: error.message,
      timestamp: new Date().toISOString(),
      context,
    });
  }, []);

  const retry = useCallback(async (retryFn) => {
    setIsRetrying(true);
    try {
      await retryFn();
      setError(null);
    } catch (error) {
      handleError(error, { retry: true });
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, isRetrying, handleError, retry, clearError };
}
```

## Performance Monitoring

### Core Web Vitals

**Performance Metrics Tracking**:
```javascript
// src/utils/performance.js
export function trackWebVitals(metric) {
  const { name, value, id } = metric;
  
  // Track Core Web Vitals
  switch (name) {
    case 'LCP': // Largest Contentful Paint
      console.log('LCP:', value);
      break;
    case 'FID': // First Input Delay
      console.log('FID:', value);
      break;
    case 'CLS': // Cumulative Layout Shift
      console.log('CLS:', value);
      break;
    case 'TTFB': // Time to First Byte
      console.log('TTFB:', value);
      break;
  }
}

// Usage in _app.js or layout.js
export function reportWebVitals(metric) {
  trackWebVitals(metric);
}
```

**Performance Monitoring Component**:
```javascript
// src/components/PerformanceMonitor.jsx
import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', entry.duration);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => observer.disconnect();
    }
  }, []);

  return null;
}
```

### Bundle Analysis

**Webpack Bundle Analyzer**:
```bash
# Analyze bundle size
npm run analyze

# Generate bundle report
npm run build -- --analyze
```

**Performance Budget**:
```javascript
// next.config.js
module.exports = {
  experimental: {
    bundlePagesRouterDependencies: true,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
};
```

## Advanced Features

### Animated Statistics (Hero Section)

**HeroSection Component** with real-time data:
```javascript
// src/components/home/HeroSection.jsx
export default function HeroSection() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time statistics from API
  const fetchStatistics = async () => {
    try {
      const stats = await getStatistics();
      setStatistics(stats);
    } catch (err) {
      setError("Unable to load statistics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="hero-gradient relative overflow-hidden py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-hero font-bold text-foreground mb-6">
              Helping rescue dogs find loving homes
            </h1>
            <p className="text-body text-muted-foreground mb-8">
              Browse available dogs from trusted organizations across multiple countries.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dogs">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                  Find Your New Best Friend
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                About Our Mission
              </Button>
            </div>
          </div>

          {/* Animated Statistics */}
          <div className="flex-1 max-w-lg">
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  value={statistics.total_dogs}
                  label="Dogs need homes"
                />
                <StatCard
                  value={statistics.total_organizations}
                  label="Rescue organizations"
                />
                <StatCard
                  value={statistics.countries.length}
                  label="Countries"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 text-center">
      <div className="text-3xl font-bold text-orange-600 mb-2">
        <AnimatedCounter value={value} label={label} />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
```

**AnimatedCounter Component**:
```javascript
// src/components/ui/AnimatedCounter.jsx
export default function AnimatedCounter({ value, duration = 2000, label }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const startAnimation = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <span
      ref={elementRef}
      role="status"
      aria-live="polite"
      aria-label={`${label}: ${displayValue}`}
    >
      {displayValue.toLocaleString()}
    </span>
  );
}
```

### Related Dogs Feature

**RelatedDogsSection Component**:
```javascript
// src/components/dogs/RelatedDogsSection.jsx
export default function RelatedDogsSection({ organizationId, currentDogId }) {
  const [relatedDogs, setRelatedDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRelatedDogs = async () => {
      try {
        const dogs = await getRelatedDogs(organizationId, currentDogId);
        setRelatedDogs(dogs.slice(0, 3));
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId && currentDogId) {
      fetchRelatedDogs();
    }
  }, [organizationId, currentDogId]);

  if (loading) return <RelatedDogsLoadingSkeleton />;
  if (error) return <RelatedDogsErrorState />;
  if (!relatedDogs.length) return null;

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">
        More dogs from this organization
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedDogs.map(dog => (
          <RelatedDogsCard key={dog.id} dog={dog} />
        ))}
      </div>
    </section>
  );
}
```

### Theme System

**Dark/Light Mode Implementation**:
```javascript
// src/components/providers/ThemeProvider.jsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Mobile Experience

### Responsive Design

**Mobile-first approach** with Tailwind CSS:
```javascript
// Mobile-optimized components
<div className="p-4 md:p-6 lg:p-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    <div className="text-sm md:text-base lg:text-lg">
      Content scales with viewport
    </div>
  </div>
</div>
```

**Touch-friendly interactions**:
```css
/* Touch targets minimum 44px */
.touch-target {
  @apply min-h-[44px] min-w-[44px] touch-manipulation;
}

/* Smooth scrolling on mobile */
.mobile-scroll {
  @apply overscroll-contain scroll-smooth;
}
```

### Mobile Components

**MobileStickyBar Component**:
```javascript
// src/components/ui/MobileStickyBar.jsx
export default function MobileStickyBar({ dog }) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden">
      <div className="flex gap-3 max-w-md mx-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setIsFavorited(!isFavorited)}
        >
          {isFavorited ? 'Favorited' : 'Favorite'}
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

**Mobile Filter Sheet**:
```javascript
// src/components/filters/MobileFilterBottomSheet.jsx
export default function MobileFilterBottomSheet({ filters, onFiltersChange, onClose }) {
  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Dogs</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-4">
          <FilterSection title="Breed" filter="breed" />
          <FilterSection title="Age" filter="age" />
          <FilterSection title="Size" filter="size" />
          <FilterSection title="Location" filter="location" />
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

## SEO & Metadata

### Dynamic Metadata Generation

**Page-level SEO**:
```javascript
// src/app/dogs/[id]/page.jsx
export async function generateMetadata({ params }) {
  const dog = await getDogById(params.id);
  
  if (!dog) {
    return {
      title: 'Dog Not Found',
      description: 'The requested dog profile could not be found.',
    };
  }

  return {
    title: `${dog.name} - ${dog.breed} Available for Adoption`,
    description: `Meet ${dog.name}, a ${dog.age_text} ${dog.breed} looking for a loving home. ${dog.description?.substring(0, 150)}...`,
    keywords: `dog adoption, ${dog.breed}, rescue dog, ${dog.name}, pet adoption`,
    
    openGraph: {
      title: `${dog.name} - Rescue Dog Available for Adoption`,
      description: `Meet ${dog.name}, a ${dog.age_text} ${dog.breed} looking for a loving home.`,
      images: [
        {
          url: dog.primary_image_url,
          width: 800,
          height: 600,
          alt: `Photo of ${dog.name}, a ${dog.breed} available for adoption`,
        },
      ],
      type: 'article',
      siteName: 'Rescue Dog Aggregator',
    },
    
    twitter: {
      card: 'summary_large_image',
      title: `${dog.name} - Rescue Dog Available for Adoption`,
      description: `Meet ${dog.name}, a ${dog.age_text} ${dog.breed} looking for a loving home.`,
      images: [dog.primary_image_url],
    },
    
    alternates: {
      canonical: `/dogs/${dog.id}`,
    },
  };
}
```

**Structured Data**:
```javascript
// src/components/StructuredData.jsx
export function DogStructuredData({ dog }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Animal",
    "name": dog.name,
    "species": "Dog",
    "breed": dog.breed,
    "age": dog.age_text,
    "description": dog.description,
    "image": dog.primary_image_url,
    "location": {
      "@type": "Place",
      "name": dog.location
    },
    "availableForAdoption": true,
    "provider": {
      "@type": "Organization",
      "name": dog.organization,
      "url": dog.adoption_url
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
```

## Code Quality & Standards

### TypeScript Integration

**Type Definitions**:
```typescript
// src/types/dog.ts
export interface Dog {
  id: number;
  name: string;
  breed: string;
  standardized_breed?: string;
  age_text: string;
  description?: string;
  primary_image_url: string;
  adoption_url: string;
  organization: string;
  organization_id: number;
  status: 'available' | 'pending' | 'adopted';
  location?: string;
  size?: 'small' | 'medium' | 'large';
  created_at: string;
  updated_at: string;
}

export interface DogFilters {
  breed?: string;
  age?: string;
  size?: string;
  location?: string;
  search?: string;
}
```

**Component Props Types**:
```typescript
// src/components/dogs/DogCard.tsx
interface DogCardProps {
  dog: Dog;
  onClick?: (dogId: number) => void;
  showFavoriteButton?: boolean;
  className?: string;
}

export default function DogCard({ 
  dog, 
  onClick, 
  showFavoriteButton = true,
  className = ''
}: DogCardProps) {
  // Component implementation
}
```

### Code Style Guidelines

**Naming Conventions**:
- **Components**: PascalCase (`DogCard`, `FilterControls`)
- **Hooks**: camelCase with `use` prefix (`useDogFilters`, `useTheme`)
- **Utilities**: camelCase (`sanitizeText`, `getOptimizedImageUrl`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `DEFAULT_FILTERS`)

**File Structure**:
```
ComponentName/
├── ComponentName.jsx        # Main component
├── ComponentName.test.jsx   # Tests
├── ComponentName.stories.jsx # Storybook stories (if using)
├── index.js                 # Export barrel
└── README.md               # Component documentation
```

**Import Organization**:
```javascript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party imports
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

// 3. Internal imports (absolute paths)
import { Button } from '@/components/ui/button';
import { sanitizeText } from '@/utils/security';

// 4. Relative imports
import './ComponentName.css';
```

## Future Considerations

### Planned Enhancements

**Progressive Web App (PWA)**:
- Service Worker implementation
- Offline functionality
- Push notifications for new dogs
- App-like experience on mobile

**Advanced Features**:
- Real-time updates with WebSockets
- Advanced search with Elasticsearch
- Machine learning for dog matching
- Video content support

**Performance Optimizations**:
- Server-side rendering improvements
- Edge caching strategies
- Image format optimization (AVIF/WebP)
- Code splitting enhancements

### Scalability Patterns

**Micro-frontend Architecture**:
```javascript
// Module federation for team scaling
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "dogs_app",
      filename: "remoteEntry.js",
      exposes: {
        "./DogCard": "./src/components/dogs/DogCard",
        "./FilterControls": "./src/components/dogs/FilterControls",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
};
```

**Component Library Extraction**:
```javascript
// Separate package for reusable components
export { Button } from './components/Button';
export { Card } from './components/Card';
export { LazyImage } from './components/LazyImage';
export { AnimatedCounter } from './components/AnimatedCounter';
```

### Technology Evolution

**Next.js 16+ Features**:
- Enhanced App Router capabilities
- Improved streaming and suspense
- Better TypeScript integration
- Advanced caching mechanisms

**React 19+ Features**:
- Concurrent features
- Automatic batching improvements
- Enhanced server components
- Better hydration patterns

---

This comprehensive frontend architecture provides a solid foundation for a modern, accessible, secure, and performant web application. The architecture emphasizes maintainability through comprehensive testing (2,427 tests), accessibility compliance, and clean code patterns while delivering an exceptional user experience across all devices and user needs.

The implementation demonstrates advanced React patterns, modern Next.js capabilities, and industry best practices for building scalable web applications. The extensive test coverage ensures reliability, while the focus on accessibility and performance makes the application usable by everyone.