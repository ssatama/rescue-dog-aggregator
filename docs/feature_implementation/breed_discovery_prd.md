# Breed Discovery Feature - Product Requirements Document (Final)

## Executive Summary

The Breed Discovery feature provides SEO-optimized breed browsing pages showcasing 2,717 rescue dogs across 259 unique primary breeds. With excellent data quality (100% have primary_breed and breed_type, 90% have valid breed_group), this feature creates dedicated landing pages for breeds with 15+ available dogs.

## Current Data Quality (Verified from Database)

### Data Coverage

- **Total available dogs**: 2,717
- **Unique primary breeds**: 259
- **Data completeness**:
  - 100% have `primary_breed` (2,717/2,717)
  - 100% have `breed_type` (2,717/2,717)
  - 90% have valid `breed_group` (2,446/2,717, excluding "Unknown")
  - 57% have `secondary_breed` (for mixes)

### Breed Type Distribution

- **Mixed**: 821 dogs (30.2%)
- **Purebred**: 843 dogs (31.0%)
- **Unknown**: 771 dogs (28.4%)
- **Crossbreed**: 229 dogs (8.4%)
- **Sighthound**: 53 dogs (2.0%)

### Breeds Qualifying for Dedicated Pages

- **19 purebred breeds** with 15+ dogs
- **6 specific crossbreed types** with 15+ dogs
- **1 general mixed breeds page** with 821 dogs
- **Total: ~26 breed pages**

## Goals & Success Metrics

### Primary Goals

1. **Improve SEO** for breed-related searches
2. **Showcase breed availability** with real-time counts
3. **Maximize code reuse** from existing infrastructure

### Success Metrics

- Organic traffic: +30% for breed keywords
- Page engagement: >2 minutes on breed pages
- Conversion: 15% click-through to individual dog profiles
- Technical: Minimal new code (reuse existing components)

## Feature Requirements

### 1. Data Strategy

#### Use Primary Breed as Main Identifier

```sql
-- All breed pages based on primary_breed field
SELECT primary_breed, breed_group, breed_type, COUNT(*)
FROM animals
WHERE active = true AND status = 'available'
GROUP BY primary_breed, breed_group, breed_type
```

#### Top Breeds for Individual Pages (15+ dogs)

**Purebred Pages (19 breeds):**

1. Galgo - 120 dogs (Hound)
2. Podenco - 66 dogs (Hound)
3. Greyhound - 49 dogs (Hound)
4. Collie - 45 dogs (Herding)
5. Cocker Spaniel - 44 dogs (Sporting)
6. German Shepherd Dog - 36 dogs (Herding)
7. Siberian Husky - 33 dogs (Working)
8. Staffordshire Bull Terrier - 28 dogs (Terrier)
9. French Bulldog - 26 dogs (Non-Sporting)
10. Beagle - 26 dogs (Hound)
    (+ 9 more purebreds)

**Crossbreed/Mix Pages (6 types):**

1. Collie Mix - 37 dogs
2. Jack Russell Terrier Mix - 32 dogs
3. Labrador Retriever Mix - 30 dogs
4. Cavalier King Charles Spaniel Mix - 27 dogs
5. Spaniel Mix - 20 dogs
6. Cocker Spaniel Mix - 19 dogs

**Special Pages:**

- Mixed Breed Hub - 821 dogs (general mixed breeds)
- Lurcher - 35 dogs (sighthound type)

### 2. API Requirements

#### Enhance Existing Endpoints

**GET /api/animals** (add parameters)

```python
# New query parameters:
- primary_breed: Filter by primary breed field
- breed_type: Filter by type (purebred/mixed/crossbreed/unknown/sighthound)
- breed_group: Filter by AKC group
- aggregate_personality: Return aggregated LLM traits

# Already supports:
- All existing filters (size, age, sex, organization_id)
- good_with_kids, good_with_dogs, good_with_cats
- Pagination (limit, offset)
- Sorting (sort_by, sort_order)
```

**NEW: GET /api/breeds/stats**

```json
{
  "total_dogs": 2717,
  "unique_breeds": 259,
  "breed_groups": {
    "Hound": 330,
    "Herding": 122,
    "Sporting": 140,
    "Working": 85,
    "Terrier": 101,
    "Non-Sporting": 111,
    "Toy": 73,
    "Mixed": 1462
  },
  "qualifying_breeds": [
    {
      "slug": "galgo",
      "primary_breed": "Galgo",
      "breed_group": "Hound",
      "breed_type": "purebred",
      "count": 120,
      "organizations": ["dogs-trust", "tierschutzverein"],
      "personality_traits": ["gentle", "calm", "lazy"], // Aggregated from dog_profiler_data
      "experience_distribution": {
        "first_time_ok": 45,
        "some_experience": 38,
        "experienced": 17
      }
    }
  ]
}
```

### 3. Frontend Pages

#### A. Breeds Hub Page (`/breeds`)

**Hero Section**

- Dynamic stats from `/api/breeds/stats`
- "2,717 rescue dogs across 259 breeds"
- "26 breeds with dedicated pages"

**Main Categories (3 cards)**

```javascript
// Based on breed_type field
- Mixed Breeds (821 dogs) → /breeds/mixed
- Pure Breeds (843 dogs) → /breeds?type=purebred
- Crossbreeds (229 dogs) → /breeds?type=crossbreed
```

**Breed Groups Grid (7 groups)**

```javascript
// Show only groups with significant dogs, skip "Unknown"
- Hound (330 dogs)
- Mixed (1,462 dogs)
- Herding (122 dogs)
- Sporting (140 dogs)
- Working (85 dogs)
- Terrier (101 dogs)
- Non-Sporting (111 dogs)
- Toy (73 dogs)
```

#### B. Individual Breed Page (`/breeds/[slug]`)

**URL Generation**

```javascript
// Generate slug from primary_breed
const generateSlug = (primaryBreed) => {
  return primaryBreed
    .toLowerCase()
    .replace(/\s+mix$/i, '-mix') // Keep "mix" suffix
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Examples:
"Galgo" → "galgo"
"German Shepherd Dog" → "german-shepherd-dog"
"Collie Mix" → "collie-mix"
"Jack Russell Terrier Mix" → "jack-russell-terrier-mix"
```

**Page Sections**

1. **Breadcrumbs**

   ```
   Home / Breeds / [Breed Group] / [Primary Breed]
   ```

2. **Hero Section** (2-column grid)

   - **Left**: 6-photo gallery from actual rescue dogs
   - **Right**:
     - Breed name (primary_breed)
     - Breed group & type badges
     - Live stats (count, orgs, countries)
     - Short breed description (100-150 words)
     - Primary CTA: "View All [count] [breed]s"
     - Secondary CTA: "❤️ Save Breed Alert"

3. **Personality Profile** (from aggregated LLM data)

   ```javascript
   // Aggregate dog_profiler_data from all dogs of this breed
   const traits = await aggregatePersonalityTraits(primaryBreed);
   ```

   - Visual trait sliders (energy, affection, trainability, etc.)
   - Common traits word cloud
   - Experience level distribution pie chart

4. **Filter Bar** (sticky on scroll)

   ```jsx
   // Reuse existing FilterChip components
   <FilterChip label="All" count={120} active />
   <FilterChip label="Young" count={31} />
   <FilterChip label="Adult" count={68} />
   <FilterChip label="Senior" count={21} />
   <FilterChip label="Good with Cats" />
   <FilterChip label="Good with Kids" />
   <FilterChip label="Near Me" />
   ```

5. **Available Dogs Grid**

   ```jsx
   // Reuse existing DogCard component
   const { data } = useSWR(
     `/api/animals?primary_breed=${breed}&${activeFilters}`
   );

   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {dogs.map((dog) => (
         <DogCard key={dog.id} dog={dog} />
       ))}
     </div>
   );
   ```

6. **Pagination**
   ```jsx
   // Reuse existing LoadMore component
   <LoadMoreButton onClick={loadMore} remaining={totalCount - displayedCount} />
   ```

#### C. Mixed Breeds Hub (`/breeds/mixed`)

**Special Features**

- Hero emphasizes uniqueness and diversity
- Filter by size using `standardized_size`
- Popular specific mixes section:
  - Collie Mix (37)
  - Jack Russell Mix (32)
  - Labrador Mix (30)
  - Show only if 15+ available
- Same dogs grid as purebred pages

### 4. Short Breed Descriptions

Each breed page includes a **concise breed description** (100-150 words) covering:

- Temperament and personality
- Exercise needs
- Good home environment
- Special considerations

**Example for Galgo:**

> Spanish Greyhounds are gentle sighthounds known for their calm, affectionate nature. Despite their athletic build, they're surprisingly lazy, preferring short bursts of exercise followed by long naps. These sensitive souls thrive in quiet homes and bond deeply with their families. Most rescue Galgos are retired from hunting and adapt wonderfully to apartment living. They're typically good with other dogs but may chase small animals. Ideal for patient adopters who appreciate their independent yet loving personality.

**Content Source Options:**

1. Static content in database
2. LLM-generated and cached
3. Pulled from breed info API

### 5. Technical Implementation

#### Image Optimization (R2 + Next.js)

```jsx
// Use existing R2 integration
import { optimizeImage } from "@/utils/r2-optimizer";
import Image from "next/image";

<Image
  src={optimizeImage(dog.primary_image_url)}
  alt={`${breed} rescue dog for adoption`}
  width={400}
  height={300}
  priority={index < 6} // Prioritize first 6 images
/>;
```

#### Component Reuse Checklist

- ✅ `DogCard` - Existing card component
- ✅ `FilterChip` - Existing filter chips
- ✅ `LoadMoreButton` - Existing pagination
- ✅ `FavoriteButton` - Existing favorites
- ✅ `ShareButton` - Existing share functionality
- ✅ `OrganizationBadge` - Existing org display

#### Database Requirements

```sql
-- Add breed slug generation (one-time migration)
ALTER TABLE animals ADD COLUMN breed_slug VARCHAR(255);

UPDATE animals
SET breed_slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(primary_breed, '\s+Mix$', '-mix', 'i'),
    '[^a-z0-9-]+', '-', 'g'
  )
);

CREATE INDEX idx_animals_breed_slug ON animals(breed_slug);
CREATE INDEX idx_animals_primary_breed ON animals(primary_breed);
```

#### SEO Implementation

```jsx
// app/breeds/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const breed = await getBreedData(params.slug);

  return {
    title: `${breed.primary_breed} Rescue Dogs | ${breed.count} Available`,
    description: `Find ${breed.count} ${breed.primary_breed} rescue dogs for adoption. View photos, read personality profiles, and apply to adopt from verified rescue organizations.`,
    openGraph: {
      title: `${breed.count} ${breed.primary_breed} Dogs Need Homes`,
      images: breed.topDogs.slice(0, 4).map((d) => d.primary_image_url),
    },
  };
}

// Generate static params for ISR
export async function generateStaticParams() {
  const breeds = await getQualifyingBreeds(); // 15+ dogs
  return breeds.map((breed) => ({
    slug: breed.slug,
  }));
}
```

### 6. Performance Requirements

#### Core Web Vitals Targets

- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

#### Caching Strategy

- ISR with 1-hour revalidation for breed pages
- Cache breed stats for 1 hour
- Dog grid data: SWR with 5-minute cache
- Images: R2 CDN with long cache headers

### 7. Mobile Responsive Design

#### Breakpoints

- Mobile: < 768px (single column)
- Tablet: 768-1024px (2 columns)
- Desktop: > 1024px (3 columns)

#### Mobile Optimizations

- Horizontal scroll for breed groups
- Sticky filter bar with count badges
- Touch-optimized filter chips
- Lazy load images below fold

## Implementation Phases

### Phase 1: Data Preparation (1-2 days)

- [ ] Generate breed slugs from primary_breed
- [ ] Verify breed_group assignments
- [ ] Create breed descriptions content
- [ ] Index primary_breed field

### Phase 2: API Development (2 days)

- [ ] Add breed filters to `/api/animals`
- [ ] Create `/api/breeds/stats` endpoint
- [ ] Add personality aggregation logic
- [ ] Test with real data

### Phase 3: Frontend Core (3-4 days)

- [ ] Build `/breeds` hub page
- [ ] Create `/breeds/[slug]` template
- [ ] Implement `/breeds/mixed` variant
- [ ] Integrate existing components

### Phase 4: Dogs Grid Integration (2 days)

- [ ] Connect filter chips to API
- [ ] Implement filtered dog grid
- [ ] Add pagination/load more
- [ ] Loading and empty states

### Phase 5: Polish & Launch (2 days)

- [ ] Mobile responsive testing
- [ ] SEO meta tags and schema.org
- [ ] Performance optimization
- [ ] Edge cases and error handling

## Success Criteria

- ✅ 26 breed pages live (19 purebred + 6 crossbreed + 1 mixed)
- ✅ 100% component reuse (no new DogCard, filters, etc.)
- ✅ Mobile responsive on all devices
- ✅ Page load under 2 seconds
- ✅ Valid SEO implementation
- ✅ Using primary_breed as main identifier

## Key Technical Decisions

1. **Use primary_breed field** as the main breed identifier (100% populated)
2. **Filter by breed_type** to separate purebreds, mixes, crossbreeds
3. **Group by breed_group** for navigation (90% valid data)
4. **Reuse all existing components** - this is mainly new pages, not new components
5. **R2 + Next.js Image** for optimization

## Dependencies

- Existing `/api/animals` endpoint
- Current DogCard component
- FilterChip components
- R2 image optimization setup
- Next.js 15 App Router
- Existing favorites system
- LLM dog_profiler_data
