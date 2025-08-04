# Frontend Development Guide

## Next.js 15 App Router Patterns

### Component Structure

```jsx
// Always functional components with TypeScript
export default function DogCard({ dog }: { dog: Animal }) {
  // Hooks first
  const [favorited, setFavorited] = useState(false);

  // Event handlers
  const handleFavorite = () => setFavorited(!favorited);

  // Early returns
  if (!dog) return null;

  // Main render
  return <div>...</div>;
}
```

### State Management

- **NEVER mutate** - always create new objects/arrays
- Use `useState` for local state
- Use context for cross-component state
- No localStorage (breaks in Claude artifacts)

### Common Patterns

#### API Calls

```typescript
const { data, error, isLoading } = useSWR<Animal[]>("/api/animals", fetcher);
```

#### Responsive Design

```jsx
// Mobile-first with Tailwind
<div className="p-4 md:p-6 lg:p-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

#### Error Boundaries

```jsx
if (error) return <ErrorMessage message="Failed to load dogs" />;
if (!data) return <LoadingSpinner />;
```

## Testing Requirements - UPDATED ARCHITECTURE

**See `TESTING.md` for complete testing boundaries and guidelines.**

### Jest Tests (Primary) - Fast & Reliable
- ✅ **Component logic and behavior** - all component rendering and interactions  
- ✅ **Mobile responsiveness** - viewport simulation with `matchMedia` mocks
- ✅ **API integrations** - mocked service responses for predictable testing
- ✅ **Search/filter functionality** - debouncing, validation, combinations
- ✅ **Error state handling** - controlled error scenarios
- ✅ **Accessibility testing** - ARIA, labels, keyboard navigation

### E2E Tests (Critical Flows Only) - Real Browser Validation
- ✅ **Critical user journeys** - complete workflows (home → search → detail → adoption)
- ✅ **Cross-browser compatibility** - real browser differences and quirks
- ✅ **Real network conditions** - timeout handling, error recovery
- ✅ **Actual navigation** - back/forward buttons, URL changes
- ✅ **Device emulation** - real mobile vs desktop behavior

### Testing Decision Rule:
```
Component/isolated behavior? → Jest
Critical user journey needing real browser? → E2E (if no Jest alternative)
```

## Performance

- Lazy load images
- Virtualize long lists
- Optimize bundle size
- Minimize re-renders
