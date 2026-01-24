# Web Design Guidelines

> **Priorities:** Accessibility > Usability > Performance > Polish
>
> These guidelines ensure web interfaces are accessible, usable, and polished. Rules are enforced at PR review.
>
> **Based on:** [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) (January 2026)

---

## Table of Contents

1. [Non-Negotiable (PR Blockers)](#non-negotiable-pr-blockers)
2. [Accessibility](#accessibility) - CRITICAL
3. [Focus States](#focus-states) - CRITICAL
4. [Forms](#forms) - HIGH
5. [Animation](#animation) - HIGH
6. [Typography](#typography) - MEDIUM
7. [Content Handling](#content-handling) - MEDIUM
8. [Images](#images) - MEDIUM
9. [Touch & Interaction](#touch--interaction) - MEDIUM
10. [Navigation & State](#navigation--state) - MEDIUM
11. [i18n Formatting](#i18n-formatting) - MEDIUM
12. [Microcopy](#microcopy) - LOW
13. [Code Review Checklist](#code-review-checklist)

---

## Non-Negotiable (PR Blockers)

These are hard requirements. PRs that violate them will be rejected.

### 1. Interactive Elements Need Accessible Labels

```tsx
// Bad: no accessible name
<button onClick={onFavorite}>
  <HeartIcon />
</button>

// Good: aria-label for icon-only buttons
<button onClick={onFavorite} aria-label="Add to favorites">
  <HeartIcon aria-hidden="true" />
</button>
```

### 2. Interactive Elements Need Keyboard Handlers

```tsx
// Bad: div with only onClick
<div onClick={handleSelect} className="dog-card">
  {dog.name}
</div>

// Good: semantic button or proper keyboard support
<button onClick={handleSelect} className="dog-card">
  {dog.name}
</button>

// If div is required, add full keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleSelect}
  onKeyDown={(e) => e.key === 'Enter' && handleSelect()}
  className="dog-card"
>
  {dog.name}
</div>
```

### 3. Never Remove Focus Outline Without Replacement

```css
/* Bad: removes focus indicator entirely */
button:focus {
  outline: none;
}

/* Good: custom focus ring */
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ring-color);
}
```

### 4. Honor prefers-reduced-motion

```css
/* Good: disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}

/* Better: use motion-safe for opt-in */
@media (prefers-reduced-motion: no-preference) {
  .animated-element {
    animation: fade-in 0.3s ease-out;
  }
}
```

### 5. Form Inputs Need Labels

```tsx
// Bad: no label
<input type="text" placeholder="Search dogs..." />

// Good: associated label
<label htmlFor="search">Search dogs</label>
<input id="search" type="text" placeholder="e.g., Labrador..." />

// Good: visually hidden label for minimal UI
<label htmlFor="search" className="sr-only">Search dogs</label>
<input id="search" type="text" placeholder="Search dogs..." />
```

---

## Accessibility

**Impact: CRITICAL** - Accessibility affects ~15-20% of users.

### Semantic HTML

```tsx
// Bad: divs for everything
<div onClick={goBack}>Back</div>
<div onClick={toggleFilters}>Filters</div>

// Good: semantic elements
<button onClick={goBack}>Back</button>
<button onClick={toggleFilters} aria-expanded={isOpen}>Filters</button>
<a href="/dogs">View all dogs</a>
<nav aria-label="Main navigation">...</nav>
```

### Images Need Alt Text

```tsx
// Bad: missing alt
<img src={dog.image_url} />

// Good: descriptive alt
<img src={dog.image_url} alt={`${dog.name}, a ${dog.breed || 'mixed breed'} dog`} />

// Good: empty alt for decorative images
<img src="/paw-pattern.svg" alt="" aria-hidden="true" />
```

### Announce Dynamic Updates

```tsx
// Bad: status change not announced
<div className={dog.status === 'available' ? 'text-green' : 'text-gray'}>
  {dog.status}
</div>

// Good: announced to screen readers
<div
  role="status"
  aria-live="polite"
  className={dog.status === 'available' ? 'text-green' : 'text-gray'}
>
  {dog.status === 'available' ? 'Available for adoption' : 'Adoption pending'}
</div>
```

### Heading Hierarchy

```tsx
// Bad: skipping heading levels
<h1>Rescue Dogs</h1>
<h4>Labrador Retrievers</h4>  {/* Skipped h2, h3 */}

// Good: proper hierarchy
<h1>Rescue Dogs</h1>
<h2>Labrador Retrievers</h2>
```

---

## Focus States

**Impact: CRITICAL** - Keyboard users cannot navigate without visible focus indicators.

### Use :focus-visible Over :focus

```css
/* Bad: focus ring on click too */
button:focus {
  box-shadow: 0 0 0 2px var(--ring-color);
}

/* Good: focus ring only for keyboard navigation */
button:focus-visible {
  box-shadow: 0 0 0 2px var(--ring-color);
}
```

### Consistent Focus Ring Styling

```css
:root {
  --focus-ring: 0 0 0 2px hsl(210, 100%, 50%);
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

---

## Forms

**Impact: HIGH** - Form usability directly affects conversion.

### Use Correct Input Types and Attributes

```tsx
// Bad: generic text input
<input type="text" name="email" />

// Good: correct type with autocomplete
<input
  type="email"
  name="email"
  autoComplete="email"
  inputMode="email"
  spellCheck={false}
/>

// Other common patterns
<input type="tel" autoComplete="tel" inputMode="tel" />
<input type="text" inputMode="numeric" pattern="[0-9]*" />
```

### Never Block Paste

```tsx
// Bad: prevents password managers
<input
  type="password"
  onPaste={(e) => e.preventDefault()}
/>

// Good: allow paste
<input type="password" autoComplete="current-password" />
```

### Clickable Labels and Combined Hit Targets

```tsx
// Bad: checkbox and label are separate click targets
<input type="checkbox" id="newsletter" />
<span onClick={toggle}>Subscribe to newsletter</span>

// Good: label wraps both for single hit target
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" />
  Subscribe to newsletter
</label>
```

### Keep Submit Button Enabled

```tsx
// Bad: disabled until form is valid (confusing UX)
<button type="submit" disabled={!isValid}>
  Search
</button>

// Good: enabled, show errors on submit attempt
<button type="submit">
  Search
</button>
```

### Focus First Error on Submit

```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const errors = validate(formData)

  if (errors.length > 0) {
    setErrors(errors)
    const firstErrorField = document.querySelector(`[name="${errors[0].field}"]`)
    if (firstErrorField instanceof HTMLElement) {
      firstErrorField.focus()
    }
    return
  }
}
```

---

## Animation

**Impact: HIGH** - Animations enhance UX but can cause motion sickness.

### Only Animate transform and opacity

```css
/* Bad: animates layout properties */
.drawer {
  transition: width 0.3s, height 0.3s;
}

/* Good: animates only composite properties */
.drawer {
  transition: transform 0.3s, opacity 0.3s;
  transform: translateX(-100%);
}

.drawer.open {
  transform: translateX(0);
}
```

### Never Use transition: all

```css
/* Bad: transitions everything including layout */
.button {
  transition: all 0.2s;
}

/* Good: explicit properties */
.button {
  transition: background-color 0.2s, box-shadow 0.2s;
}
```

---

## Typography

**Impact: MEDIUM** - Good typography improves readability.

### Use Proper Punctuation

```tsx
// Bad: typewriter punctuation
<p>Loading...</p>
<p>"Hello"</p>

// Good: typographic punctuation
<p>Loading...</p>          {/* Ellipsis character */}
<p>"Hello"</p>           {/* Curly quotes */}
```

### Text Wrapping for Headings

```css
h1, h2, h3 {
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}
```

---

## Content Handling

**Impact: MEDIUM** - Content overflow causes layout bugs.

### Handle Text Overflow

```tsx
// Bad: text overflows container
<div className="dog-name">{dog.name}</div>

// Good: truncate with ellipsis
<div className="dog-name truncate">{dog.name}</div>

// Good: clamp to N lines
<div className="dog-description line-clamp-2">{dog.description}</div>

// Good: break long words
<div className="dog-url break-words">{dog.website}</div>
```

### Flex Children Need min-w-0 for Truncation

```tsx
// Bad: truncate doesn't work in flex container
<div className="flex">
  <span className="truncate">{longDogName}</span>
</div>

// Good: min-w-0 allows flex child to shrink
<div className="flex">
  <span className="min-w-0 truncate">{longDogName}</span>
</div>
```

### Handle Empty States

```tsx
// Bad: blank screen when no dogs
{dogs.map(d => <DogCard key={d.id} dog={d} />)}

// Good: empty state with action
{dogs.length > 0 ? (
  dogs.map(d => <DogCard key={d.id} dog={d} />)
) : (
  <EmptyState
    message="No dogs found matching your filters"
    action={{ label: "Clear filters", onClick: clearFilters }}
  />
)}
```

---

## Images

**Impact: MEDIUM** - Missing dimensions cause layout shift.

### Always Set Width and Height

```tsx
// Bad: causes layout shift
<img src={dog.image_url} alt={dog.name} />

// Good: explicit dimensions prevent layout shift
<img
  src={dog.image_url}
  alt={dog.name}
  width={400}
  height={300}
/>

// Good: Next.js Image with fill
<div className="relative aspect-[4/3]">
  <Image src={dog.image_url} alt={dog.name} fill className="object-cover" />
</div>
```

### Lazy Load Below-Fold Images

```tsx
// Bad: all images load immediately
<img src={dog.image_url} alt={dog.name} width={400} height={300} />

// Good: native lazy loading
<img
  src={dog.image_url}
  alt={dog.name}
  width={400}
  height={300}
  loading="lazy"
/>
```

### Priority Load Above-Fold Images

```tsx
// Good: hero image loads with priority
<Image
  src={dog.image_url}
  alt={dog.name}
  width={800}
  height={600}
  priority
/>
```

---

## Touch & Interaction

**Impact: MEDIUM** - Touch behavior affects mobile experience.

### Apply touch-action: manipulation

```css
button, a, [role="button"] {
  touch-action: manipulation;
}
```

### Contain Scroll in Modals/Drawers

```css
.modal, .drawer, .bottom-sheet {
  overscroll-behavior: contain;
}
```

### Limit autoFocus to Desktop

```tsx
// Bad: keyboard pops up on mobile page load
<input autoFocus placeholder="Search..." />

// Good: only autoFocus on desktop
const isDesktop = useMediaQuery('(min-width: 768px)')
<input autoFocus={isDesktop} placeholder="Search..." />
```

---

## Navigation & State

**Impact: MEDIUM** - URL state enables sharing and bookmarking.

### URLs Reflect UI State

```tsx
// Good: filters in URL
// /dogs?breed=labrador&size=large&age=adult

function useUrlFilters() {
  const searchParams = useSearchParams()
  return {
    breed: searchParams.get('breed'),
    size: searchParams.get('size'),
    age: searchParams.get('age'),
  }
}
```

### Confirm Destructive Actions

```tsx
// Bad: immediate destructive action
<button onClick={removeFavorite}>Remove</button>

// Good: confirmation for important actions
<AlertDialog>
  <AlertDialogTrigger asChild>
    <button>Remove from favorites</button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Remove {dog.name}?</AlertDialogTitle>
    <AlertDialogAction onClick={removeFavorite}>Remove</AlertDialogAction>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
  </AlertDialogContent>
</AlertDialog>
```

---

## i18n Formatting

**Impact: MEDIUM** - Hardcoded formats break for international users.

### Use Intl for Dates and Numbers

```tsx
// Bad: hardcoded format
function formatAge(months: number): string {
  return `${months} months`
}

// Good: could be extended for localization
function formatAge(months: number, locale: string = 'en'): string {
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'year' : 'years'}`
}
```

---

## Microcopy

**Impact: LOW** - Good microcopy improves UX polish.

### Specific Button Labels

```tsx
// Bad: generic labels
<button>Submit</button>
<button>OK</button>

// Good: specific action
<button>Find Dogs</button>
<button>Add to Favorites</button>
```

### Error Messages Include Fixes

```tsx
// Bad: just states the problem
<p className="error">Invalid age</p>

// Good: explains how to fix
<p className="error">
  Please select an age category (puppy, young, adult, or senior)
</p>
```

---

## Code Review Checklist

### Must Pass (PR Blockers)

- [ ] Icon-only buttons have `aria-label`
- [ ] Interactive elements are keyboard-accessible
- [ ] Focus states visible (`focus-visible` ring)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Form inputs have associated labels
- [ ] Images have `alt` text

### Should Check

- [ ] Semantic HTML used (`<button>`, `<a>`, `<nav>`)
- [ ] Heading hierarchy is correct
- [ ] Proper input types and `autoComplete`
- [ ] Text overflow handled
- [ ] Empty states provided
- [ ] Images have explicit dimensions
- [ ] Below-fold images use `loading="lazy"`

### Red Flags

- [ ] `<div onClick>` without keyboard support
- [ ] `outline: none` without focus replacement
- [ ] `transition: all`
- [ ] `onPaste` with `preventDefault`
- [ ] Images without dimensions
- [ ] Missing empty states

---

## Quick Reference

| Do | Don't |
|----|-------|
| `<button>` for actions | `<div onClick>` |
| `aria-label` on icon buttons | Icon-only without labels |
| `focus-visible` for focus ring | `outline: none` alone |
| `prefers-reduced-motion` check | Forced animations |
| `autoComplete` on inputs | Generic text inputs |
| Allow paste | Block paste |
| Explicit image dimensions | Images without w/h |
| `loading="lazy"` below fold | Eager load all |
| Empty states | Blank screens |
| Truncate long text | Text overflow |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-24 | Initial guidelines created, adapted from berlin-sun-seeker |
