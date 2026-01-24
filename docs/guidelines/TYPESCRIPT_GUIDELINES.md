# TypeScript Guidelines

> **Priorities:** Reliability > Simplicity > Performance > Maintainability

These guidelines ensure type safety without over-engineering. Every rule exists to prevent bugs, reduce complexity, or improve performance. Rules are enforced at PR review.

---

## Table of Contents

1. [Compiler Configuration](#compiler-configuration)
2. [Type Definitions](#type-definitions)
3. [Function Signatures](#function-signatures)
4. [Import Organization](#import-organization)
5. [Error Handling](#error-handling)
6. [React Patterns](#react-patterns)
7. [Next.js Patterns](#nextjs-patterns)
8. [State Management](#state-management)
9. [Async Patterns](#async-patterns)
10. [Performance](#performance)
11. [Runtime Validation](#runtime-validation)
12. [Testing](#testing)
13. [Code Review Checklist](#code-review-checklist)

---

## Compiler Configuration

### Non-Negotiable Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

- **Never disable `strict`** - it catches real bugs
- **Keep `skipLibCheck: true`** - don't disable it; node_modules often have imperfect types
- **Never use `@ts-ignore`** - fix the error or use `@ts-expect-error` with explanation

### What `strict: true` Enables

| Check | What It Catches |
|-------|-----------------|
| `strictNullChecks` | Accessing `.foo` on potentially `null` values |
| `noImplicitAny` | Untyped parameters that hide bugs |
| `strictFunctionTypes` | Callback type mismatches |
| `strictPropertyInitialization` | Uninitialized class properties |

---

## Type Definitions

### `interface` vs `type` - Preference, Not Mandate

```typescript
// Prefer type for consistency (unless you need declaration merging)
type Dog = {
  id: number;
  name: string;
  slug: string;
  breed: string | null;
  organization: Organization;
};

// Use type for unions, tuples, primitives (required)
type DogStatus = "available" | "adopted" | "pending";
type Coordinates = [number, number];
type DogId = number | string;

// interface is fine too - just be consistent within a file
interface DogCardProps {
  dog: Dog;
  onFavorite: (dogId: number) => void;
}
```

### Define Types Close to Usage

```typescript
// Good: Type defined in the file that uses it
// frontend/src/components/DogCard.tsx
type DogCardData = {
  id: number;
  name: string;
  imageUrl: string | null;
  breed: string | null;
};

// Bad: Separate types file for one-off types
// frontend/src/types/dog-card-data.ts  <-- Don't do this
```

**Exception:** Types used across 3+ files belong in a shared module.

### Avoid Type Gymnastics

```typescript
// Bad: Clever but unreadable
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// Good: Simple and clear
type PartialDog = {
  id?: number;
  name?: string;
};
```

**Rule:** If a type requires more than 10 seconds to understand, simplify it.

### Use Literal Types for Finite Sets

```typescript
// Good: Exhaustive, self-documenting
type AgeCategory = "puppy" | "young" | "adult" | "senior";
type EnergyLevel = "low" | "medium" | "high" | "very_high";

// Bad: Too broad, allows invalid states
type AgeCategory = string;
```

### `null` vs `undefined` - Both Are Valid

Both `null` and `undefined` are acceptable. Use consistent conventions:

```typescript
// undefined = "missing/not provided" (matches JS ecosystem)
function findDog(id: number): Dog | undefined {
  return dogs.get(id);  // Map.get returns T | undefined
}

// null = "explicitly empty" (good for API responses, database fields)
type DogBreed = string | null;  // null = "unknown breed" from API

// Optional props use undefined naturally
interface Props {
  dog?: Dog;  // undefined when not provided
}
```

---

## Function Signatures

### Explicit Return Types on Module APIs

```typescript
// Good: Explicit return type on public API
export function formatAge(months: number | null): string {
  if (months === null) return "Unknown";
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""}`;
}

// OK: Inference allowed for internal helpers
function capitalize(str: string) {  // Return type inferred as string
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

**Where required:** Exported functions, hook return types, API utilities.
**Where optional:** Small internal helpers, single-expression functions.

### Keep Parameter Lists Short

```typescript
// Bad: Too many parameters
function createDogCard(
  name: string,
  breed: string | null,
  age: number | null,
  imageUrl: string | null,
  organizationName: string,
  isFavorite: boolean
): DogCard

// Good: Group related parameters
type DogCardInput = {
  dog: { name: string; breed: string | null; age: number | null };
  organization: { name: string };
  imageUrl: string | null;
  isFavorite: boolean;
};

function createDogCard(input: DogCardInput): DogCard
```

**Rule:** Functions with 4+ parameters should use an options object.

### Use `satisfies` for Configuration Objects

```typescript
// Good: Type checking + literal inference
const apiConfig = {
  baseUrl: "/api",
  timeout: 30000,
  retries: 3,
} satisfies Partial<ApiConfig>;

// apiConfig.baseUrl is typed as "/api" (literal), not string
// Still validates against ApiConfig

// Bad: Type annotation loses literal types
const apiConfig: Partial<ApiConfig> = {
  baseUrl: "/api",  // typed as string, not "/api"
};
```

---

## Import Organization

### Use Type-Only Imports

```typescript
// Good: Separate type imports
import { fetchDogs } from "@/lib/api";
import type { Dog, Organization } from "@/lib/api";

// Also good: Inline type import
import { fetchDogs, type Dog } from "@/lib/api";

// Bad: No distinction (bundles unnecessary code)
import { fetchDogs, Dog } from "@/lib/api";
```

### Import Order

```typescript
// 1. React/framework imports
import { useState, useCallback } from "react";

// 2. External libraries
import { useQuery } from "@tanstack/react-query";

// 3. Internal absolute imports (with @/ alias)
import { fetchDogs } from "@/lib/api";
import type { Dog } from "@/lib/api";

// 4. Relative imports
import { DogCard } from "./DogCard";
```

### No Barrel Files

```typescript
// Bad: Re-exporting from index.ts
// lib/index.ts
export * from "./api";
export * from "./utils";

// Good: Import directly from source
import { fetchDogs } from "@/lib/api";
import { formatAge } from "@/lib/utils";
```

**Why:** Barrel files cause circular dependencies and slow builds.

---

## Error Handling

### Use Union Types for Expected Errors

```typescript
// Good: Error is part of the type
type FetchResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string };

async function fetchDogs(): Promise<FetchResult<Dog[]>> {
  try {
    const response = await fetch("/api/dogs");
    if (!response.ok) {
      return { status: "error", message: `HTTP ${response.status}` };
    }
    return { status: "success", data: await response.json() };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Unknown error" };
  }
}
```

### Narrow Unknown Errors

```typescript
// Good: Type guard for error
try {
  await fetchData();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Fetch failed:", message);
}

// Bad: Assumes error shape
try {
  await fetchData();
} catch (error) {
  console.error(error.message);  // Error: 'error' is of type 'unknown'
}
```

### Handle Abort Signals

```typescript
useEffect(() => {
  const controller = new AbortController();

  async function load() {
    try {
      const res = await fetch("/api/dogs", { signal: controller.signal });
      setDogs(await res.json());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;  // Normal cleanup, not an error
      }
      setError("Failed to load dogs");
    }
  }

  load();
  return () => controller.abort();
}, []);
```

---

## React Patterns

### Component Props

```typescript
type DogCardProps = {
  dog: Dog;
  onFavorite: (dogId: number) => void;
  isFavorite?: boolean;
};

export function DogCard({ dog, onFavorite, isFavorite = false }: DogCardProps) {
  // ...
}
```

### Custom Hook Return Types

```typescript
// Good: Explicit return interface for hooks
type UseFavoritesResult = {
  favorites: Set<number>;
  addFavorite: (dogId: number) => void;
  removeFavorite: (dogId: number) => void;
  isFavorite: (dogId: number) => boolean;
};

export function useFavorites(): UseFavoritesResult {
  // ... implementation
  return { favorites, addFavorite, removeFavorite, isFavorite };
}
```

---

## Next.js Patterns

### Server/Client Serialization Boundary

**Critical:** `Map`, `Set`, `Date`, and class instances don't survive Server->Client serialization.

```typescript
// BAD: Map doesn't serialize across boundary
// Server Component
async function DogsPage() {
  const dogs = new Map<number, Dog>();  // Won't work!
  return <DogList dogs={dogs} />;
}

// GOOD: Use plain objects/arrays for boundary crossing
// Server Component
async function DogsPage() {
  const dogs: Dog[] = await fetchDogs();  // Plain array
  return <DogList dogs={dogs} />;
}

// Client Component - hydrate to Map if needed
"use client";
function DogList({ dogs }: { dogs: Dog[] }) {
  const dogMap = useMemo(
    () => new Map(dogs.map(d => [d.id, d])),
    [dogs]
  );
  // Now use dogMap for O(1) lookups
}
```

### Type-Safe Route Handlers

```typescript
// app/api/dogs/route.ts
import type { NextRequest } from "next/server";

type DogsResponse = {
  dogs: Dog[];
  total: number;
};

export async function GET(request: NextRequest): Promise<Response> {
  const dogs = await fetchDogs();
  const response: DogsResponse = { dogs, total: dogs.length };
  return Response.json(response);
}
```

---

## State Management

### Use Discriminated Unions for Complex State

```typescript
type DogsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; dogs: Dog[] }
  | { status: "error"; error: string };

const [state, setState] = useState<DogsState>({ status: "idle" });

// TypeScript enforces handling all cases
switch (state.status) {
  case "idle": return <button onClick={load}>Load Dogs</button>;
  case "loading": return <Spinner />;
  case "success": return <DogGrid dogs={state.dogs} />;
  case "error": return <Error message={state.error} />;
}
```

### Type useState with Complex Objects

```typescript
// Good: Explicit type parameter
const [favorites, setFavorites] = useState<Set<number>>(new Set());

// Bad: Inferred as Set<never>
const [favorites, setFavorites] = useState(new Set());
```

### Avoid Boolean State Combinations

```typescript
// Bad: Invalid state possible (loading AND error)
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [dogs, setDogs] = useState<Dog[] | null>(null);

// Good: Single state, impossible to be inconsistent
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; dogs: Dog[] }
  | { status: "error"; error: string };

const [state, setState] = useState<State>({ status: "idle" });
```

---

## Async Patterns

### Type Async Function Returns

```typescript
// Good: Explicit Promise return type on APIs
export async function fetchDogs(filters?: DogFilters): Promise<Dog[]> {
  const response = await fetch(buildUrl("/api/dogs", filters));
  return response.json();
}

// For void async functions
async function trackPageView(page: string): Promise<void> {
  await fetch("/api/analytics", { method: "POST", body: page });
}
```

---

## Performance

### Map/Set for Frequent Lookups on Large Datasets

Use `Map`/`Set` when:
- Dataset is large (100+ items)
- Lookups are frequent (called in loops, on every render)
- You need O(1) behavior

```typescript
// Good: Large dataset, frequent lookups
const dogsById = new Map<number, Dog>();  // 1500+ dogs
function findDog(id: number): Dog | undefined {
  return dogsById.get(id);  // O(1)
}

// Fine: Small array, one-off lookup
const filters = ["size", "age", "breed"];
const hasBreed = filters.includes("breed");  // O(n) is fine for 3 items
```

**Warning:** Map/Set don't serialize. Don't pass them across Server/Client boundary.

### Memoize Expensive Computations

```typescript
const filteredDogs = useMemo(
  () => dogs.filter(d => d.breed === selectedBreed),
  [dogs, selectedBreed]
);

const handleFavorite = useCallback(
  (dogId: number) => setFavorites(prev => new Set([...prev, dogId])),
  []
);
```

---

## Runtime Validation

### Use Zod for External Data

For API responses and untrusted data, use schema validation:

```typescript
import { z } from "zod";

// Define schema
const DogSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  breed: z.string().nullable(),
  age_months: z.number().nullable(),
});

const DogsResponseSchema = z.object({
  dogs: z.array(DogSchema),
  total: z.number(),
});

// Infer TypeScript type from schema
type Dog = z.infer<typeof DogSchema>;

// Validate at runtime
async function fetchDogs(): Promise<Dog[]> {
  const response = await fetch("/api/dogs");
  const data = await response.json();
  const parsed = DogsResponseSchema.parse(data);  // Throws if invalid
  return parsed.dogs;
}
```

**When to use:**
- API responses
- URL parameters / search params
- localStorage data
- File contents (JSON)

---

## Testing

### Type Test Fixtures

```typescript
const mockDog: Dog = {
  id: 1,
  name: "Buddy",
  slug: "buddy-123",
  breed: "Labrador",
  age_months: 24,
};

// Factory function for variations
function createMockDog(overrides: Partial<Dog> = {}): Dog {
  return {
    id: 1,
    name: "Buddy",
    slug: "buddy-123",
    breed: "Labrador",
    age_months: 24,
    ...overrides,
  };
}
```

### Avoid `any` in Tests

```typescript
// Bad: Loses type checking
const mockData: any = { foo: "bar" };

// Good: Type the mock
const mockData: Partial<DogsResponse> = { dogs: [] };

// Good: unknown for truly untrusted data
const untrustedData: unknown = JSON.parse(jsonString);
```

---

## Code Review Checklist

### Must Pass (PR Blockers)

- [ ] `pnpm build` succeeds with no type errors
- [ ] `pnpm test` passes all tests
- [ ] No `any` types (use `unknown` + validation or Zod)
- [ ] No `@ts-ignore` (use `@ts-expect-error` with explanation if needed)
- [ ] Module API functions have explicit return types
- [ ] Type imports use `import type` syntax

### Should Check

- [ ] Union types are exhaustively handled (switch/if)
- [ ] Error states are typed and handled
- [ ] No unnecessary type assertions (`as`)
- [ ] Complex state uses discriminated unions
- [ ] External data validated with Zod
- [ ] Map/Set not passed across Server/Client boundary

### Red Flags

- [ ] Generic types with 3+ type parameters
- [ ] Functions with 5+ parameters
- [ ] Type definitions longer than 20 lines
- [ ] `// eslint-disable` without explanation

---

## Quick Reference

| Do | Don't |
|----|-------|
| `type` or `interface` (be consistent) | Bikeshed about which to use |
| `type Status = "a" \| "b"` for unions | `type Status = string` |
| `import type { Foo }` | `import { Foo }` for types |
| Explicit return types on APIs | Explicit returns on every function |
| `undefined` or `null` (be consistent) | Force `null` everywhere |
| `unknown` + Zod validation | `any` or manual type guards |
| `Map<K, V>` for large/frequent lookups | `Map` for everything |
| Options object for 4+ params | Long parameter lists |
| Discriminated union for state | Multiple boolean flags |
| `satisfies` for configs | Type annotation losing literals |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-24 | Initial guidelines created, adapted from berlin-sun-seeker |
