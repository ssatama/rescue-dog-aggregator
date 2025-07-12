# Performance Optimization Guide

## Overview

This guide documents the comprehensive performance optimizations implemented for the Rescue Dog Aggregator platform, focusing on mobile-first design, Core Web Vitals, and accessibility.

## Image Optimization

### Cloudflare R2 + Images Transformations

The platform uses Cloudflare Images API for optimal delivery with comprehensive security:

```javascript
// Hero images - responsive with quality optimization
w=800,h=600,fit=contain,quality=auto

// Catalog cards - mobile-first responsive
w=400,h=300,fit=cover,quality=auto

// Thumbnails - bandwidth optimized
w=200,h=200,fit=cover,quality=60

// Mobile optimized
w=320,h=240,fit=cover,quality=70
```

**Security Features**:
- Path traversal validation before URL processing
- Parameter injection protection with strict regex validation
- R2 domain validation to prevent external resource access
- Error boundary fallbacks for transformation failures

### Image Loading Strategy

- **Hero Images**: Preloaded for optimal LCP (Largest Contentful Paint)
- **Cards**: Lazy loaded with intersection observer
- **Thumbnails**: Optimized for bandwidth with lower quality settings
- **Fallbacks**: Progressive enhancement with placeholder → low-quality → full quality

### Progressive Image Component

```javascript
import ProgressiveImage from '../components/ui/ProgressiveImage';

<ProgressiveImage
  src={imageUrl}
  alt="Dog photo"
  context="hero" // 'hero', 'card', 'thumbnail'
  priority={true} // For LCP optimization
  className="w-full h-full"
/>
```

## Component Performance

### React.memo Implementation

Critical components are memoized to prevent unnecessary re-renders:

```javascript
// RelatedDogsSection - prevents re-renders on parent updates
const RelatedDogsSection = memo(function RelatedDogsSection({ organizationId, currentDogId, organization }) {
  // Component logic
}, (prevProps, nextProps) => {
  return (
    prevProps.organizationId === nextProps.organizationId &&
    prevProps.currentDogId === nextProps.currentDogId &&
    prevProps.organization?.id === nextProps.organization?.id
  );
});
```

### Memory Leak Prevention

```javascript
// DogDetailClient with cleanup
const mountedRef = useRef(true);

useEffect(() => {
  return () => {
    mountedRef.current = false;
  };
}, []);

const fetchData = useCallback(async () => {
  if (!mountedRef.current) return; // Prevent state updates if unmounted
  // Fetch logic
}, []);
```

## Mobile Performance

### Touch Target Optimization

All interactive elements meet WCAG 2.1 AA requirements:

- **Minimum Size**: 44px × 44px touch targets
- **Spacing**: Minimum 8px between adjacent targets
- **Visual Feedback**: Clear hover and focus states

### Responsive Design Strategy

```css
/* Mobile-first responsive padding */
.main-container {
  @apply px-4 py-6 sm:px-6 sm:py-8 lg:px-8;
}

/* Info cards with responsive gaps */
.info-grid {
  @apply grid grid-cols-2 gap-3 sm:gap-4;
}
```

### Mobile Sticky Bar Performance

The `MobileStickyBar` component is optimized for smooth scrolling:

- Fixed positioning with `will-change: transform`
- Debounced scroll event handlers
- CSS transforms for hardware acceleration

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP)

- Hero images are preloaded with `<link rel="preload">`
- Critical CSS is inlined
- Font loading is optimized with `font-display: swap`

### First Input Delay (FID)

- Event handlers are attached only when needed
- Heavy computations are deferred or memoized
- Touch events are optimized for mobile

### Cumulative Layout Shift (CLS)

- Image dimensions are specified to prevent layout shifts
- Skeleton loaders maintain layout during loading
- Font fallbacks prevent FOIT (Flash of Invisible Text)

## Testing Strategy

### Performance Tests

```bash
# Run performance test suite (58 tests)
npm test -- --testPathPattern="performance"

# Load time tests
npm test -- src/__tests__/performance/dog-detail-performance.test.js

# Image optimization tests  
npm test -- src/__tests__/performance/image-optimization.test.js

# Mobile performance tests (including 3G optimization)
npm test -- src/__tests__/performance/mobile-performance.test.js
npm test -- src/__tests__/mobile/mobile-performance-3g.test.js
```

### Performance Budgets

- **Load Time**: < 1000ms for main content
- **Touch Response**: < 100ms for interactions
- **Bundle Size**: Monitored via build analysis
- **Memory Usage**: Leak detection in tests

## Accessibility Performance

### WCAG 2.1 AA Compliance

```bash
# Run accessibility tests
npm test -- --testPathPattern="accessibility"

# WCAG compliance tests
npm test -- src/__tests__/accessibility/wcag-compliance.test.js

# Touch target validation (44px minimum)
npm test -- src/__tests__/mobile/touch-targets.test.js
```

### Key Accessibility Features

- **Semantic HTML**: Proper landmark structure
- **ARIA Attributes**: Screen reader compatibility
- **Keyboard Navigation**: Logical tab order
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meets contrast requirements

## Cross-Browser Optimization

### Browser Testing

```bash
# Cross-browser compatibility tests
npm test -- --testPathPattern="cross-browser"
```

### Browser-Specific Optimizations

- **Safari**: Webkit-specific CSS handled gracefully
- **Firefox**: CSS Grid fallbacks implemented
- **Edge**: Legacy feature polyfills
- **Chrome**: Performance API utilization

## Build Optimization

### Production Build Analysis

```bash
# Build with analysis
npm run build
npm run analyze

# Check bundle size
npx bundlephobia analyze package.json

# Lighthouse CI
npx lhci collect --url=http://localhost:3000
```

### Optimization Techniques

- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Dynamic imports for non-critical code
- **Compression**: Gzip/Brotli compression
- **Caching**: Aggressive caching strategies

## Monitoring & Metrics

### Performance Monitoring

Key metrics to track in production:

- **Core Web Vitals**: LCP, FID, CLS
- **Bundle Size**: Track size increases
- **Error Rates**: Performance-related errors
- **User Experience**: Real user monitoring

### Tools & Resources

- **Chrome DevTools**: Performance profiling
- **Lighthouse**: Automated auditing
- **Web Vitals Extension**: Real-time metrics
- **React DevTools Profiler**: Component performance

## Best Practices

### Development Guidelines

1. **Mobile-First**: Always design for mobile first
2. **Performance Budget**: Stay within defined limits
3. **Lazy Loading**: Implement for non-critical content
4. **Memoization**: Use React.memo for expensive components
5. **Testing**: Include performance tests in CI/CD

### Code Review Checklist

- [ ] Images have proper optimization
- [ ] Components are memoized where appropriate
- [ ] Touch targets meet accessibility requirements
- [ ] Performance tests are included
- [ ] Cross-browser compatibility verified
- [ ] Accessibility standards met

## Troubleshooting

### Common Performance Issues

**Slow Loading Times**:
- Check image optimization settings
- Verify lazy loading implementation
- Review bundle size analysis

**Memory Leaks**:
- Ensure useEffect cleanup functions
- Check for unmounted component state updates
- Review event listener cleanup

**Poor Mobile Performance**:
- Verify touch target sizes
- Check responsive image loading
- Test on actual mobile devices

**Accessibility Issues**:
- Run automated accessibility tests
- Verify keyboard navigation
- Test with screen readers

For detailed troubleshooting, see the main [troubleshooting guide](operations/troubleshooting.md).