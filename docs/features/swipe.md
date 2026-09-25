# Swipe Feature Documentation

## Overview

Swipe shows rescue dogs one at a time, filtered to a country the visitor can
adopt in (plus optional sizes and ages). It is mobile-first and in the phone
tab bar; on desktop it is reached as "Quick browse" from the home hero and the
catalog toolbar, not from the header (#499).

## Key Features

- **One dog, whole card on screen** - the photo takes whatever height is left,
  so the card, Back and Next fit at 390x844 and 1440x900 without scrolling
- **Controls** - Back / Next buttons; swipe left for the next dog and right to
  go back; tap the photo's left or right quarter to step through up to 6
  gallery photos; tap anywhere else for the details modal
- **Keyboard** - left/right arrows browse, F saves or unsaves, Enter opens the
  details (not while the details or the filter modal are open)
- **Card facts** - breed · age · sex, rescue · country, "Adoptable to you",
  tagline and up to three traits; missing facts are left out
- **End of the stack** - a "You've seen every dog here" state with Start over,
  Change filters and Browse all dogs; no "1 of 20" counter
- **Stateless** - no accounts; filters and position live in localStorage

## Architecture

### Backend Components

#### API Endpoint
- **Route**: `GET /api/dogs/swipe` (mapped from `/swipe` in router)
- **Location**: `api/routes/swipe.py`
- **Purpose**: Returns filtered, prioritized stack of dogs for swiping

#### Request Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `adoptable_to_country` | string | Filter by adoption eligibility country | `GB`, `US`, `DE` |
| `size[]` | array | Filter by dog sizes | `small`, `medium`, `large` |
| `age[]` | array | Filter by age groups | `puppy`, `young`, `adult`, `senior` |
| `excluded` | string | Comma-separated list of already-swiped dog IDs | `123,456,789` |
| `limit` | integer | Number of dogs to return (max: 50) | `20` |
| `offset` | integer | Pagination offset for loading more | `0`, `20`, `40` |
| `randomize` | boolean | Randomize order for variety | `true`, `false` |

#### Response Format
```json
{
  "dogs": [
    {
      "id": "12345",
      "name": "Max",
      "breed": "Labrador Mix",
      "size": "large",
      "age": "2 years",
      "dogProfilerData": {
        "qualityScore": 0.85,
        "engagementScore": 0.75,
        "personality": {...}
      },
      "organization": {
        "name": "Happy Tails Rescue",
        "country": "GB",
        "shipsTo": ["GB", "IE", "FR"]
      },
      ...
    }
  ],
  "hasMore": true,
  "nextOffset": 20,
  "totalCount": 150
}
```

### Frontend Components

#### Component Structure
```
frontend/src/app/swipe/
├── page.tsx                      # Mobile routing & redirect
frontend/src/components/swipe/
├── SwipeContainer.tsx            # Main orchestration
├── SwipeStack.tsx                # Card stack management
├── SwipeCard.tsx                 # Individual dog card
├── SwipeFilters.tsx              # Filter selection UI
├── FilterModal.tsx               # Filter modal overlay
├── ImageCarousel.tsx             # Dog image carousel
├── PersonalityTraits.tsx         # Personality display
├── EnergyIndicator.tsx           # Energy level indicator
├── AdoptionCTA.tsx               # Adoption call to action
├── SwipeOnboarding.tsx           # First-time experience
├── SwipeActions.tsx              # Like/pass buttons
├── SwipeEmpty.tsx                # Empty state
├── SwipeLoader.tsx               # Loading state
└── SwipeErrorBoundary.tsx        # Error handling
```

#### State Management
All state is managed client-side using browser storage:

**localStorage**:
- `rescue-dogs-favorites:v1`: Array of favorited dog IDs (persists across sessions)
- `rescue-dogs-favorites-snapshots:v1`: Last known name, photo, rescue and breed per saved dog, so /favorites can still show a dog the API no longer returns (#498)
- `swipeFilters`: User's filter preferences (size, age, country)

**sessionStorage**:
- `swipeCurrentIndex`: Current position in the swipe stack

### Database Schema

No dedicated session tables - the feature is stateless. Uses existing tables:

**animals table**:
- `dog_profiler_data` (JSONB): Contains `quality_score` and `engagement_score`
- `availability_confidence`: Filters for high/medium confidence dogs only
- `status`: Must be 'available'

**organizations table**:
- `ships_to` (JSONB): Array of country codes for adoption eligibility

## Core Algorithms

### Dog Selection & Prioritization

The backend uses a sophisticated prioritization algorithm to ensure engaging content:

```sql
-- Simplified version of the actual query
SELECT * FROM animals
WHERE
  status = 'available'
  AND availability_confidence IN ('high', 'medium')
  AND dog_profiler_data->>'quality_score' > 0.7
ORDER BY
  CASE
    -- New dogs (last 7 days) get highest priority
    WHEN created_at > NOW() - INTERVAL '7 days' THEN 1.0
    -- Use engagement score if available
    WHEN dog_profiler_data->>'engagement_score' IS NOT NULL
      THEN dog_profiler_data->>'engagement_score'::float
    -- Default priority
    ELSE 0.5
  END DESC,
  -- Add randomization if requested
  CASE WHEN randomize = true THEN RANDOM() ELSE 0 END
LIMIT 20 OFFSET 0;
```

### Age Filtering Logic

The system parses various age formats using complex regex patterns:

| Age Group | Matches | Age Range |
|-----------|---------|-----------|
| `puppy` | "puppy", "0-12 months", "< 1 year" | 0-12 months |
| `young` | "young", "1-2 years", "13-24 months" | 1-2 years |
| `adult` | "adult", "3-7 years" | 3-7 years |
| `senior` | "senior", "8+ years", "> 8 years" | 8+ years |

### Swipe Flow

1. The server renders the first 20 dogs for the URL's filters (`/swipe?country=UK`).
2. Next moves one dog on; when 5 or fewer are left, the next batch is fetched
   with `offset` = dogs loaded so far, in the API's stable order. `randomize`
   is not used for paging: each random page is a fresh shuffle, so offsets
   would skip and repeat dogs and the end state would come too early.
   A batch that arrives after the filters changed is dropped.
3. Next on the last dog shows the end state. Start over reloads from the top.
4. Saving (heart or F) goes through `FavoritesContext`, like everywhere else.

## User Experience Flow

### First-Time User
1. Onboarding asks where they live (pre-filled from the site-wide "I live in"
   choice, #493) and optional sizes on the catalog's scale
2. The stack loads and the first card shows

### Returning User
1. Filters load from localStorage and the URL
2. The last position in the stack is restored

## Performance Optimizations

### Batch Loading Strategy
- Initial load: 20 dogs
- Refetch trigger: 5 dogs remaining
- Batch size: 20 dogs per request
- Randomization on refetch for variety

### Mobile Performance
- FPS monitoring via Sentry
- Touch-optimized interactions
- Reduced animations on low-end devices
- Lazy loading for non-visible content

## Quality Assurance

### Backend Quality Gates
- Only dogs with `quality_score > 0.7` are shown
- Availability confidence must be 'high' or 'medium'
- LLM profiler data required for inclusion
- Regular data quality audits

### Frontend Error Handling
- Error boundary catches and reports issues
- Graceful degradation for missing data
- Sentry integration for monitoring
- Fallback UI for error states

## Privacy & Security

### Data Storage
- **No server-side sessions** - All state in browser
- **No user accounts** - Anonymous usage
- **Local storage only** - Data never leaves device
- **No cross-session tracking** - Fresh start each session

### Limitations
- Maximum 100 favorites (browser storage limit)
- History lost on storage clear
- No sync across devices
- No personalization algorithms

## API Examples

### Basic Request
```bash
GET /api/dogs/swipe?limit=20
```

### Filtered Request
```bash
GET /api/dogs/swipe?adoptable_to_country=GB&size[]=small&size[]=medium&age[]=young&limit=20
```

### Pagination Request
```bash
GET /api/dogs/swipe?limit=20&offset=20&excluded=123,456,789&randomize=true
```

## Configuration

### Environment Variables
```env
# Backend
OPENROUTER_API_KEY=...  # For LLM profiling
SENTRY_DSN=...          # Performance monitoring

# Frontend
NEXT_PUBLIC_API_URL=...  # API endpoint
NEXT_PUBLIC_SENTRY_DSN=... # Frontend monitoring
```

### Feature Flags
Currently no feature flags - swipe is always enabled for mobile users.

## Monitoring & Analytics

### Metrics Tracked
- Swipe rate (swipes per session)
- Like/pass ratio
- Filter usage patterns
- Session duration
- Performance metrics (FPS, load times)

### Sentry Integration
- Performance monitoring for API calls
- Error tracking and alerting
- User session replay (anonymized)
- Custom breadcrumbs for debugging

## Future Enhancements

### Planned Features
1. **User Accounts** - Optional registration for persistence
2. **Recommendation Engine** - ML-based dog suggestions
3. **Swipe History** - Review past swipes
4. **Undo Functionality** - Reverse accidental swipes
5. **Social Sharing** - Share favorite dogs

### Potential Improvements
1. **Advanced Filters** - Breed, temperament, special needs
2. **Match Notifications** - Alert when new dogs match criteria
3. **Swipe Analytics** - Personal swiping insights
4. **Collaborative Filtering** - "Users who liked this also liked..."
5. **Progressive Web App** - Offline support, install prompt

## Testing

### Backend Tests
Located in `tests/api/test_swipe_endpoint.py`:
- Initial stack retrieval
- Country filtering
- Size filtering
- Age filtering
- Exclusion of swiped dogs
- Quality score filtering
- Pagination
- Multiple parameter combinations

### Frontend Tests
Located in `frontend/__tests__/`:
- Component rendering
- Swipe gesture handling
- Filter state management
- Storage persistence
- Error boundaries
- Performance monitoring

### E2E Tests
Using Playwright for full user journeys:
- Complete swipe session
- Filter changes
- Favorites management
- Mobile/desktop routing

## Troubleshooting

### Common Issues

**No dogs appearing**:
- Check if LLM profiling is complete
- Verify quality scores > 0.7
- Ensure availability_confidence is set
- Check filter combinations

**Performance issues**:
- Monitor image sizes (should be optimized)
- Check batch size settings
- Review Sentry performance data
- Test on target devices

**Storage problems**:
- Clear browser storage if corrupted
- Check storage quota limits
- Verify localStorage is enabled
- Test in incognito mode

## Support

For issues or questions:
- Technical issues: Create GitHub issue
- User feedback: Use in-app feedback form
- Performance problems: Check Sentry dashboard
- Data quality: Review LLM profiler logs
