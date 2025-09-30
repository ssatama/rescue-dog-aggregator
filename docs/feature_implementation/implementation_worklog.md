# Homepage Redesign - Implementation Worklog

**Status:** Ready for Implementation  
**Created:** 2025-09-30  
**Target:** Desktop/Tablet Homepage (≥640px)  
**PRD:** `docs/feature_implementation/homepage_redesign.md`

---

## Overview

This worklog breaks down the homepage redesign into 8 epics with detailed tasks. Each task follows TDD principles and includes acceptance criteria.

### Design Constraints
- **Breakpoints:** Use Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Mobile:** `<640px` - No changes (existing design stays)
- **Tablet/Desktop:** `≥640px` - Apply all redesign changes
- **Dark Mode:** Required for all new components
- **API:** No backend changes needed

---

## Epic 1: Hero Section Updates

**Goal:** Update existing Hero section with new copy and button structure per PRD.

### ✅ Task 1.1: Update Hero Copy
**Component:** `frontend/src/components/home/HeroSection.jsx`

**Changes Required:**
- [ ] Update headline from "Helping rescue dogs find loving homes" to "Find Your Perfect Rescue Dog"
- [ ] Update subtitle to "Browse 3,186 dogs aggregated from 13 rescue organizations across Europe and UK. Adopt Don't Shop."
- [ ] Remove the "About Our Mission" button (third button)
- [ ] Update primary CTA button text to "Browse All Dogs" (links to /dogs)
- [ ] Update secondary CTA button text to "🐾 Quick Browse Dogs" (links to /swipe)
- [ ] Keep stats card unchanged (right column)
- [ ] Maintain existing responsive layout

**Acceptance Criteria:**
- Headline matches PRD exactly
- Subtitle includes dynamic dog count (use `statistics.total_dogs`)
- Only 2 buttons total (remove third button)
- Primary button text is "Browse All Dogs" and links to `/dogs`
- Secondary button text is "🐾 Quick Browse Dogs" and links to `/swipe`
- Dark mode styling preserved
- Tests pass

**Files to Modify:**
- `frontend/src/components/home/HeroSection.jsx`

---

### ✅ Task 1.2: Write Tests for Updated Hero
**Component:** `frontend/src/components/home/__tests__/HeroSection.test.jsx`

**Test Cases:**
- [ ] Renders new headline "Find Your Perfect Rescue Dog"
- [ ] Renders new subtitle with correct text
- [ ] Primary CTA button text is "Browse All Dogs"
- [ ] Secondary CTA button text is "🐾 Quick Browse Dogs"
- [ ] Primary CTA links to `/dogs`
- [ ] Secondary CTA links to `/swipe`
- [ ] Statistics card renders with data
- [ ] Dark mode classes applied correctly

**Acceptance Criteria:**
- All existing tests still pass
- New tests cover updated copy
- No test count decrease

**Files to Modify:**
- `frontend/src/components/home/__tests__/HeroSection.test.jsx`

---

### ✅ Task 1.3: Verify Responsive Behavior
**Testing Task**

**Manual Testing:**
- [ ] Test at 640px (sm breakpoint)
- [ ] Test at 768px (md breakpoint)
- [ ] Test at 1024px (lg breakpoint)
- [ ] Test at 1280px+ (xl breakpoint)
- [ ] Verify stats card layout on each breakpoint
- [ ] Test dark mode at all breakpoints

**Acceptance Criteria:**
- Hero section looks good at all breakpoints ≥640px
- No layout breaks
- CTA buttons remain accessible

---

## Epic 2: Platform Capabilities Section (New)

**Goal:** Create new "Three Ways to Find Your Dog" section with 3 capability cards showing visual previews.

### ✅ Task 2.1: Create PlatformCapabilities Container Component
**Component:** `frontend/src/components/home/PlatformCapabilities.tsx` (new file)

**Requirements:**
- [ ] Create container component with section header
- [ ] Section background: Cream (#FFF8F0) in light mode
- [ ] Dark mode background: dark:bg-gray-900
- [ ] Section padding: 100px vertical (py-24)
- [ ] Max-width: 1280px centered
- [ ] Headline: "Three Ways to Find Your Dog"
- [ ] Subheading: "Choose the approach that fits your search style"
- [ ] 3-column grid on desktop (≥1280px using xl:grid-cols-3)
- [ ] Single column on tablet (grid-cols-1)
- [ ] Gap between cards: 24px (gap-6)

**Acceptance Criteria:**
- Component renders with correct layout
- Header typography matches PRD
- Responsive grid works at all breakpoints
- Dark mode styling applied
- Passes linting

**Files to Create:**
- `frontend/src/components/home/PlatformCapabilities.tsx`

**Example Structure:**
```tsx
export default function PlatformCapabilities() {
  return (
    <section className="bg-[#FFF8F0] dark:bg-gray-900 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Three Ways to Find Your Dog
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the approach that fits your search style
          </p>
        </div>
        
        {/* Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Cards will go here */}
        </div>
      </div>
    </section>
  );
}
```

---

### ✅ Task 2.2: Create CapabilityCard Base Component
**Component:** `frontend/src/components/home/CapabilityCard.tsx` (new file)

**Requirements:**
- [ ] Reusable card component for all 3 capability cards
- [ ] Props: `visual`, `headline`, `description`, `badge`, `ctaText`, `ctaHref`
- [ ] Height: 480px
- [ ] Background: White (dark:bg-gray-800)
- [ ] Border radius: 12px (rounded-xl)
- [ ] Shadow: 0 2px 8px rgba(0,0,0,0.08)
- [ ] Hover: translateY(-4px) + shadow increase
- [ ] Padding: 32px (p-8)
- [ ] Visual preview area at top (200px height)
- [ ] Content area below with headline, description, badge, CTA
- [ ] Entire card is clickable link (Next.js Link wrapper)
- [ ] CTA button: Orange with arrow (→)

**Acceptance Criteria:**
- Card renders with all props
- Hover animation smooth
- Link wraps entire card
- Dark mode styling applied
- TypeScript types defined
- Passes linting

**Files to Create:**
- `frontend/src/components/home/CapabilityCard.tsx`

**Example Structure:**
```tsx
interface CapabilityCardProps {
  visual: React.ReactNode;
  headline: string;
  description: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
}

export default function CapabilityCard({
  visual,
  headline,
  description,
  badge,
  ctaText,
  ctaHref,
}: CapabilityCardProps) {
  return (
    <Link href={ctaHref} className="block group">
      <div className="h-[480px] bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col">
        {/* Visual Preview Area */}
        <div className="h-[200px] mb-6 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          {visual}
        </div>
        
        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {headline}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">
          {description}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          {badge}
        </div>
        
        {/* CTA Button */}
        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          {ctaText}
        </button>
      </div>
    </Link>
  );
}
```

---

### ✅ Task 2.3: Create AdvancedSearchPreview Component (Card 1)
**Component:** `frontend/src/components/home/previews/AdvancedSearchPreview.tsx` (new file)

**Requirements:**
- [ ] Visual mockup showing search filters (non-functional)
- [ ] Breed search input (disabled)
- [ ] Size filter chips: Small, Medium, Large (static, styled like selected)
- [ ] Location input with pin icon (disabled)
- [ ] Age filter chips: Puppy, Young, Adult (static)
- [ ] All inputs use existing component styles
- [ ] Layout fits in 200px height container
- [ ] Dark mode support

**Content:**
- Headline: "Advanced Search"
- Description: "Filter 3,186 dogs by breed, age, size, gender, and location"
- Badge: "50+ breeds · 13 rescues · 9 countries"
- CTA: "Start Searching →"
- Link: `/dogs`

**Acceptance Criteria:**
- Preview looks like actual /dogs filter sidebar
- All inputs disabled/non-interactive
- Styling matches existing filter components
- Dark mode works
- Fits in card layout

**Files to Create:**
- `frontend/src/components/home/previews/AdvancedSearchPreview.tsx`

**Example Structure:**
```tsx
export default function AdvancedSearchPreview() {
  return (
    <div className="w-full space-y-3 scale-90">
      {/* Breed Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search breeds..."
          disabled
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
        />
      </div>
      
      {/* Size Filters */}
      <div className="flex gap-2">
        {['Small', 'Medium', 'Large'].map((size) => (
          <span
            key={size}
            className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full"
          >
            {size}
          </span>
        ))}
      </div>
      
      {/* Location */}
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400">📍</span>
        <input
          type="text"
          placeholder="Location"
          disabled
          className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
        />
      </div>
      
      {/* Age Filters */}
      <div className="flex gap-2">
        {['Puppy', 'Young', 'Adult'].map((age) => (
          <span
            key={age}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full"
          >
            {age}
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

### ✅ Task 2.4: Create PersonalityBarsPreview Component (Card 2)
**Component:** `frontend/src/components/home/previews/PersonalityBarsPreview.tsx` (new file)

**Requirements:**
- [ ] 4 personality bars with labels and percentages
- [ ] Affectionate: 78% (purple gradient: from-purple-400 to-purple-600)
- [ ] Energetic: 65% (orange gradient: from-orange-400 to-orange-600)
- [ ] Intelligent: 82% (blue gradient: from-blue-400 to-blue-600)
- [ ] Trainability: 75% (green gradient: from-green-400 to-green-600)
- [ ] Each bar: label on left, percentage on right, gradient bar below
- [ ] Bar height: 8px, rounded
- [ ] Spacing between bars: 16px (space-y-4)
- [ ] Dark mode: darker gradients

**Content:**
- Headline: "Match by Personality"
- Description: "Every breed analyzed for traits like energy level, affection, and trainability"
- Badge: "Data from 2,500+ profiles"
- CTA: "Explore Breeds →"
- Link: `/breeds`

**Acceptance Criteria:**
- 4 bars render with correct percentages
- Gradients match PRD colors
- Layout clean and readable
- Dark mode gradients adjusted
- Fits in card layout

**Files to Create:**
- `frontend/src/components/home/previews/PersonalityBarsPreview.tsx`

**Example Structure:**
```tsx
const traits = [
  { name: 'Affectionate', value: 78, gradient: 'from-purple-400 to-purple-600' },
  { name: 'Energetic', value: 65, gradient: 'from-orange-400 to-orange-600' },
  { name: 'Intelligent', value: 82, gradient: 'from-blue-400 to-blue-600' },
  { name: 'Trainability', value: 75, gradient: 'from-green-400 to-green-600' },
];

export default function PersonalityBarsPreview() {
  return (
    <div className="w-full space-y-4 px-4">
      {traits.map((trait) => (
        <div key={trait.name}>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {trait.name}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {trait.value}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${trait.gradient}`}
              style={{ width: `${trait.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### ✅ Task 2.5: Create SwipePreview Component (Card 3)
**Component:** `frontend/src/components/home/previews/SwipePreview.tsx` (new file)

**Requirements:**
- [ ] Mini version of swipe card with static dog image
- [ ] Stacked card effect (2-3 cards layered)
- [ ] Top card shows: dog photo, name, breed
- [ ] Heart (❤️) and thumbs down (👎) buttons below
- [ ] Buttons styled like actual swipe buttons but static
- [ ] Use placeholder dog image or emoji
- [ ] Card background: light color (peach, blue, or green tint)
- [ ] Dark mode support

**Content:**
- Headline: "Quick Discovery"
- Description: "Not sure what you want? Swipe through dogs filtered by your country and size preferences"
- Badge: "Updated twice weekly"
- CTA: "Start Swiping →"
- Link: `/swipe`

**Acceptance Criteria:**
- Stacked card effect visible
- Looks like miniature swipe interface
- Buttons clearly visible
- Dark mode works
- Fits in card layout

**Files to Create:**
- `frontend/src/components/home/previews/SwipePreview.tsx`

**Example Structure:**
```tsx
export default function SwipePreview() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Back Cards (stacked effect) */}
      <div className="absolute top-4 w-32 h-40 bg-blue-200 dark:bg-blue-900 rounded-xl opacity-30 -rotate-6" />
      <div className="absolute top-2 w-32 h-40 bg-green-200 dark:bg-green-900 rounded-xl opacity-50 rotate-3" />
      
      {/* Front Card */}
      <div className="relative z-10 w-32 h-40 bg-orange-100 dark:bg-orange-900 rounded-xl shadow-lg flex flex-col items-center justify-center p-3">
        <div className="text-5xl mb-2">🐕</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">Bella</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Golden Retriever</div>
      </div>
      
      {/* Swipe Buttons */}
      <div className="flex gap-4 mt-6">
        <button className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center text-2xl border-2 border-gray-200 dark:border-gray-600">
          👎
        </button>
        <button className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center text-2xl border-2 border-red-200 dark:border-red-600">
          ❤️
        </button>
      </div>
    </div>
  );
}
```

---

### ✅ Task 2.6: Write Tests for Capability Components
**Component:** `frontend/src/components/home/__tests__/PlatformCapabilities.test.tsx` (new file)

**Test Cases:**
- [ ] PlatformCapabilities renders section header
- [ ] Renders 3 CapabilityCards
- [ ] CapabilityCard renders all props correctly
- [ ] CapabilityCard is clickable link
- [ ] AdvancedSearchPreview renders filter elements
- [ ] PersonalityBarsPreview renders 4 bars
- [ ] SwipePreview renders card stack and buttons
- [ ] Dark mode classes applied
- [ ] Hover states work

**Acceptance Criteria:**
- All components have tests
- Tests cover main functionality
- No console errors
- Test coverage >80%

**Files to Create:**
- `frontend/src/components/home/__tests__/PlatformCapabilities.test.tsx`

---

### ✅ Task 2.7: Implement Responsive Layout
**Testing Task**

**Manual Testing:**
- [ ] Test 3-column layout at ≥1280px (xl breakpoint)
- [ ] Test single column at 640-1279px (tablet)
- [ ] Verify card heights maintain 480px
- [ ] Test hover states on all cards
- [ ] Test dark mode at all breakpoints
- [ ] Verify links work

**Acceptance Criteria:**
- Layout responds correctly at all breakpoints
- Cards maintain visual consistency
- No layout shifts or breaks

---

## Epic 3: Trust Band Section (New)

**Goal:** Create simple logo band showing organization coverage.

### ✅ Task 3.1: Create TrustBand Component
**Component:** `frontend/src/components/home/TrustBand.tsx` (new file)

**Requirements:**
- [ ] Fetch top 5 organizations from API
- [ ] Display text: "Aggregating rescue dogs from 13 organizations across Europe & UK"
- [ ] Show 5 organization logos in a row
- [ ] Apply grayscale filter to logos
- [ ] Background: Light gray (#F5F5F5) light mode, dark:bg-gray-800
- [ ] Height: 100px (h-24)
- [ ] Logos: max height 40px, maintain aspect ratio
- [ ] Centered layout
- [ ] Gap between logos: 32px (gap-8)

**Acceptance Criteria:**
- Component renders with organization data
- Logos fetch from API logo_url field
- Grayscale filter applied (filter: grayscale(100%))
- Text displays organization count dynamically
- Dark mode styling applied
- Responsive layout

**Files to Create:**
- `frontend/src/components/home/TrustBand.tsx`

**Example Structure:**
```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function TrustBand() {
  const [organizations, setOrganizations] = useState([]);
  const [totalCount, setTotalCount] = useState(13);

  useEffect(() => {
    // Fetch organizations from API
    fetch('/api/organizations?limit=5')
      .then(res => res.json())
      .then(data => {
        setOrganizations(data.organizations || []);
        setTotalCount(data.total || 13);
      });
  }, []);

  return (
    <section className="bg-gray-100 dark:bg-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Aggregating rescue dogs from {totalCount} organizations across Europe & UK
        </p>
        
        <div className="flex justify-center items-center gap-8 flex-wrap">
          {organizations.slice(0, 5).map((org) => (
            <div key={org.id} className="h-10">
              {org.logo_url && (
                <Image
                  src={org.logo_url}
                  alt={org.name}
                  width={120}
                  height={40}
                  className="max-h-10 w-auto object-contain grayscale opacity-60 hover:opacity-100 transition-opacity"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### ✅ Task 3.2: Write Tests for TrustBand
**Component:** `frontend/src/components/home/__tests__/TrustBand.test.tsx` (new file)

**Test Cases:**
- [ ] Renders text with organization count
- [ ] Fetches and displays organization logos
- [ ] Grayscale filter applied to logos
- [ ] Shows max 5 logos
- [ ] Dark mode classes applied
- [ ] Handles API errors gracefully

**Acceptance Criteria:**
- All tests pass
- Mock API calls properly
- Test coverage >80%

**Files to Create:**
- `frontend/src/components/home/__tests__/TrustBand.test.tsx`

---

### ✅ Task 3.3: Verify Responsive Layout
**Testing Task**

**Manual Testing:**
- [ ] Test logo layout at different screen sizes
- [ ] Verify logos wrap on smaller screens
- [ ] Test grayscale filter on hover
- [ ] Test dark mode appearance

**Acceptance Criteria:**
- Logos display correctly at all breakpoints
- No overflow issues
- Hover effects work

---

## Epic 4: Featured Dogs Section (Refactor)

**Goal:** Reduce dogs from 12+ to 6, combine sections, update header, add large CTA button.

### ✅ Task 4.1: Update ClientHomePage to Show Single Dog Section
**Component:** `frontend/src/components/home/ClientHomePage.jsx`

**Changes Required:**
- [ ] Remove "Just Added" DogSection
- [ ] Remove "From Different Rescues" DogSection
- [ ] Add single new DogSection component
- [ ] Pass only 6 dogs (slice first 6 from initialRecentDogs)
- [ ] Update section title: "Dogs Waiting for Homes"
- [ ] Update subtitle: "Showing 6 of 3,186 available dogs"
- [ ] Add large CTA button below dogs: "Browse All 3,186 Dogs →"

**Acceptance Criteria:**
- Only 6 dogs display
- Single section replaces two old sections
- Title and subtitle match PRD
- Large CTA button present and styled
- Button links to /dogs
- Dog count is dynamic (use statistics.total_dogs)

**Files to Modify:**
- `frontend/src/components/home/ClientHomePage.jsx`

---

### ✅ Task 4.2: Create FeaturedDogsSection Component
**Component:** `frontend/src/components/home/FeaturedDogsSection.tsx` (new file)

**Requirements:**
- [ ] Accepts dogs array prop (6 dogs)
- [ ] Accepts totalCount prop for dynamic text
- [ ] Header: "Dogs Waiting for Homes"
- [ ] Meta text: "Showing 6 of {totalCount} available dogs"
- [ ] 3-column grid on desktop (≥1280px using xl:grid-cols-3)
- [ ] 2-column grid on tablet (≥640px using grid-cols-2)
- [ ] Uses existing DogCard component
- [ ] Large CTA button centered below dogs
- [ ] Button text: "Browse All {totalCount} Dogs →"
- [ ] Button links to /dogs
- [ ] White background (light mode), dark:bg-gray-900

**Acceptance Criteria:**
- Component renders with 6 dogs
- Grid responsive at all breakpoints
- CTA button prominent and centered
- Dynamic count displays correctly
- Dark mode styling applied

**Files to Create:**
- `frontend/src/components/home/FeaturedDogsSection.tsx`

**Example Structure:**
```tsx
import Link from 'next/link';
import DogCard from '../dogs/DogCard';
import { Button } from '../ui/button';

interface FeaturedDogsSectionProps {
  dogs: any[];
  totalCount: number;
}

export default function FeaturedDogsSection({ dogs, totalCount }: FeaturedDogsSectionProps) {
  return (
    <section className="bg-white dark:bg-gray-900 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Dogs Waiting for Homes
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Showing 6 of {totalCount.toLocaleString()} available dogs
          </p>
        </div>

        {/* Dogs Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {dogs.slice(0, 6).map((dog) => (
            <DogCard key={dog.id} dog={dog} />
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link href="/dogs">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-4 text-lg">
              Browse All {totalCount.toLocaleString()} Dogs →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

---

### ✅ Task 4.3: Update Tests for Featured Dogs Section
**Component:** `frontend/src/components/home/__tests__/FeaturedDogsSection.test.tsx` (new file)

**Test Cases:**
- [ ] Renders section header
- [ ] Displays exactly 6 dogs
- [ ] Shows correct meta text with count
- [ ] CTA button renders with correct text
- [ ] CTA button links to /dogs
- [ ] Grid layout responsive
- [ ] Dark mode classes applied

**Acceptance Criteria:**
- All tests pass
- Test coverage >80%
- No console errors

**Files to Create:**
- `frontend/src/components/home/__tests__/FeaturedDogsSection.test.tsx`

---

### ✅ Task 4.4: Verify Grid Layout Responsive
**Testing Task**

**Manual Testing:**
- [ ] Test 3-column grid at ≥1280px (xl breakpoint)
- [ ] Test 2-column grid at 640-1279px (tablet)
- [ ] Verify dog cards render correctly
- [ ] Test CTA button on all screen sizes

**Acceptance Criteria:**
- Grid responds correctly
- Dog cards maintain aspect ratio
- CTA button always visible and centered

---

## Epic 5: Final CTA Section (New)

**Goal:** Create "Ready to Find Your Dog?" section with 3 clickable cards.

### ✅ Task 5.1: Create FinalCTA Component
**Component:** `frontend/src/components/home/FinalCTA.tsx` (new file)

**Requirements:**
- [ ] Orange background (bg-orange-600) matching hero
- [ ] Dark mode: dark:bg-orange-700
- [ ] Section padding: 100px vertical (py-24)
- [ ] Headline: "Ready to Find Your Dog?"
- [ ] 3 cards in a row on desktop (≥1280px using xl:grid-cols-3)
- [ ] Stack vertically on tablet (grid-cols-1)
- [ ] Cards width: 280px each (per PRD specification)
- [ ] Cards centered as a group
- [ ] Gap between cards: 24px (gap-6)

**Acceptance Criteria:**
- Component renders with orange background
- Headline centered and prominent
- 3 cards display correctly
- Dark mode styling applied
- Responsive layout works

**Files to Create:**
- `frontend/src/components/home/FinalCTA.tsx`

**Example Structure:**
```tsx
import Link from 'next/link';

export default function FinalCTA() {
  const ctaCards = [
    {
      title: 'Browse All Dogs',
      subtitle: '3,186 available',
      description: 'Advanced filters by breed, age, size, gender, and location',
      href: '/dogs',
    },
    {
      title: 'Explore Breeds',
      subtitle: '50+ analyzed',
      description: 'Personality insights and traits for every breed',
      href: '/breeds',
    },
    {
      title: 'Start Swiping',
      subtitle: 'Quick matches',
      description: 'Discover dogs filtered by your preferences',
      href: '/swipe',
    },
  ];

  return (
    <section className="bg-orange-600 dark:bg-orange-700 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <h2 className="text-4xl lg:text-5xl font-bold text-white text-center mb-16">
          Ready to Find Your Dog?
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 justify-items-center max-w-4xl mx-auto">
          {ctaCards.map((card) => (
            <Link key={card.title} href={card.href} className="block group w-full xl:w-[280px]">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mb-4">
                  {card.subtitle}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### ✅ Task 5.2: Make Cards Fully Clickable
**Implementation Task**

**Requirements:**
- [ ] Entire card wrapped in Next.js Link
- [ ] Hover state: translateY(-8px) and shadow increase
- [ ] Transition: smooth (duration-300)
- [ ] Cursor: pointer (implicit from Link)
- [ ] Group hover for inner elements

**Acceptance Criteria:**
- Entire card area clickable
- Hover animation smooth
- No accessibility issues
- Links work correctly

---

### ✅ Task 5.3: Write Tests for FinalCTA
**Component:** `frontend/src/components/home/__tests__/FinalCTA.test.tsx` (new file)

**Test Cases:**
- [ ] Renders headline "Ready to Find Your Dog?"
- [ ] Renders 3 CTA cards
- [ ] Each card displays title, subtitle, description
- [ ] Card 1 links to /dogs
- [ ] Card 2 links to /breeds
- [ ] Card 3 links to /swipe
- [ ] Cards are clickable (Link wrapper)
- [ ] Dark mode classes applied

**Acceptance Criteria:**
- All tests pass
- Test coverage >80%
- Links verified

**Files to Create:**
- `frontend/src/components/home/__tests__/FinalCTA.test.tsx`

---

### ✅ Task 5.4: Verify Responsive Layout
**Testing Task**

**Manual Testing:**
- [ ] Test 3-column layout at ≥1280px (xl breakpoint)
- [ ] Test single column at 640-1279px (tablet)
- [ ] Verify cards stack properly on tablet
- [ ] Verify cards maintain 280px width on desktop
- [ ] Test hover states on desktop
- [ ] Test dark mode appearance

**Acceptance Criteria:**
- Layout responds correctly
- Cards maintain size and spacing
- No layout breaks

---

## Epic 6: Page Integration & Cleanup

**Goal:** Update main homepage to use all new sections, remove old ones, ensure mobile unchanged.

### ✅ Task 6.1: Update ClientHomePage with New Section Order
**Component:** `frontend/src/components/home/ClientHomePage.jsx`

**New Section Order (≥640px only):**
1. HeroSection (updated)
2. PlatformCapabilities (new)
3. TrustBand (new)
4. FeaturedDogsSection (new - replaces 2 old DogSections)
5. TrustSection (keep existing - organizations)
6. FinalCTA (new)

**Changes Required:**
- [ ] Keep mobile version (<640px) unchanged - line 114-118
- [ ] Update desktop version (≥640px) - line 120-160
- [ ] Remove BreedsCTA component (line 124-129)
- [ ] Remove "Just Added" DogSection (line 132-143)
- [ ] Remove "From Different Rescues" DogSection (line 146-156)
- [ ] Add PlatformCapabilities import and component
- [ ] Add TrustBand import and component
- [ ] Add FeaturedDogsSection import and component
- [ ] Add FinalCTA import and component
- [ ] Pass correct props to each section

**Acceptance Criteria:**
- Mobile version unchanged
- Desktop shows new sections in correct order
- All imports correct
- Props passed correctly
- No TypeScript errors

**Files to Modify:**
- `frontend/src/components/home/ClientHomePage.jsx`

---

### ✅ Task 6.2: Remove Unused Components
**Cleanup Task**

**Files to Consider:**
- [ ] Check if BreedsCTA is used elsewhere (if not, keep for reference but don't delete)
- [ ] Check if old DogSection usage can be simplified
- [ ] Update imports in ClientHomePage
- [ ] Remove any dead code

**Acceptance Criteria:**
- No unused imports in ClientHomePage
- Code is clean and readable
- All components properly imported

**Files to Modify:**
- `frontend/src/components/home/ClientHomePage.jsx`

---

### ✅ Task 6.3: Update Server-Side Data Fetching
**Component:** `frontend/src/services/serverAnimalsService.ts`

**Changes Required:**
- [ ] Verify getHomePageData() returns 6+ dogs for featured section
- [ ] If needed, adjust query to fetch 6 recent dogs
- [ ] Ensure statistics include total_dogs count

**Acceptance Criteria:**
- API returns sufficient data
- No backend changes required (per PRD)
- Data structure matches component needs

**Files to Review:**
- `frontend/src/services/serverAnimalsService.ts`

---

### ✅ Task 6.4: Test Mobile Unchanged
**Testing Task**

**Manual Testing:**
- [ ] View homepage at <640px (mobile)
- [ ] Verify MobileHomePage renders
- [ ] Verify no new sections appear on mobile
- [ ] Test mobile functionality unchanged
- [ ] Test dark mode on mobile

**Acceptance Criteria:**
- Mobile homepage identical to before
- No regressions
- All mobile tests still pass

---

### ✅ Task 6.5: Update Integration Tests
**Component:** `frontend/src/components/home/__tests__/HomePage.integration.test.tsx` (create if doesn't exist)

**Test Cases:**
- [ ] Homepage renders all sections on desktop
- [ ] Sections appear in correct order
- [ ] Mobile version renders MobileHomePage
- [ ] Desktop version does not render MobileHomePage
- [ ] All links route correctly
- [ ] Statistics load and display
- [ ] Dogs load and display
- [ ] Dark mode works across all sections

**Acceptance Criteria:**
- Integration tests pass
- Coverage includes new sections
- No flaky tests

**Files to Create/Modify:**
- `frontend/src/components/home/__tests__/HomePage.integration.test.tsx`

---

## Epic 7: Dark Mode & Accessibility

**Goal:** Ensure all new components support dark mode and meet accessibility standards.

### ✅ Task 7.1: Add Dark Mode Support to All New Components
**Components to Update:**
- PlatformCapabilities.tsx
- CapabilityCard.tsx
- All preview components (AdvancedSearchPreview, etc.)
- TrustBand.tsx
- FeaturedDogsSection.tsx
- FinalCTA.tsx

**Requirements:**
- [ ] All components use dark: variant for colors
- [ ] Text contrast meets WCAG AA standards
- [ ] Backgrounds appropriate for dark mode
- [ ] Borders and shadows adjusted for dark mode
- [ ] Hover states work in dark mode

**Acceptance Criteria:**
- All components render correctly in dark mode
- No readability issues
- Consistent with existing dark mode design

**Files to Review:**
- All new component files

---

### ✅ Task 7.2: Test Dark Mode Rendering
**Testing Task**

**Manual Testing:**
- [ ] Enable dark mode in browser/OS
- [ ] Visit homepage
- [ ] Check each section visually
- [ ] Test hover states in dark mode
- [ ] Check color contrast
- [ ] Test transitions between light/dark

**Acceptance Criteria:**
- All sections readable in dark mode
- No white/light backgrounds bleeding through
- Consistent visual hierarchy

---

### ✅ Task 7.3: Add ARIA Labels and Semantic HTML
**Accessibility Task**

**Requirements:**
- [ ] All sections use proper semantic HTML (section, nav, etc.)
- [ ] All interactive elements have aria-labels
- [ ] All images have alt text
- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] Links descriptive (not just "Click here")
- [ ] Buttons have clear purpose

**Acceptance Criteria:**
- No accessibility errors in Chrome DevTools
- Screen reader can navigate page
- All interactive elements accessible

**Files to Review:**
- All new component files

---

### ✅ Task 7.4: Test Keyboard Navigation
**Testing Task**

**Manual Testing:**
- [ ] Tab through all sections
- [ ] Verify focus indicators visible
- [ ] Test Enter/Space on buttons/links
- [ ] Verify tab order logical
- [ ] Test Escape key where applicable

**Acceptance Criteria:**
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Tab order makes sense

---

### ✅ Task 7.5: Test Screen Reader Compatibility
**Testing Task**

**Manual Testing:**
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Verify all content announced
- [ ] Test landmark navigation
- [ ] Verify links announced correctly
- [ ] Test image alt text

**Acceptance Criteria:**
- All content accessible via screen reader
- No confusing announcements
- Navigation makes sense

---

## Epic 8: Performance & Polish

**Goal:** Optimize performance, add polish, and ensure production readiness.

### ✅ Task 8.1: Optimize Images and Assets
**Performance Task**

**Requirements:**
- [ ] Use Next.js Image component for all images
- [ ] Set proper width/height attributes
- [ ] Enable lazy loading where appropriate
- [ ] Optimize organization logos
- [ ] Check bundle size impact

**Acceptance Criteria:**
- Images load quickly
- No layout shift (CLS score good)
- Bundle size acceptable
- Lighthouse score >90

**Files to Review:**
- All components with images

---

### ✅ Task 8.2: Add Loading States
**Enhancement Task**

**Requirements:**
- [ ] Add skeleton loaders for async content
- [ ] Add loading state for TrustBand logos
- [ ] Add loading state for FeaturedDogsSection
- [ ] Use Suspense boundaries appropriately
- [ ] Ensure smooth transitions

**Acceptance Criteria:**
- Loading states look polished
- No content flash
- Smooth loading experience

**Files to Modify:**
- TrustBand.tsx
- FeaturedDogsSection.tsx
- ClientHomePage.jsx

---

### ✅ Task 8.3: Add Error Boundaries
**Enhancement Task**

**Requirements:**
- [ ] Wrap new sections in error boundaries
- [ ] Add fallback UI for errors
- [ ] Log errors appropriately
- [ ] Test error scenarios

**Acceptance Criteria:**
- Errors don't crash page
- Fallback UI user-friendly
- Errors logged for debugging

**Files to Modify:**
- ClientHomePage.jsx

---

### ✅ Task 8.4: Test Responsive Breakpoints
**Testing Task**

**Breakpoints to Test:**
- [ ] 640px (sm) - Mobile/Tablet boundary
- [ ] 768px (md) - Tablet
- [ ] 1024px (lg) - Desktop
- [ ] 1280px (xl) - Large desktop
- [ ] 1536px (2xl) - Extra large

**Test on Each:**
- [ ] Hero section
- [ ] Platform capabilities cards
- [ ] Trust band
- [ ] Featured dogs grid
- [ ] Final CTA cards

**Acceptance Criteria:**
- No layout breaks at any breakpoint
- Content readable at all sizes
- No horizontal scroll

---

### ✅ Task 8.5: Cross-Browser Testing
**Testing Task**

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Acceptance Criteria:**
- Homepage works in all browsers
- No visual bugs
- All interactions work

---

### ✅ Task 8.6: Performance Audit
**Testing Task**

**Metrics to Check:**
- [ ] Lighthouse Performance score >90
- [ ] First Contentful Paint <2s
- [ ] Largest Contentful Paint <2.5s
- [ ] Cumulative Layout Shift <0.1
- [ ] Time to Interactive <3s
- [ ] Total Blocking Time <200ms

**Optimizations if Needed:**
- [ ] Code splitting
- [ ] Image optimization
- [ ] Font optimization
- [ ] Reduce bundle size

**Acceptance Criteria:**
- All Core Web Vitals in green
- Page loads quickly
- No performance regressions

---

## Final Checklist

Before marking this feature complete, ensure:

- [ ] All tests passing (backend + frontend)
- [ ] Linting/formatting clean
- [ ] No TypeScript errors
- [ ] Dark mode working
- [ ] Accessibility audit passed
- [ ] Performance metrics good
- [ ] Mobile version unchanged
- [ ] Desktop/tablet show new design
- [ ] All links work correctly
- [ ] All CTA buttons functional
- [ ] Statistics load correctly
- [ ] Dogs display correctly (6 featured)
- [ ] Organization logos display
- [ ] Cross-browser tested
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Ready for deployment

---

## Notes

### Key Files Created
- `frontend/src/components/home/PlatformCapabilities.tsx`
- `frontend/src/components/home/CapabilityCard.tsx`
- `frontend/src/components/home/previews/AdvancedSearchPreview.tsx`
- `frontend/src/components/home/previews/PersonalityBarsPreview.tsx`
- `frontend/src/components/home/previews/SwipePreview.tsx`
- `frontend/src/components/home/TrustBand.tsx`
- `frontend/src/components/home/FeaturedDogsSection.tsx`
- `frontend/src/components/home/FinalCTA.tsx`

### Key Files Modified
- `frontend/src/components/home/ClientHomePage.jsx`
- `frontend/src/components/home/HeroSection.jsx`

### Key Files Deprecated (Keep for Reference)
- `frontend/src/components/home/BreedsCTA.tsx` (not deleted, just not used)

### Dependencies
- No new npm packages required
- Uses existing component library
- Uses existing API endpoints
- No backend changes needed

---

**End of Implementation Worklog**