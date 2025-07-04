# Frontend Development Guide

## Next.js 15 App Router Patterns

### Component Structure

```jsx
// Always functional components with TypeScript
export default function DogCard({ dog }: { dog: Dog }) {
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
const { data, error, isLoading } = useSWR<Dog[]>("/api/v1/dogs", fetcher);
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

## Testing Requirements

- Render tests for all components
- User interaction tests (click, keyboard)
- Accessibility tests (ARIA, labels)
- Mobile responsiveness tests
- Error state tests

## Performance

- Lazy load images
- Virtualize long lists
- Optimize bundle size
- Minimize re-renders
