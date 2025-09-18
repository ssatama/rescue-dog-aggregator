# Swipe Feature Documentation

## Overview

The swipe feature is the core engagement mechanism of RescueDogs.me, providing a mobile-first, Tinder-like interface for discovering rescue dogs. Users can swipe right to save dogs to their favorites or left to pass, creating an intuitive and engaging way to browse through thousands of available rescue dogs.

## Key Features

- **Mobile-only experience** - Desktop users are redirected to a mobile prompt
- **Smart prioritization** - Shows high-quality, recently added dogs first
- **Advanced filtering** - Filter by size, age, and country eligibility
- **Stateless architecture** - No user accounts required; all data stored locally
- **Performance optimized** - Image preloading, batch loading, FPS monitoring
- **Privacy-focused** - No tracking across sessions, local storage only

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
frontend/app/swipe/
├── page.tsx                      # Mobile routing & redirect
├── SwipeContainerWithFilters.tsx # Main orchestration
├── SwipeCard.tsx                 # Individual dog card
├── SwipeFilters.tsx              # Filter selection UI
├── SwipeDetails.tsx              # Expanded dog info
├── SwipeOnboarding.tsx           # First-time experience
├── SwipeActions.tsx              # Like/pass buttons
├── SwipeEmpty.tsx                # Empty state
└── SwipeErrorBoundary.tsx        # Error handling
```

#### State Management
All state is managed client-side using browser storage:

**localStorage**:
- `rescue-dogs-favorites`: Array of favorited dog IDs (persists across sessions)
- `swipeFilters`: User's filter preferences (size, age, country)

**sessionStorage**:
- `swipeCurrentIndex`: Current position in the swipe stack
- `swipedDogIds`: Set of already-swiped dog IDs (prevents duplicates)

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

### Swipe Flow Algorithm

```javascript
// Simplified swipe flow logic
function swipeFlow() {
  // 1. Load initial stack
  const dogs = await fetchDogs({ limit: 20, filters });

  // 2. Filter out already swiped
  const filtered = dogs.filter(dog => !swipedIds.has(dog.id));

  // 3. Display current dog
  showDog(filtered[currentIndex]);

  // 4. Preload next images
  preloadImages(filtered.slice(currentIndex + 1, currentIndex + 4));

  // 5. Handle swipe
  onSwipe((direction) => {
    if (direction === 'right') {
      addToFavorites(currentDog.id);
    }
    swipedIds.add(currentDog.id);
    currentIndex++;

    // 6. Load more when running low
    if (filtered.length - currentIndex <= 5) {
      const moreDogs = await fetchDogs({
        limit: 20,
        offset: totalLoaded,
        randomize: true,
        excluded: Array.from(swipedIds)
      });
      filtered.push(...moreDogs);
    }
  });
}
```

## User Experience Flow

### First-Time User
1. User visits `/swipe` on mobile device
2. Onboarding overlay explains swipe mechanics
3. Initial stack of 20 high-quality dogs loads
4. User can immediately start swiping

### Returning User
1. Filter preferences load from localStorage
2. Favorites persist from previous sessions
3. New session starts fresh (no swipe history)
4. Can access favorites via `/favorites` page

### Desktop Redirect
1. Desktop users see mobile-only message
2. QR code provided for easy mobile access
3. Explanation of mobile-first decision

## Performance Optimizations

### Image Preloading
- Preloads next 3 dog images in background
- Cleanup mechanism prevents memory leaks
- Progressive JPEG loading for faster initial display

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