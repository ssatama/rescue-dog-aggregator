# Country Hub Pages Documentation

## Overview

Country Hub Pages are SEO-optimized landing pages that allow users to browse rescue dogs by their country of origin. This feature improves discoverability through search engines while providing a focused browsing experience for users interested in dogs from specific countries.

## Key Features

- **SEO-optimized URLs** - Clean, semantic URLs like `/dogs/country/uk`
- **Static generation with ISR** - Pages are pre-rendered with 5-minute revalidation
- **Country-specific metadata** - Dynamic titles, descriptions, and structured data
- **Two numbers, in plain words** - dogs *in* the country, and dogs someone *living* there can adopt (any rescue that rehomes there), with a link to `/dogs?available_country=<code>` (#502)
- **Country links** - one row of pills (`LandingNav`) that scrolls sideways on phones
- **Real-time statistics** - Live dog counts per country from API

## URLs

| URL | Description |
|-----|-------------|
| `/dogs/country` | Hub page listing all countries with dog counts |
| `/dogs/country/[code]` | Individual country page (e.g., `/dogs/country/uk`) |

## Supported Countries

| Code | Country | Flag |
|------|---------|------|
| UK | United Kingdom | 🇬🇧 |
| DE | Germany | 🇩🇪 |
| SR | Serbia | 🇷🇸 |
| BA | Bosnia & Herzegovina | 🇧🇦 |
| BG | Bulgaria | 🇧🇬 |
| IT | Italy | 🇮🇹 |
| TR | Turkey | 🇹🇷 |
| CY | Cyprus | 🇨🇾 |

## Architecture

### Frontend Components

#### Page Components
- `frontend/src/app/dogs/country/page.tsx` - Hub page (server component)
- `frontend/src/app/dogs/country/[code]/page.tsx` - Country detail page (server component)
- `frontend/src/app/dogs/country/CountriesHubClient.tsx` - Client component for hub
- `frontend/src/app/dogs/country/[code]/CountryDogsClient.tsx` - Client component for detail

#### Shared Components
- `LandingNav` (`components/landing/`) - Row of links to the other countries, shared with the age pages
- `CountryStructuredData` - JSON-LD structured data for SEO
- `countryData.ts` - Country configuration (names, flags, descriptions)

### Backend API

#### Endpoint
- **Route**: `GET /api/animals/stats/by-country`
- **Location**: `api/routes/animals.py`
- **Purpose**: Returns aggregated dog counts and organization counts per country

#### Response Format
```json
{
  "total": 4568,
  "countries": [
    {
      "code": "UK",
      "name": "UK",
      "count": 3200,
      "organizations": 5
    },
    {
      "code": "DE",
      "name": "DE",
      "count": 800,
      "organizations": 3
    }
  ]
}
```

### Data Flow

```
1. Server Component (page.tsx)
   └── Fetches: getCountryStats(), getAnimals(), getAllMetadata(),
       getListCounts({}) (every dog's available_country counts)
   └── Passes data to Client Component

2. Client Component (CountryDogsClient.tsx)
   └── Renders the intro: description and both numbers
   └── Renders LandingNav for the other countries
   └── Renders DogsPageClientSimplified with country filter

3. DogsPageClientSimplified
   └── Uses initialParams.location_country to filter dogs
   └── Handles pagination, filtering, and infinite scroll
```

## SEO Implementation

### Metadata Generation
Each country page generates dynamic metadata including:
- Title: `{count} Rescue Dogs in {country} | Adopt from {shortName}`
- Description: Country-specific description with dog count
- Keywords: Location-based adoption keywords
- Canonical URL: Lowercase country code for consistency
- OpenGraph and Twitter cards

### Structured Data
Uses JSON-LD `CollectionPage` schema:
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Rescue Dogs in United Kingdom",
  "description": "...",
  "url": "https://www.rescuedogs.me/dogs/country/uk",
  "numberOfItems": 3200,
  "about": {
    "@type": "Country",
    "name": "United Kingdom"
  }
}
```

### Sitemap Integration
- Dedicated sitemap: `/sitemap-countries.xml`
- Includes hub page and all country detail pages
- Daily changefreq for freshness

## Mobile UX

### Desktop Navigation
- Horizontal scrollable pills with chevron controls
- Active country highlighted with orange background
- Auto-scroll to active country on page load

### Mobile Navigation
- Dropdown selector with full country list
- Shows current country flag and name
- Accessible with proper ARIA attributes

## Static Generation

Uses Next.js 16 static generation with ISR:

```javascript
export const revalidate = 300; // 5 minutes

export async function generateStaticParams() {
  return getAllCountryCodes().map((code) => ({
    code: code.toLowerCase(),
  }));
}
```

Pages are:
1. Pre-rendered at build time for all known countries
2. Revalidated every 5 minutes for fresh dog counts
3. Served from CDN for optimal performance

## Configuration

Country data is centralized in `frontend/src/utils/countryData.ts`:

```javascript
export const COUNTRIES = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    shortName: "UK",
    flag: "🇬🇧",
    placeName: "the UK",  // how a sentence names it, when not `name`
    description: "Rescue dogs from UK-based organizations..."
  },
  // ... other countries
};
```

To add a new country:
1. Add entry to `COUNTRIES` object
2. Country will automatically appear in navigation and sitemap
3. API must return dogs with matching `location_country` code

## Testing

Test files cover:
- `CountryDogsClient.test.jsx` - Country detail page rendering
- `CountriesHubClient.test.jsx` - Hub page rendering and navigation
- `CountryStructuredData.test.jsx` - Schema.org markup
- `countryData.test.js` - Utility functions

## Related Files

```
frontend/
├── src/app/dogs/country/
│   ├── page.tsx                    # Hub server component
│   ├── CountriesHubClient.tsx      # Hub client component
│   ├── [code]/
│   │   ├── page.tsx               # Detail server component
│   │   └── CountryDogsClient.tsx  # Detail client component
├── src/components/countries/
│   └── CountryStructuredData.tsx  # SEO structured data
├── src/components/landing/
│   └── LandingNav.tsx             # Links to the other countries
├── src/utils/
│   └── countryData.ts             # Country configuration
├── src/services/
│   └── serverAnimalsService.ts    # getCountryStats() API

api/routes/
└── animals.py                      # /stats/by-country endpoint
```
