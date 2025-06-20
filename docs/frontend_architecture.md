# Frontend Architecture Guide

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Security Implementation](#security-implementation)
- [Performance Optimization](#performance-optimization)
- [Related Dogs Feature](#related-dogs-feature)
- [Accessibility Features](#accessibility-features)
- [Hero Section with Animated Statistics](#hero-section-with-animated-statistics)
- [CTA Optimization Components](#cta-optimization-components)
- [Error Handling & User Experience](#error-handling--user-experience)
- [Test-Driven Development](#test-driven-development)
- [Development Workflow](#development-workflow)
- [Performance Monitoring](#performance-monitoring)
- [Future Considerations](#future-considerations)

## Overview

The Rescue Dog Aggregator frontend is built with **Next.js 15** using the **App Router** architecture, implementing modern React patterns with a focus on **performance**, **security**, **accessibility**, and **maintainability**. The architecture follows a **test-driven development (TDD)** approach with comprehensive coverage across security, performance, accessibility, and functionality.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript/JavaScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks with component-level state
- **Testing**: Jest + React Testing Library (1,249 tests across 88 suites)
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
- `src/components/dogs/RelatedDogsSection.jsx` - Related dogs display
- `src/components/dogs/RelatedDogsCard.jsx` - Individual dog cards

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

## Related Dogs Feature

### Overview

The **Related Dogs section** increases adoption opportunities by showing more dogs from the same organization on individual dog detail pages. This cross-discovery feature encourages users to explore additional adoption options.

### Architecture

**Key Components**:
- `src/components/dogs/RelatedDogsSection.jsx` - Main container with state management
- `src/components/dogs/RelatedDogsCard.jsx` - Individual dog card component
- `src/services/relatedDogsService.js` - API service for fetching related dogs

### RelatedDogsSection Component

**Purpose**: Displays up to 3 related dogs from the same organization with loading, error, and empty states.

**Key Features**:
- Automatic organization filtering
- Current dog exclusion from results
- Responsive 3-column grid (stacks on mobile)
- Loading skeleton animations
- Error boundary integration
- Empty state with consistent messaging

**Implementation Pattern**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import { getRelatedDogs } from '../../services/relatedDogsService';
import RelatedDogsCard from './RelatedDogsCard';

export default function RelatedDogsSection({ organizationId, currentDogId, organization }) {
  const [relatedDogs, setRelatedDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRelatedDogs = async () => {
      try {
        const dogs = await getRelatedDogs(organizationId, currentDogId);
        setRelatedDogs(dogs.slice(0, 3)); // Limit to 3 dogs
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

  // Component renders loading, error, success, or empty states
}
```

### RelatedDogsCard Component

**Purpose**: Reusable dog card with 4:3 aspect ratio images, hover effects, and accessibility features.

**Key Features**:
- **4:3 aspect ratio** images with Cloudinary optimization
- **Hover effects** on card and dog name
- **Keyboard navigation** with Enter/Space key support
- **ARIA compliance** with proper labels and roles
- **LazyImage integration** with fallback placeholders
- **Click navigation** to individual dog detail pages

**Implementation Pattern**:
```javascript
'use client';

import { useRouter } from 'next/navigation';
import LazyImage from '../ui/LazyImage';
import { sanitizeText } from '../../utils/security';

export default function RelatedDogsCard({ dog }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/dogs/${dog.id}`);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${dog.name}`}
    >
      {/* 4:3 Aspect Ratio Image Container */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg">
        <LazyImage
          src={dog.primary_image_url}
          alt={dog.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
          {sanitizeText(dog.name)}
        </h3>
        <p className="text-sm text-gray-600">{sanitizeText(dog.breed)}</p>
        <p className="text-sm text-gray-500">{sanitizeText(dog.age_text)}</p>
      </div>
    </div>
  );
}
```

### API Service Integration

**Service Layer**: `src/services/relatedDogsService.js`

**Key Features**:
- Uses existing `/api/animals` endpoint with organization filtering
- Excludes current dog from results automatically
- Leverages smart default filtering (available status, high/medium confidence)
- Error handling with detailed logging

**Implementation**:
```javascript
import { getAnimals } from './animalsService';

export async function getRelatedDogs(organizationId, currentDogId) {
  // Fetch dogs from same organization
  const dogs = await getAnimals({
    organization_id: organizationId,
    limit: 3,
    status: 'available'
  });

  // Filter out current dog
  return dogs.filter(dog => dog.id !== currentDogId);
}
```

### TDD Implementation

**Test Coverage**: 34 comprehensive tests across 3 test suites

**Test Files**:
- `src/services/__tests__/relatedDogsService.test.js` - API integration (6 tests)
- `src/components/dogs/__tests__/RelatedDogsCard.test.jsx` - Component behavior (13 tests)
- `src/components/dogs/__tests__/RelatedDogsSection.test.jsx` - State management (15 tests)

**Test Categories**:
- **API Integration**: Organization filtering, current dog exclusion, error handling
- **Component Rendering**: Card layout, responsive design, accessibility
- **User Interactions**: Click navigation, keyboard support, hover effects
- **State Management**: Loading states, error boundaries, empty state handling

### Performance Optimizations

**Image Loading**:
- LazyImage component with IntersectionObserver
- Cloudinary transformations for optimal sizing
- Fallback placeholders for loading states

**Component Memoization**:
- Strategic use of React.memo for expensive renders
- Dependency optimization in useEffect hooks

**API Efficiency**:
- Single API call with organization filtering
- Client-side current dog exclusion
- Limit to 3 dogs for optimal performance

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

## Hero Section with Animated Statistics

### Overview

The **Hero Section with Animated Statistics** provides an engaging home page experience with animated counters and dynamic visual elements. This feature was implemented following TDD principles with comprehensive test coverage and accessibility compliance.

### Core Components

#### HeroSection Component

**Purpose**: Main hero section displaying animated statistics, call-to-action buttons, and engaging visual elements.

**Location**: `src/components/home/HeroSection.jsx`

**Key Features**:
- **Animated statistics** with real-time data fetching from `/api/animals/statistics` endpoint
- **Responsive hero text** with mobile-optimized typography
- **Call-to-action buttons** with primary and secondary actions
- **Animated background** with peach/cream gradient and map dots
- **Loading states** with shimmer placeholders
- **Error handling** with retry functionality
- **Accessibility compliance** with screen reader descriptions

**Implementation**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AnimatedCounter from '../ui/AnimatedCounter';
import { getStatistics } from '../../services/animalsService';

export default function HeroSection() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real-time statistics from backend API
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getStatistics();
      setStatistics(stats);
    } catch (err) {
      setError("Unable to load statistics. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  return (
    <section className="hero-gradient relative overflow-hidden py-12 md:py-20 lg:py-24">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Map dots with staggered animations */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-pulse-dot opacity-60" 
             style={{ animationDelay: '0s' }} />
        {/* Additional animated dots... */}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-hero font-bold text-gray-900 mb-6 leading-tight">
              Helping rescue dogs find loving homes
            </h1>
            <p className="text-body text-gray-700 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Browse available dogs from trusted rescue organizations across multiple countries. 
              Every dog deserves a second chance at happiness.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/dogs">
                <Button size="lg" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3">
                  Find Your New Best Friend
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-orange-600 text-orange-600 hover:bg-orange-50 px-8 py-3">
                About Our Mission
              </Button>
            </div>
          </div>

          {/* Animated Statistics */}
          <div className="flex-1 w-full max-w-lg">
            {statistics && !loading && !error && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Dogs Count */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter value={statistics.total_dogs} label="Dogs need homes" />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Dogs need homes</div>
                  </div>

                  {/* Organizations Count */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter value={statistics.total_organizations} label="Rescue organizations" />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Rescue organizations</div>
                  </div>

                  {/* Countries Count */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center shadow-sm">
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter value={statistics.countries.length} label="Countries" />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Countries</div>
                  </div>
                </div>

                {/* Organizations Breakdown */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                  <div className="text-center mb-4">
                    <div className="text-sm text-gray-600 font-medium">
                      Dogs available from these organizations:
                    </div>
                  </div>
                  {statistics.organizations.slice(0, 4).map((org) => (
                    <div key={org.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate flex-1 mr-2">{org.name}</span>
                      <span className="text-orange-600 font-medium">({org.dog_count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

#### AnimatedCounter Component

**Purpose**: Reusable counter component that animates from 0 to target value when scrolled into view.

**Location**: `src/components/ui/AnimatedCounter.jsx`

**Key Features**:
- **Intersection Observer API** for scroll-triggered animations
- **Custom easing function** (easeOutCubic) for smooth transitions
- **requestAnimationFrame** for 60fps performance
- **Reduced motion support** respecting user preferences
- **Accessibility compliance** with ARIA labels and live regions
- **Error handling** with graceful fallbacks
- **Configurable duration** and animation parameters

**Implementation**:
```javascript
'use client';

import { useState, useEffect, useRef } from 'react';

const easeOutCubic = (t) => {
  return 1 - Math.pow(1 - t, 3);
};

export default function AnimatedCounter({ 
  value, 
  duration = 2000, 
  label, 
  className = '' 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Respect reduced motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setDisplayValue(Math.max(0, Math.round(value)));
      return;
    }

    // Setup Intersection Observer for scroll-triggered animation
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
          setHasAnimated(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, hasAnimated]);

  const startAnimation = () => {
    const startTime = Date.now();
    const startValue = displayValue;
    const targetValue = Math.max(0, Math.round(value));
    const totalChange = targetValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing function
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.round(startValue + (totalChange * easedProgress));
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <span 
      ref={elementRef}
      className={`animate-count-up ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ? `${label}: ${displayValue}` : `${displayValue}`}
      data-testid="animated-counter"
    >
      {displayValue.toLocaleString()}
    </span>
  );
}
```

### Visual Design Implementation

#### Background Gradient and Animations

**CSS Implementation** in `src/app/globals.css`:
```css
/* Hero gradient background - peach/cream tones */
.hero-gradient {
  background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 30%, #fdba74 60%, #f97316 100%);
  background-size: 400% 400%;
  animation: gradient-shift 20s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Map dots pulse animation */
@keyframes pulse-dot {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

.animate-pulse-dot {
  animation: pulse-dot 3s ease-in-out infinite;
}

/* Counter number animation easing */
@keyframes count-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-count-up {
  animation: count-up 0.5s ease-out;
}

/* Responsive typography */
.text-hero {
  font-size: var(--font-size-hero);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  font-weight: var(--font-weight-bold);
}
```

#### Responsive Design Features

**Mobile Optimizations**:
- **Faster animations** on mobile for better performance (2s vs 3s)
- **Reduced background complexity** with smaller gradient size
- **Stacked layout** for mobile with proper spacing
- **Touch-friendly buttons** with 44px minimum target size

**Accessibility Features**:
- **High contrast mode support** with alternative color schemes
- **Reduced motion support** disabling animations when requested
- **Screen reader descriptions** with ARIA live regions
- **Keyboard navigation** support for all interactive elements

### Backend API Integration

#### Statistics Endpoint

**New API endpoint**: `/api/animals/statistics`

**Returns**:
```json
{
  "total_dogs": 1234,
  "total_organizations": 45,
  "countries": [
    {"country": "Turkey", "count": 800},
    {"country": "Spain", "count": 434}
  ],
  "organizations": [
    {"id": 1, "name": "Organization Name", "dog_count": 123}
  ]
}
```

**Service Integration** in `src/services/animalsService.js`:
```javascript
export async function getStatistics() {
  logger.log("Fetching statistics");
  return get('/api/animals/statistics');
}
```

### Performance Optimizations

**Animation Performance**:
- **requestAnimationFrame** instead of setInterval for 60fps animations  
- **Single Intersection Observer** per component for efficient scroll detection
- **Cleanup on unmount** preventing memory leaks
- **Conditional animation** based on user preferences

**Network Performance**:  
- **Single API call** for all statistics data
- **Error handling** with retry functionality
- **Loading states** with skeleton placeholders
- **Caching considerations** for repeated visits

### Testing Strategy

**Test Coverage**: 120+ tests across 5 test suites

**Test Files**:
- `src/components/home/__tests__/HeroSection.test.jsx` - Hero section integration (40+ tests)
- `src/components/ui/__tests__/AnimatedCounter.test.jsx` - Counter functionality (35+ tests) 
- `src/services/__tests__/animalsService.test.js` - Statistics API integration (25+ tests)
- `src/__tests__/integration/hero-section-loading.test.js` - Loading state handling (15+ tests)
- `src/__tests__/accessibility/hero-section-a11y.test.js` - Accessibility compliance (10+ tests)

**Key Test Categories**:
- **Animation behavior** - Scroll triggering, easing functions, completion
- **API integration** - Statistics fetching, error handling, retry logic
- **Accessibility** - ARIA compliance, screen reader support, keyboard navigation
- **Performance** - Animation frame usage, memory cleanup, reduced motion
- **Responsive design** - Mobile layout, typography scaling, touch targets

## CTA Optimization Components

### Overview

The **CTA (Call-to-Action) optimization system** provides comprehensive user engagement features with modern interaction patterns. This system was implemented following TDD principles with 120+ tests covering all functionality.

### Core Components

#### FavoriteButton Component

**Purpose**: Reusable favorite button with multiple variants and visual feedback.

**Location**: `src/components/ui/FavoriteButton.jsx`

**Key Features**:
- Multiple variants (header variant implemented)
- Visual state management (favorited/unfavorited)
- Environment-aware localStorage integration
- Toast notification integration
- Accessibility compliance with ARIA labels
- Error handling with user feedback

**Implementation**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import { FavoritesManager } from '../../utils/favorites';
import { useToast } from './Toast';

export default function FavoriteButton({ dog, variant = 'header', className = '' }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (dog?.id) {
      setIsFavorited(FavoritesManager.isFavorite(dog.id));
    }
  }, [dog?.id]);

  const handleToggleFavorite = async () => {
    try {
      if (isFavorited) {
        const result = FavoritesManager.removeFavorite(dog.id);
        if (result.success) {
          setIsFavorited(false);
          showToast('Removed from favorites', 'success');
        }
      } else {
        const dogData = {
          id: dog.id,
          name: dog.name,
          breed: dog.standardized_breed,
          primary_image_url: dog.primary_image_url,
          organization: dog.organization,
          status: dog.status
        };
        
        const result = FavoritesManager.addFavorite(dog.id, dogData);
        if (result.success) {
          setIsFavorited(true);
          showToast('Added to favorites!', 'success');
        }
      }
    } catch (error) {
      showToast('Failed to update favorites', 'error');
    }
  };

  if (variant === 'header') {
    return (
      <button
        onClick={handleToggleFavorite}
        className={`p-2 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors ${className}`}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        data-testid="header-favorite-button"
      >
        <svg 
          className={`w-5 h-5 transition-colors ${
            isFavorited ? 'text-red-500 fill-current' : 'text-gray-600'
          }`}
          fill={isFavorited ? 'currentColor' : 'none'}
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    );
  }

  return null;
}
```

#### MobileStickyBar Component

**Purpose**: Mobile-only sticky bottom action bar for enhanced mobile UX.

**Location**: `src/components/ui/MobileStickyBar.jsx`

**Key Features**:
- Fixed positioning at bottom of screen for mobile users
- Favorite and contact action buttons
- Responsive design (hidden on desktop with `md:hidden`)
- Toast notification integration
- Proper z-index for overlay display
- Accessibility compliance

**Implementation**:
```javascript
'use client';

import { useState, useEffect } from 'react';
import { FavoritesManager } from '../../utils/favorites';
import { useToast } from './Toast';

export default function MobileStickyBar({ dog, isVisible = true, className = '' }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (dog?.id) {
      setIsFavorited(FavoritesManager.isFavorite(dog.id));
    }
  }, [dog?.id]);

  if (!isVisible || !dog) {
    return null;
  }

  const handleToggleFavorite = async () => {
    // Similar implementation to FavoriteButton
  };

  const handleContact = () => {
    if (dog.adoption_url) {
      window.open(dog.adoption_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 md:hidden ${className}`}
      data-testid="mobile-sticky-bar"
    >
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={handleToggleFavorite}
          className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
            isFavorited 
              ? 'bg-red-50 border-red-200 text-red-600' 
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          data-testid="mobile-favorite-button"
        >
          {isFavorited ? 'Favorited' : 'Favorite'}
        </button>
        
        <button
          onClick={handleContact}
          className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          aria-label="Contact about adoption"
          data-testid="mobile-contact-button"
        >
          Contact
        </button>
      </div>
    </div>
  );
}
```

#### Toast Notification System

**Purpose**: User feedback system with auto-dismiss and manual close functionality.

**Location**: `src/components/ui/Toast.jsx`

**Key Features**:
- Context-based provider pattern (ToastProvider)
- Multiple toast types (success, error, info)
- Auto-dismiss with configurable duration
- Manual close functionality
- Proper cleanup and memory management
- Accessibility compliance (ARIA live regions)
- Animation support with smooth transitions

**Implementation**:
```javascript
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const newToast = {
      id: Date.now(),
      message,
      type,
      isVisible: true
    };
    
    setToast(newToast);
    
    const timer = setTimeout(() => {
      setToast(prev => {
        if (prev && prev.id === newToast.id) {
          return { ...prev, isVisible: false };
        }
        return prev;
      });
      
      setTimeout(() => {
        setToast(prev => {
          if (prev && prev.id === newToast.id) {
            return null;
          }
          return prev;
        });
      }, 300);
    }, duration);
    
    return timer;
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => {
      if (prev) {
        return { ...prev, isVisible: false };
      }
      return prev;
    });
    
    setTimeout(() => {
      setToast(null);
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, closeToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={closeToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function Toast({ message, type, isVisible, onClose }) {
  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div 
      className={`fixed top-4 right-4 ${typeStyles[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3 transition-all duration-300`}
      role="alert"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 ml-2"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
```

#### OrganizationSection Component

**Purpose**: Structured organization display with home icon and action links.

**Location**: `src/components/organizations/OrganizationSection.jsx`

**Key Features**:
- Gray card design with visual hierarchy
- Home icon for organization branding
- Dual action links (organization page + adoption page)
- Responsive layout
- Consistent styling with design system

**Implementation**:
```javascript
import React from 'react';

export default function OrganizationSection({ dog }) {
  if (!dog?.organization) {
    return null;
  }

  return (
    <div className="border rounded-lg p-6 bg-gray-50" data-testid="organization-section">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center mb-2" data-testid="organization-header">
            <div className="text-gray-600 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600">Rescue Organization</span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{dog.organization}</h3>
          
          <div className="space-y-2">
            <a 
              href={`/organizations/${encodeURIComponent(dog.organization)}`}
              className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Organization →
            </a>
            <a 
              href={dog.adoption_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Visit Adoption Page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Utility: Favorites Management

**Purpose**: Client-side localStorage management with cross-environment handling.

**Location**: `src/utils/favorites.js`

**Key Features**:
- Safe localStorage access across SSR/client environments
- Complete CRUD operations for favorites
- Error handling with graceful fallbacks
- Data validation and sanitization
- Storage quota management

**Implementation**:
```javascript
import { reportError } from './logger';

const STORAGE_KEY = 'rescue-dog-favorites';

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export const FavoritesManager = {
  getFavorites() {
    try {
      const storage = getStorage();
      const stored = storage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      reportError('Error getting favorites', { error: error.message });
      return [];
    }
  },

  isFavorite(dogId) {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.id === dogId || fav.id === String(dogId));
  },

  addFavorite(dogId, dogData) {
    try {
      const favorites = this.getFavorites();
      
      if (this.isFavorite(dogId)) {
        return { success: false, message: 'Already in favorites' };
      }

      const favoriteData = {
        ...dogData,
        id: dogId,
        addedAt: new Date().toISOString()
      };

      favorites.push(favoriteData);
      
      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      
      return { success: true, message: 'Added to favorites!' };
    } catch (error) {
      reportError('Error adding favorite', { error: error.message, dogId });
      return { success: false, message: 'Failed to save favorite' };
    }
  },

  removeFavorite(dogId) {
    try {
      const favorites = this.getFavorites();
      const initialLength = favorites.length;
      
      const updatedFavorites = favorites.filter(
        fav => fav.id !== dogId && fav.id !== String(dogId)
      );

      if (updatedFavorites.length === initialLength) {
        return { success: false, message: 'Not in favorites' };
      }

      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify(updatedFavorites));
      
      return { success: true, message: 'Removed from favorites' };
    } catch (error) {
      reportError('Error removing favorite', { error: error.message, dogId });
      return { success: false, message: 'Failed to remove favorite' };
    }
  },

  clearFavorites() {
    try {
      const storage = getStorage();
      storage.removeItem(STORAGE_KEY);
      return { success: true, message: 'All favorites cleared' };
    } catch (error) {
      reportError('Error clearing favorites', { error: error.message });
      return { success: false, message: 'Failed to clear favorites' };
    }
  },

  getFavoriteCount() {
    return this.getFavorites().length;
  }
};
```

### Testing Strategy

The CTA optimization system includes comprehensive test coverage:

**Test Categories**:
- **Component Tests**: Each component has dedicated test suite (Toast.test.jsx, FavoriteButton.test.jsx, etc.)
- **Integration Tests**: Cross-component interaction testing
- **Utility Tests**: favorites.js functionality testing
- **Accessibility Tests**: ARIA compliance and keyboard navigation
- **Error Handling Tests**: Graceful failure scenarios

**Key Test Files**:
```
src/components/ui/__tests__/
├── FavoriteButton.test.jsx      # 25+ tests for favorite functionality
├── MobileStickyBar.test.jsx     # 20+ tests for mobile UX
├── Toast.test.jsx               # 15+ tests for notification system
└── ...

src/utils/__tests__/
├── favorites.test.js            # 25+ tests for localStorage management
└── ...
```

### Design Patterns

**Environment-Aware Storage**: Safe localStorage access across SSR/client environments
```javascript
// Automatically handles server-side rendering
const favorites = FavoritesManager.getFavorites(); // Safe across all environments
```

**Context-Based Notifications**: ToastProvider pattern for app-wide toast management
```javascript
// Wrap app with provider
<ToastProvider>
  <App />
</ToastProvider>

// Use anywhere in component tree
const { showToast } = useToast();
showToast('Success!', 'success');
```

**Variant-Based Components**: Flexible UI components with multiple display modes
```javascript
// Different contexts, same component
<FavoriteButton dog={dog} variant="header" />
<FavoriteButton dog={dog} variant="card" />
```

**Mobile-First Responsive**: Dedicated mobile interactions with desktop fallbacks
```javascript
// Mobile-only component
<MobileStickyBar dog={dog} className="md:hidden" />
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