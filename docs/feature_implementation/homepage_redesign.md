# Product Requirements Document: Homepage Redesign

**Status:** Ready for Implementation
**Created:** 2025-09-29
**Author:** Product Design
**Target:** Desktop/Tablet Homepage (640px+)

---

## 1. Overview

Redesign the desktop/tablet homepage to better route users to the three core features (Browse, Breeds, Swipe) while maintaining visual consistency with the recently updated mobile experience.

### Problem Statement

The current desktop homepage:

- Shows too many dogs (12+) as if it's a browsing interface
- Doesn't effectively route users to the three main features
- Has unclear content hierarchy with "Just Added" and "From Different Rescues" sections
- Buries the personality/breed insights feature below the fold

### Solution

Create a routing-focused homepage that:

- Showcases the three main ways to find dogs (Advanced Search, Breed Personalities, Quick Discovery)
- Reduces featured dogs from 12+ to 6 (positioned as samples, not comprehensive browse)
- Uses visual hierarchy to guide users to their preferred browsing method
- Maintains consistency with mobile design language

---

## 2. Goals & Success Metrics

### Primary Goals

1. Increase click-through rate to /dogs, /breeds, and /swipe pages
2. Reduce bounce rate from homepage
3. Maintain or improve time-to-first-dog-click

### Success Metrics

- CTR to /dogs, /breeds, /swipe from homepage (measure each separately)
- Homepage bounce rate
- Time to first dog card click

---

## 3. Scope

### In Scope

- Desktop/tablet homepage redesign (screens ≥640px)
- Six new sections (see Section 4)
- Content strategy updates
- Visual design updates (REMEMBER DARK MODE SUPPORT)

### Out of Scope

- Mobile homepage (already redesigned, keep as-is)
- Browse, Breeds, or Swipe page changes
- New features or filters
- Backend API changes
- Organization partnerships

---

## 4. Page Structure & Requirements

### Section 1: Hero + Stats (REFINE EXISTING)

**Current State:** Orange background hero with stats card on right

**Changes Required:**

- Update headline copy: "Find Your Perfect Rescue Dog"
- Update subheading: "Browse 3,186 dogs aggregated from 13 rescue organizations across Europe and UK. Adopt Don't Shop."
- Update CTA buttons:
  - Primary: "Browse All Dogs" → links to /dogs
  - Secondary: "🐾 Quick Browse Dogs" → links to /swipe
- Keep existing stats card layout and content

**Design Notes:**

- Maintain orange gradient background (#FF6B35 to #F15A29)
- Hero height: 480px
- Stats card width: 384px
- Existing component can be reused with copy updates

---

### Section 2: Platform Capabilities (NEW - CRITICAL)

**Purpose:** Primary routing section - showcases three ways to find dogs

**Layout:**

- 3-column grid on desktop
- Equal-width cards with visual previews
- Background: Cream (#FFF8F0)
- Section padding: 100px vertical
- New Cards need to be world-class design and using the latest modern React patterns

**Section Header:**

- Headline: "Three Ways to Find Your Dog"
- Subheading: "Choose the approach that fits your search style"

**Card 1: Advanced Search**

- Visual mockup showing:
  - Breed search input
  - Size filter chips (Small, Medium, Large)
  - Location input
  - Age filter chips (Puppy, Young, Adult)
- Headline: "Advanced Search"
- Description: "Filter 3,186 dogs by breed, age, size, gender, and location"
- Badge: "50+ breeds · 13 rescues · 9 countries"
- CTA: "Start Searching →" (links to /dogs)

**Card 2: Breed Personalities**

- Visual showing 4 personality bars:
  - Affectionate: 78% (purple gradient)
  - Energetic: 65% (orange gradient)
  - Intelligent: 82% (blue gradient)
  - Trainability: 75% (green gradient)
- Headline: "Match by Personality"
- Description: "Every breed analyzed for traits like energy level, affection, and trainability"
- Badge: "Data from 2,500+ profiles"
- CTA: "Explore Breeds →" (links to /breeds)

**Card 3: Quick Discovery**

- Visual showing stacked dog cards with paw buttons (❤️ and 👎)
- Headline: "Quick Discovery"
- Description: "Not sure what you want? Swipe through dogs filtered by your country and size preferences"
- Badge: "Updated twice weekly"
- CTA: "Start Swiping →" (links to /swipe)

**Card Specifications:**

- Height: 480px each
- Background: White
- Border radius: 12px
- Shadow: 0 2px 8px rgba(0,0,0,0.08)
- Hover: Transform translateY(-4px), shadow increase
- Padding: 32px

---

### Section 3: Trust Band (NEW - SIMPLE)

**Purpose:** Show coverage and credibility without claiming partnership

**Content:**

- Text: "Aggregating rescue dogs from 13 organizations across Europe & UK"
- Logo placeholders: 5 grayscale logos

**Design:**

- Background: Light gray (#F5F5F5)
- Height: 100px
- Single row layout

---

### Section 4: Featured Dogs (REDUCE & REPOSITION)

**Current State:** 12+ dogs shown (8 "Just Added" + 4 "From Different Rescues")

**Changes Required:**

- Reduce to 6 dogs only
- Single section (remove "Just Added" / "From Different Rescues" split)
- New section header:
  - Headline: "Dogs Waiting for Homes"
  - Meta: "Showing 6 of 3,186 available dogs"
- Keep existing dog card component design
- Add prominent CTA below cards: "Browse All 3,186 Dogs →" (large button, links to /dogs)

**Dog Selection Logic:**

- Show 6 recently added dogs
- Prioritize dogs with high-quality photos
- Can reuse existing logic, just limit to 6 results

**Design Notes:**

- Background: White
- 3-column grid (2 rows)
- Maintain existing DogCard component
- Position as "samples" not comprehensive browse

---

### Section 5: Organizations (KEEP AS-IS)

**Changes:** None - current design is working well

**Note:** This section provides trust/credibility after user has seen the routing options

---

### Section 6: Final CTA (NEW)

**Purpose:** Last chance to convert, reinforce the three routing options

**Layout:**

- Orange background (matches hero)
- Headline: "Ready to Find Your Dog?"
- 3 large option cards in a row

**Card 1: Browse All Dogs**

- Title: "Browse All Dogs"
- Subtitle: "3,186 available"
- Description: "Advanced filters by breed, age, size, gender, and location"
- Links to /dogs

**Card 2: Explore Breeds**

- Title: "Explore Breeds"
- Subtitle: "50+ analyzed"
- Description: "Personality insights and traits for every breed"
- Links to /breeds

**Card 3: Start Swiping**

- Title: "Start Swiping"
- Subtitle: "Quick matches"
- Description: "Discover dogs filtered by your preferences"
- Links to /swipe

**Card Specifications:**

- Width: 280px each
- Background: White
- Padding: 32px
- Gap: 24px between cards
- Centered as a group

---

## 5. Responsive Behavior

### Desktop (1280px+)

- Full layout as specified
- 3-column grids
- All sections at max-width 1280px centered

### Tablet (650px - 1279px)

- Reduce container to 90% width
- Stack capability cards vertically (single column)
- Featured dogs: 2 columns × 3 rows
- Final CTA: Stack cards vertically

### Mobile (<650px)

- Use existing mobile homepage design
- Do NOT apply this redesign to mobile

---

## 6. Content Requirements

### Copy Updates Needed

All copy changes are specified in Section 4. Key updates:

- Hero subheading
- Trust band text
- Section headlines
- Card descriptions
- CTA button text

### No New Content Needed

- Dog data: Use existing
- Organization data: Use existing
- Stats: Use existing

---

## 7. Technical Considerations

### Frontend

- File location: `frontend/src/app/page.tsx` (homepage)
- Reusable components:
  - Existing DogCard component
  - Existing organization cards
  - Create new CapabilityCard component
  - Create new FinalCTA component
- API calls:
  - Existing `/api/animals?limit=6&sort=recent` (or similar)
  - Existing `/api/organizations`
  - No new endpoints needed

### No Backend Changes Required

- All data already available via existing APIs
- No new filters or features being added
- No scraper changes needed

### Assets Needed

- Capability card visual mockups can be:
  - Screenshot from existing /dogs filter sidebar
  - CSS/SVG personality bars
  - CSS-based card stack illustration
- Organization logos: Use existing (grayscale filter applied via CSS)

---

## 8. Design Reference

**Mockup Location:** `docs/feature_implementation` - mockups (png)
**Current Design location:** `docs/feature_implementation` - screenshots

**Visual Reference:**

- Full page mockup shows all sections with exact spacing, colors, and layout
- Use as reference for implementation
- Note this is only for reference - end result needs to be world class design like Airbnb / Apple would do wrt components and new cards.
- This is a key page so it needs to be maximally attractive and use latest React components and world class UX

**Color Palette:**

- Primary Orange: #FF6B35
- Orange Gradient End: #F15A29
- Cream Background: #FFF8F0
- Light Gray: #F5F5F5
- White: #FFFFFF
- Dark Text: #1A1A1A
- Medium Text: #555555
- Light Text: #666666

**Typography:**

- H1 (Hero): 56px, Bold
- H2 (Sections): 42px, Bold
- H3 (Cards): 28px, Bold
- Body Large: 20px
- Body: 16px
- Body Small: 14px

---

## 9. What's NOT Changing

To avoid scope creep, explicitly documenting what stays the same:

### Features

- No new filters (compatibility filters NOT being added)
- No new APIs or backend logic
- No changes to Browse, Breeds, or Swipe pages
- No changes to dog data structure
- No changes to scraping logic

### Design System

- Existing DogCard component unchanged
- Existing organization cards unchanged
- Mobile homepage unchanged
- Navigation unchanged
- Footer unchanged

### Content

- Dog selection logic (just limiting to 6)
- Organization data unchanged
- Stats calculation unchanged

---

## 10. Implementation Notes

### Build Approach

1. Create new components (CapabilityCard, FinalCTA)
2. Update page.tsx with new section structure
3. Update copy in Hero section
4. Reduce featured dogs query from current limit to 6
5. Test responsive breakpoints

### Testing Requirements

- Visual regression testing on desktop/tablet
- Ensure mobile homepage unaffected
- Test all CTA links route correctly
- Test hover states on capability cards
- Verify stats card data loads correctly

### Deployment

- Can be deployed independently
- No database migrations needed
- No API changes required
- Consider A/B testing old vs new if traffic is sufficient

---

## 11. Open Questions

None - design is finalized and ready for implementation.

---

## 12. Appendix

### Current Homepage Issues (For Context)

1. Shows 12+ dogs making it feel like a browser, not a router
2. "Just Added" and "From Different Rescues" distinction unclear to users
3. Personality insights buried below fold
4. No clear guidance on which tool to use (Browse vs Breeds vs Swipe)
5. Weak final CTAs

### Design Decisions Made

1. Reduced dogs to 6 to position as samples, not comprehensive
2. Elevated personality insights to Section 2 (prime real estate)
3. Created three visual cards to make routing explicit
4. Updated copy to reflect aggregation model, not partnership
5. Used visual mockups in cards to preview what users get
6. Created bookend structure (orange hero + orange final CTA)

### User Flow After Redesign

```
Land on homepage
    ↓
See stats + mission (Hero)
    ↓
Choose one of three routes (Capabilities)
    ↓
[Optional] Browse sample dogs (Featured)
    ↓
[Optional] See organization coverage (Orgs)
    ↓
Final CTA to reinforce route choice
    ↓
Click through to /dogs, /breeds, or /swipe
```

---

**End of PRD**
