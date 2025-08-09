# Related Dogs Feature Implementation Guide

## 🎯 Overview

The **Related Dogs feature** enhances adoption opportunities by displaying up to 3 dogs from the same organization on individual dog detail pages. This cross-discovery mechanism encourages users to explore additional adoption options, increasing overall adoption rates through organization-focused browsing.

## 🏗️ Architecture

### Component Structure

```
src/
├── components/dogs/
│   ├── RelatedDogsSection.jsx      # Main container component
│   └── RelatedDogsCard.jsx         # Individual dog card component
├── services/
│   └── relatedDogsService.js       # API service layer
└── __tests__/
    ├── components/dogs/
    │   ├── RelatedDogsSection.test.jsx  # Section state management tests
    │   └── RelatedDogsCard.test.jsx     # Card component tests
    └── services/
        └── relatedDogsService.test.js   # API service tests
```

### Data Flow

1. **Trigger**: User navigates to dog detail page (`/dogs/[id]`)
2. **Integration**: `DogDetailClient` renders `RelatedDogsSection` with organization context
3. **API Call**: `relatedDogsService` fetches 4 dogs from same organization (limit: 4)
4. **Filtering**: Current dog excluded from results on client side (ensuring 3 remaining)
5. **Display**: Up to 3 dogs rendered in responsive grid layout
6. **Navigation**: Cards link to individual dog detail pages
7. **Organization Link**: "View all available dogs" links filter dogs page by organization

## 📱 Component Implementation

### RelatedDogsSection Component

**Purpose**: Main container managing state, API calls, and rendering logic.

**Location**: `src/components/dogs/RelatedDogsSection.jsx`

**Key Features**:
- **State Management**: Loading, error, and success states
- **API Integration**: Fetches related dogs with error handling
- **Responsive Layout**: 3-column grid (mobile stacks to single column)
- **Empty State**: Graceful handling when no related dogs found
- **Loading State**: Skeleton animation during fetch
- **Error Recovery**: User-friendly error messages with retry options

**Props Interface**:
```javascript
interface RelatedDogsSectionProps {
  organizationId: number;     // Organization ID for filtering
  currentDogId: number;       // Current dog ID to exclude
  organization: {             // Organization object for display
    id: number;
    name: string;
  };
}
```

**State Management**:
```javascript
const [relatedDogs, setRelatedDogs] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
```

**Usage Pattern**:
```javascript
import RelatedDogsSection from '../components/dogs/RelatedDogsSection';

<RelatedDogsSection 
  organizationId={dog.organization_id}
  currentDogId={dog.id}
  organization={dog.organization}
/>
```

### RelatedDogsCard Component

**Purpose**: Individual dog card with optimized design and interactions.

**Location**: `src/components/dogs/RelatedDogsCard.jsx`

**Key Features**:
- **4:3 Aspect Ratio**: Consistent image display across all cards
- **Lazy Loading**: Integrated with `LazyImage` component for performance
- **Hover Effects**: Visual feedback on card and name elements
- **Keyboard Navigation**: Full accessibility with Enter/Space key support
- **ARIA Compliance**: Proper labels and roles for screen readers
- **Click Navigation**: Router-based navigation to dog detail pages

**Props Interface**:
```javascript
interface RelatedDogsCardProps {
  dog: {
    id: number;
    name: string;
    breed: string;
    age_text: string;
    primary_image_url: string;
  };
}
```

**Design Specifications**:
- **Card Dimensions**: 4:3 aspect ratio image container
- **Spacing**: Tailwind `p-4` for consistent padding
- **Typography**: `text-lg font-semibold` for dog names
- **Colors**: Hover transitions to `text-blue-600`
- **Shadows**: `shadow-md` to `shadow-lg` on hover

**Interaction Patterns**:
```javascript
// Click handling
const handleCardClick = () => {
  router.push(`/dogs/${dog.id}`);
};

// Keyboard accessibility
const handleKeyDown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleCardClick();
  }
};
```

## 🔌 API Integration

### Service Layer

**File**: `src/services/relatedDogsService.js`

**Core Function**:
```javascript
export async function getRelatedDogs(organizationId, currentDogId) {
  // Uses existing animalsService with organization filtering
  const dogs = await getAnimals({
    organization_id: organizationId,
    limit: 4,  // Fetch 4 to ensure 3 remain after filtering current dog
    status: 'available'
  });

  // Filter out current dog from results
  return dogs.filter(dog => dog.id !== currentDogId);
}
```

**API Endpoint**: Leverages existing `/api/animals` endpoint with parameters:
- `organization_id`: Filters to same organization
- `limit=3`: Optimizes for performance and layout
- `status=available`: Shows only adoptable dogs
- Smart filtering: Automatically applies `availability_confidence=high,medium`

**Error Handling**:
- Network errors: Graceful degradation with error messages
- Empty results: Consistent empty state display
- API failures: Logging with context for debugging

## 🎨 Design Implementation

### Layout Specifications

**Grid Structure**:
```css
/* Desktop: 3-column grid */
.related-dogs-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

/* Mobile: Single column stack */
@media (max-width: 768px) {
  .related-dogs-grid {
    @apply grid-cols-1;
  }
}
```

**Image Containers**:
```css
/* 4:3 aspect ratio enforcement */
.dog-image-container {
  @apply aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-200;
}
```

**Hover Effects**:
```css
/* Card hover transitions */
.dog-card {
  @apply hover:shadow-lg transition-all duration-200;
}

/* Image scaling on hover */
.dog-image {
  @apply group-hover:scale-105 transition-transform duration-200;
}

/* Name color transition */
.dog-name {
  @apply hover:text-blue-600 transition-colors duration-200;
}
```

### Visual Hierarchy

1. **Section Title**: "More Dogs from [Organization Name]"
   - `text-2xl font-semibold text-gray-800`
   - Dynamic organization name insertion
   - Consistent with existing page typography

2. **Dog Cards**: Grid layout with consistent spacing
   - Card background: `bg-white rounded-lg`
   - Shadow: `shadow-md` default, `shadow-lg` on hover
   - Cursor: `cursor-pointer` for interactivity indication

3. **Card Content**: Structured information hierarchy
   - Dog name: `text-lg font-semibold` (primary)
   - Breed: `text-sm text-gray-600` (secondary)
   - Age: `text-sm text-gray-500` (tertiary)

4. **Action Link**: "View all available dogs →"
   - `text-blue-600 hover:text-blue-700`
   - Links to filtered dogs page by organization

## 🧪 Testing Strategy

### Test Coverage: 34 Tests Across 3 Suites

#### Service Layer Tests (6 tests)
**File**: `src/services/__tests__/relatedDogsService.test.js`

**Coverage Areas**:
- API integration with correct parameters
- Current dog exclusion logic
- Empty result handling
- Error propagation
- Organization filtering verification

**Key Test Cases**:
```javascript
test('should fetch dogs from the same organization excluding current dog', async () => {
  // Verifies API call with correct organization_id
  // Confirms current dog filtered from results
});

test('should return empty array when only current dog exists', async () => {
  // Tests edge case of single-dog organizations
});

test('should handle API errors gracefully', async () => {
  // Ensures error propagation for UI handling
});
```

#### RelatedDogsCard Tests (13 tests)
**File**: `src/components/dogs/__tests__/RelatedDogsCard.test.jsx`

**Coverage Areas**:
- Component rendering with all props
- 4:3 aspect ratio image container
- Hover effect class application
- Click navigation functionality
- Keyboard accessibility (Enter/Space)
- ARIA compliance verification
- Missing data graceful handling

**Key Test Cases**:
```javascript
test('should render with 4:3 aspect ratio image container', () => {
  // Verifies aspect-[4/3] class application
});

test('should navigate to dog detail page when clicked', () => {
  // Tests router.push with correct dog ID
});

test('should be keyboard accessible', () => {
  // Verifies tabIndex, role, and aria-label attributes
});
```

#### RelatedDogsSection Tests (15 tests)
**File**: `src/components/dogs/__tests__/RelatedDogsSection.test.jsx`

**Coverage Areas**:
- Loading state skeleton display
- Success state with dog grid
- Empty state messaging
- Error state handling
- API integration calls
- Component lifecycle management
- Responsive grid layout verification

**Key Test Cases**:
```javascript
test('should show loading skeleton while fetching', () => {
  // Tests loading state UI with skeleton animation
});

test('should render grid of related dog cards', () => {
  // Verifies successful data display in grid layout
});

test('should show empty state when no related dogs', () => {
  // Tests empty state messaging and styling
});

test('should limit display to maximum 3 dogs', () => {
  // Ensures UI optimization with dog count limiting
});
```

#### URL Parameter Handling Tests (6 tests)
**File**: `src/app/dogs/__tests__/url-parameter-handling.test.jsx`

**Coverage Areas**:
- URL parameter reading and validation
- Organization filter initialization from URL
- Invalid parameter handling (graceful fallbacks)
- Organization existence validation
- Component mount parameter processing
- Next.js 15 Suspense boundary compliance

**Key Test Cases**:
```javascript
test('should initialize organization filter from organization_id URL parameter', () => {
  // Verifies URL parameter reading and filter initialization
});

test('should handle invalid organization_id gracefully', () => {
  // Tests fallback to "any" for invalid organization IDs
});

test('should validate organization exists before setting filter', () => {
  // Ensures organization validation before filter application
});
```

### Testing Patterns

**Mock Strategy**:
```javascript
// Service layer mocking
jest.mock('../animalsService');

// Next.js router mocking
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush }))
}));

// Component mocking for isolation
jest.mock('../RelatedDogsCard', () => {
  return function MockRelatedDogsCard({ dog }) {
    return <div data-testid={`related-dog-card-${dog.id}`}>{dog.name}</div>;
  };
});
```

**Async Testing**:
```javascript
test('should render section title with organization name', async () => {
  render(<RelatedDogsSection {...props} />);
  
  await waitFor(() => {
    expect(screen.getByText('More Dogs from Pets in Turkey')).toBeInTheDocument();
  });
});
```

## 🚀 Performance Optimization

### Image Loading Strategy

**LazyImage Integration**:
- Uses `IntersectionObserver` for viewport-based loading
- R2 + Cloudflare Images optimization with `getThumbnailImage()`
- Fallback placeholder for loading states
- Error handling with `handleImageError()`

**Optimization Benefits**:
- Reduced initial page load time
- Lower bandwidth usage for users
- Improved Core Web Vitals scores
- Better mobile experience

### API Efficiency

**Single Request Strategy**:
- One API call per organization
- Client-side filtering for current dog exclusion
- Limit parameter for bandwidth optimization
- Leverages existing endpoint for consistency

**Caching Considerations**:
- Browser caching via standard HTTP headers
- Component-level state management
- No redundant requests during component lifecycle

### Component Performance

**Memoization Strategy**:
```javascript
// Strategic use of React.memo for expensive renders
const RelatedDogsCard = memo(function RelatedDogsCard({ dog }) {
  // Component implementation
});

// Dependency optimization in useEffect
useEffect(() => {
  fetchRelatedDogs();
}, [organizationId, currentDogId]); // Minimal dependencies
```

**Render Optimization**:
- Conditional rendering for different states
- Early returns for missing required props
- Efficient re-render prevention

## 🔗 Integration Points

### DogDetailClient Integration

**Implementation Location**: Line 337-343 in `DogDetailClient.jsx`

```javascript
{/* Related Dogs Section */}
{dog.organization_id && (
  <RelatedDogsSection 
    organizationId={dog.organization_id}
    currentDogId={dog.id}
    organization={dog.organization}
  />
)}
```

**Integration Requirements**:
- Requires `dog.organization_id` for filtering
- Uses `dog.id` for current dog exclusion
- Passes `dog.organization` for display context
- Positioned after OrganizationSection, before CTA

### Router Integration

**Navigation Pattern**:
```javascript
// Uses Next.js 15 App Router
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push(`/dogs/${dog.id}`);
```

**URL Structure**:
- Source: `/dogs/[current-id]` (current dog page)
- Target: `/dogs/[related-id]` (related dog page)
- Maintains consistent routing patterns

### API Endpoint Integration

**Existing Endpoint Usage**:
- Endpoint: `GET /api/animals`
- Parameters: `organization_id`, `limit`, `status`
- Response: Array of animal objects with organization data
- Filtering: Leverages smart default availability filtering

## 🎯 User Experience Goals

### Primary Objectives

1. **Increased Adoption Rates**: Cross-discovery within organizations
2. **Improved User Engagement**: Additional browsing opportunities
3. **Organization Support**: Highlights multiple dogs per rescue
4. **Seamless Navigation**: Smooth transitions between dog profiles

### Success Metrics

- **Click-through Rate**: Percentage of users clicking related dog cards
- **Session Duration**: Increased time spent exploring dogs
- **Adoption Conversions**: Dogs adopted through related discovery
- **User Retention**: Return visits after exploring related dogs

### Accessibility Compliance

**WCAG 2.1 AA Standards**:
- **Keyboard Navigation**: Full tabbing support
- **Screen Reader Support**: ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets minimum contrast ratios
- **Semantic HTML**: Proper heading hierarchy

**Implementation Details**:
```javascript
// ARIA compliance
aria-label={`View details for ${dog.name}`}
role="button"
tabIndex={0}

// Keyboard support
onKeyDown={handleKeyDown}

// Screen reader content
<h3>{sanitizeText(dog.name)}</h3>
```

## 🔧 Troubleshooting Guide

### Recent Bug Fixes (Production Hotfixes)

**Fixed Issue #1: Only 2 Dogs Showing Instead of 3**
- **Problem**: API was fetching exactly 3 dogs, but when current dog was included in results, only 2 remained after filtering
- **Root Cause**: `relatedDogsService` used `limit: 3`, but didn't account for current dog removal
- **Solution**: Changed API limit from 3 to 4 to ensure 3 dogs remain after filtering current dog
- **Files Changed**: `src/services/relatedDogsService.js` (line 18: `limit: 4`)
- **Test Coverage**: Added comprehensive tests for this scenario

**Fixed Issue #2: "View All Available Dogs" Link Not Filtering by Organization**
- **Problem**: Link generated URL parameter `?organization_id=123` but dogs page wasn't reading/applying it
- **Root Cause**: Dogs page imported `useSearchParams` but wasn't using it to initialize organization filter
- **Solution**: Added URL parameter handling with organization validation
- **Files Changed**: 
  - `src/app/dogs/page.jsx` (added useEffect for URL parameter initialization)
  - Added Suspense boundary for Next.js 15 compliance
- **Test Coverage**: Added 6 tests for URL parameter handling scenarios

### Common Issues

1. **No Related Dogs Showing**:
   - Verify `organizationId` prop is provided
   - Check if organization has multiple available dogs
   - Confirm API endpoint is accessible
   - Validate dog status and availability confidence
   - **New**: Ensure API limit accounts for current dog filtering (should be 4, not 3)

2. **Images Not Loading**:
   - Check `primary_image_url` validity
   - Verify R2 and Cloudflare Images configuration
   - Test LazyImage component isolation
   - Review network connectivity

3. **Navigation Not Working**:
   - Verify Next.js router configuration
   - Check dynamic route setup
   - Test click event handling
   - Validate dog ID format
   - **New**: Ensure "View all" links include proper URL parameters

4. **Layout Issues**:
   - Confirm Tailwind CSS classes
   - Test responsive breakpoints
   - Verify aspect ratio calculations
   - Check grid layout implementation

5. **URL Parameter Issues** (New):
   - Verify `useSearchParams` is wrapped in Suspense boundary (Next.js 15 requirement)
   - Check organization validation logic in URL parameter handler
   - Ensure organizations are loaded before URL parameter processing

### Debug Strategies

**Console Logging**:
```javascript
// Service layer debugging
logger.log(`Fetching related dogs for organization ${organizationId}`);
logger.log(`Found ${relatedDogs.length} related dogs`);

// Component state debugging
console.log('RelatedDogsSection state:', { loading, error, relatedDogs });
```

**Network Debugging**:
- Use browser DevTools Network tab
- Check API response format and status
- Verify request parameters
- Monitor response times

**Component Debugging**:
- Use React Developer Tools
- Check component props and state
- Verify event handler execution
- Test component isolation

## 📚 Related Documentation

### Primary References
- `docs/frontend_architecture.md` - Complete frontend architecture
- `docs/development/workflow.md` - TDD methodology and testing
- `docs/api/reference.md` - API endpoint documentation

### Implementation Guides
- `docs/cta_optimization_guide.md` - Related UX patterns
- `docs/test_optimization_guide.md` - Testing strategies
- `CLAUDE.md` - Project guidance and standards

### External Resources
- [Next.js App Router](https://nextjs.org/docs/app) - Routing patterns
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Testing utilities
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns) - Layout patterns

This guide provides comprehensive implementation details for the Related Dogs feature, following production-ready patterns with full test coverage and accessibility compliance.