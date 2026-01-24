# React & Next.js Performance Guidelines

> **Priorities:** Performance > Reliability > Simplicity > Maintainability
>
> These guidelines ensure React and Next.js code is optimized for speed. Rules are enforced at PR review.
>
> **Based on:** Vercel React Best Practices (January 2026)
>
> **Stack:** Next.js 16, React 19

---

## Table of Contents

1. [Non-Negotiable (PR Blockers)](#non-negotiable-pr-blockers)
2. [Eliminating Waterfalls](#eliminating-waterfalls) - CRITICAL
3. [Bundle Size Optimization](#bundle-size-optimization) - CRITICAL
4. [Server-Side Performance](#server-side-performance) - HIGH
5. [Client-Side Data Fetching](#client-side-data-fetching) - MEDIUM-HIGH
6. [Re-render Optimization](#re-render-optimization) - MEDIUM
7. [Rendering Performance](#rendering-performance) - MEDIUM
8. [Code Review Checklist](#code-review-checklist)

---

## Non-Negotiable (PR Blockers)

These are hard requirements. PRs that violate them will be rejected.

### 1. No Sequential Awaits for Independent Operations

```tsx
// Bad: 3 round trips
const dog = await fetchDog(slug)
const organization = await fetchOrganization(orgId)
const similarDogs = await fetchSimilarDogs(dog.breed)

// Good: 1 round trip
const [dog, organization, similarDogs] = await Promise.all([
  fetchDog(slug),
  fetchOrganization(orgId),
  fetchSimilarDogs(breed)
])
```

### 2. No Barrel File Imports

```tsx
// Bad: imports entire library
import { Heart, Search, Filter } from 'lucide-react'

// Good: imports only what you need
import Heart from 'lucide-react/dist/esm/icons/heart'
import Search from 'lucide-react/dist/esm/icons/search'
import Filter from 'lucide-react/dist/esm/icons/filter'
```

**Alternative:** Use `optimizePackageImports` in `next.config.js`.

### 3. Dynamic Import for Heavy Components

```tsx
// Bad: Heavy component bundles with main chunk
import { DogGallery } from './DogGallery'

// Good: Loads on demand
import dynamic from 'next/dynamic'
const DogGallery = dynamic(
  () => import('./DogGallery').then(m => m.DogGallery),
  { ssr: false, loading: () => <GallerySkeleton /> }
)
```

### 4. Functional setState for Current-State Updates

```tsx
// Bad: stale closure risk, unstable callback
const addFavorite = useCallback((dogId: number) => {
  setFavorites([...favorites, dogId])
}, [favorites])

// Good: stable callback, always fresh state
const addFavorite = useCallback((dogId: number) => {
  setFavorites(curr => [...curr, dogId])
}, [])
```

### 5. Use toSorted() Instead of sort()

```tsx
// Bad: mutates original array (breaks React immutability)
const sorted = dogs.sort((a, b) => a.name.localeCompare(b.name))

// Good: creates new array
const sorted = dogs.toSorted((a, b) => a.name.localeCompare(b.name))
```

### 6. No Link or Client Components in Long Lists

```tsx
// Bad: 50+ Link components cause hydration lag
{dogs.map(dog => (
  <Link key={dog.id} href={`/dogs/${dog.slug}`}>
    <DogCard dog={dog} />
  </Link>
))}

// Good: plain <a> tags for static/SEO pages with many items
{dogs.map(dog => (
  <a key={dog.id} href={`/dogs/${dog.slug}`}>
    <DogCard dog={dog} />
  </a>
))}
```

**Rule: Never use React Link or Client Components in lists with 20+ items on static pages.**

---

## Eliminating Waterfalls

**Impact: CRITICAL** - Each sequential await adds full network latency.

### Promise.all() for Independent Operations

```tsx
// Bad: sequential execution, 3 round trips
const dog = await fetchDog(slug)
const organization = await fetchOrganization(dog.organizationId)
const breeds = await fetchBreeds()

// Good: parallel execution where possible
const dogPromise = fetchDog(slug)
const breedsPromise = fetchBreeds()
const dog = await dogPromise
const [organization, breeds] = await Promise.all([
  fetchOrganization(dog.organizationId),
  breedsPromise
])
```

### Strategic Suspense Boundaries

Show wrapper UI immediately while data loads:

```tsx
// Bad: wrapper blocked by data fetching
async function DogPage({ params }: { params: { slug: string } }) {
  const dog = await fetchDog(params.slug)  // Blocks entire page
  return (
    <div>
      <Header />
      <DogProfile dog={dog} />
      <Footer />
    </div>
  )
}

// Good: wrapper shows immediately, data streams in
function DogPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <Header />
      <Suspense fallback={<ProfileSkeleton />}>
        <DogProfile slug={params.slug} />
      </Suspense>
      <Footer />
    </div>
  )
}

async function DogProfile({ slug }: { slug: string }) {
  const dog = await fetchDog(slug)  // Only blocks this component
  return <div>{dog.name}</div>
}
```

---

## Bundle Size Optimization

**Impact: CRITICAL** - Reducing bundle size improves Time to Interactive.

### Avoid Barrel File Imports

```tsx
// Bad: loads entire library
import { Heart, Search } from 'lucide-react'

// Good: loads only needed icons
import Heart from 'lucide-react/dist/esm/icons/heart'
import Search from 'lucide-react/dist/esm/icons/search'
```

**Next.js 13.5+ alternative:**

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  }
}
```

### Dynamic Imports for Heavy Components

```tsx
import dynamic from 'next/dynamic'

// Heavy gallery component loads on demand
const DogGallery = dynamic(
  () => import('@/components/dogs/DogGallery'),
  { ssr: false, loading: () => <GallerySkeleton /> }
)
```

### Defer Non-Critical Third-Party Libraries

```tsx
// Bad: blocks initial bundle
import { Analytics } from '@vercel/analytics/react'

// Good: loads after hydration
import dynamic from 'next/dynamic'
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

---

## Server-Side Performance

**Impact: HIGH** - Optimizing server-side rendering eliminates server waterfalls.

### Parallel Data Fetching with Component Composition

```tsx
// Bad: Sidebar waits for Page's fetch
export default async function DogPage({ params }: { params: { slug: string } }) {
  const dog = await fetchDog(params.slug)
  return (
    <div>
      <DogProfile dog={dog} />
      <SimilarDogs breed={dog.breed} />
    </div>
  )
}

// Good: both fetch simultaneously
async function DogProfile({ slug }: { slug: string }) {
  const dog = await fetchDog(slug)
  return <div>{dog.name}</div>
}

async function SimilarDogs({ slug }: { slug: string }) {
  const dog = await fetchDog(slug)  // Deduplicated by React.cache
  const similar = await fetchSimilarDogs(dog.breed)
  return <DogGrid dogs={similar} />
}

export default function DogPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <DogProfile slug={params.slug} />
      <Suspense fallback={<GridSkeleton />}>
        <SimilarDogs slug={params.slug} />
      </Suspense>
    </div>
  )
}
```

### Minimize Data Passed to Client Components

```tsx
// Bad: serializes all 30+ fields
async function DogPage({ params }: { params: { slug: string } }) {
  const dog = await fetchDog(params.slug)  // 30+ fields
  return <DogCard dog={dog} />
}

// Good: serializes only needed fields
async function DogPage({ params }: { params: { slug: string } }) {
  const dog = await fetchDog(params.slug)
  return <DogCard name={dog.name} imageUrl={dog.image_url} breed={dog.breed} />
}
```

---

## Client-Side Data Fetching

**Impact: MEDIUM-HIGH** - Automatic deduplication reduces redundant requests.

### Use SWR or React Query for Client Fetching

```tsx
import useSWR from 'swr'

// Multiple components using this hook share a single fetch
function useDog(slug: string) {
  return useSWR(`/api/dogs/${slug}`, fetcher)
}

function useFavorites() {
  return useSWR('/api/favorites', fetcher)
}
```

### Use Passive Event Listeners for Scrolling

```typescript
useEffect(() => {
  const handleScroll = () => setScrollY(window.scrollY)

  // Good: enables immediate scrolling
  window.addEventListener('scroll', handleScroll, { passive: true })

  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

---

## Re-render Optimization

**Impact: MEDIUM** - Reducing unnecessary re-renders minimizes wasted computation.

### Use Functional setState Updates

```tsx
// Bad: requires favorites as dependency
const addFavorite = useCallback((dogId: number) => {
  setFavorites([...favorites, dogId])
}, [favorites])

// Good: stable callback, always uses latest state
const addFavorite = useCallback((dogId: number) => {
  setFavorites(curr => [...curr, dogId])
}, [])
```

### Use Lazy State Initialization

```tsx
// Bad: buildFilterOptions() runs on EVERY render
const [filters, setFilters] = useState(buildFilterOptions(breeds))

// Good: runs only once
const [filters, setFilters] = useState(() => buildFilterOptions(breeds))
```

### Narrow Effect Dependencies

```tsx
// Bad: re-runs on any dog field change
useEffect(() => {
  trackView(dog.id)
}, [dog])

// Good: re-runs only when id changes
useEffect(() => {
  trackView(dog.id)
}, [dog.id])
```

### Use Transitions for Non-Urgent Updates

```tsx
import { startTransition } from 'react'

function FilterPanel({ onFilterChange }: { onFilterChange: (filters: Filters) => void }) {
  const handleChange = (newFilters: Filters) => {
    // Filter changes are non-urgent, don't block typing
    startTransition(() => {
      onFilterChange(newFilters)
    })
  }
}
```

---

## Rendering Performance

**Impact: MEDIUM** - Optimizing rendering reduces browser work.

### CSS content-visibility for Long Lists

```css
.dog-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 320px;
}
```

For 100+ dog cards, browser skips layout/paint for off-screen items.

### Hoist Static JSX Elements

```tsx
// Bad: recreates element every render
function DogGrid({ dogs, isLoading }: Props) {
  return isLoading && <div className="animate-pulse h-20 bg-gray-200" />
}

// Good: reuses same element
const loadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />

function DogGrid({ dogs, isLoading }: Props) {
  return isLoading && loadingSkeleton
}
```

### Use Explicit Conditional Rendering

```tsx
// Bad: renders "0" when count is 0
{favoriteCount && <Badge>{favoriteCount}</Badge>}

// Good: renders nothing when count is 0
{favoriteCount > 0 ? <Badge>{favoriteCount}</Badge> : null}
```

---

## Code Review Checklist

### Must Pass (PR Blockers)

- [ ] No sequential awaits for independent operations - use `Promise.all()`
- [ ] No barrel file imports - import directly or use `optimizePackageImports`
- [ ] Heavy components use `next/dynamic` with `ssr: false`
- [ ] State updates based on current value use functional `setState`
- [ ] Array sorting uses `toSorted()` not `sort()`
- [ ] No `Link` or client components in lists with 20+ items (static pages)
- [ ] Suspense boundaries around async components

### Should Check

- [ ] Server components fetch in parallel (composition pattern)
- [ ] Only necessary fields passed to client components
- [ ] `useMemo`/`useCallback` for expensive computations
- [ ] Effect dependencies are primitives, not objects
- [ ] `{ passive: true }` on scroll/touch listeners
- [ ] `content-visibility: auto` on long lists

### Red Flags

- [ ] Barrel imports from large libraries
- [ ] Sequential awaits in the same function
- [ ] `sort()` instead of `toSorted()` on state/props
- [ ] Objects in `useEffect` dependency arrays
- [ ] Full objects passed across Server/Client boundary
- [ ] Missing Suspense boundaries for slow data fetches

---

## Quick Reference

| Do | Don't |
|----|-------|
| `Promise.all([a(), b(), c()])` | Sequential `await a(); await b()` |
| Direct imports `lucide-react/dist/esm/icons/x` | Barrel imports `lucide-react` |
| `next/dynamic` for heavy components | Static imports for everything |
| `setState(curr => [...curr, item])` | `setState([...items, item])` |
| `dogs.toSorted()` | `dogs.sort()` on state/props |
| `useEffect(() => {}, [dog.id])` | `useEffect(() => {}, [dog])` |
| `content-visibility: auto` on lists | Render all items at once |
| `{ passive: true }` on scroll | Non-passive scroll listeners |
| Suspense around slow components | Await at page level |
| Plain `<a>` in long static lists | `<Link>` in lists with 20+ items |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-24 | Initial guidelines created, adapted from berlin-sun-seeker |
