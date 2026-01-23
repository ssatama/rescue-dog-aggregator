# MCP Server Reference

**Target Audience**: Claude Code, Claude Desktop, LLM integrations

## Overview

The `rescuedogs-mcp-server` is a Model Context Protocol server that enables LLMs to help users discover rescue dogs from European and UK organizations through natural conversation.

```
Package:     rescuedogs-mcp-server (npm)
Version:     1.0.0
SDK:         @modelcontextprotocol/sdk ^1.6.1
Transport:   stdio
Source:      /rescuedogs-mcp-server/
API:         https://api.rescuedogs.me (public, no auth)
```

## Installation

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rescuedogs": {
      "command": "npx",
      "args": ["-y", "rescuedogs-mcp-server"]
    }
  }
}
```

### Claude Code

The MCP server is auto-detected if configured in the project's `.mcp.json` or user settings.

### Global Install

```bash
npm install -g rescuedogs-mcp-server
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│  src/index.ts          → McpServer + 8 tool handlers        │
│  src/schemas/          → Zod input validation               │
│  src/services/         │
│    ├─ api-client.ts    → Axios wrapper for API calls        │
│    ├─ cache-service.ts → node-cache with TTL                │
│    ├─ formatters.ts    → Markdown/JSON response builders    │
│    └─ image-service.ts → Cloudflare transform + base64      │
│  src/types.ts          → TypeScript interfaces              │
│  src/constants.ts      → URLs, limits, cache TTLs           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            Rescue Dogs API (api.rescuedogs.me)              │
├─────────────────────────────────────────────────────────────┤
│  /api/animals           → Dog search, filtering, CRUD       │
│  /api/enhanced_animals  → AI-enriched profiles              │
│  /api/organizations     → Rescue org listings               │
│  /api/animals/breeds    → Breed statistics                  │
│  /api/animals/meta      → Filter counts, metadata           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Images (images.rescuedogs.me)              │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare R2 + Image Transforms                           │
│  /cdn-cgi/image/{transforms}/{path}                         │
│  Presets: thumbnail (200x200), medium (400x400)             │
└─────────────────────────────────────────────────────────────┘
```

## Tools Reference

### 1. `rescuedogs_search_dogs`

Search for rescue dogs with comprehensive filtering. Primary discovery tool.

**Parameters:**

| Name                   | Type    | Default   | Description                                              |
| ---------------------- | ------- | --------- | -------------------------------------------------------- |
| `query`                | string  | -         | Free-text search in names/descriptions                   |
| `breed`                | string  | -         | Breed name (e.g., "Golden Retriever")                    |
| `breed_group`          | string  | -         | FCI group (Herding, Sporting, Hound, etc.)               |
| `size`                 | enum    | -         | Tiny, Small, Medium, Large, XLarge                       |
| `age_category`         | enum    | -         | puppy (0-12mo), young (1-3y), adult (3-8y), senior (8+y) |
| `sex`                  | enum    | -         | male, female                                             |
| `energy_level`         | enum    | -         | low, medium, high, very_high                             |
| `experience_level`     | enum    | -         | first_time_ok, some_experience, experienced_only         |
| `home_type`            | enum    | -         | apartment_ok, house_preferred, house_required            |
| `adoptable_to_country` | string  | -         | ISO code (GB, IE, DE, FR, etc.)                          |
| `organization_id`      | number  | -         | Filter by specific organization                          |
| `limit`                | number  | 10        | Results per page (1-50)                                  |
| `offset`               | number  | 0         | Pagination offset                                        |
| `include_images`       | boolean | false     | Include inline dog photos                                |
| `image_preset`         | enum    | thumbnail | thumbnail (200x200) or medium (400x400)                  |
| `response_format`      | enum    | markdown  | markdown or json                                         |

**Example Queries:**

- "Find medium-sized dogs good for first-time owners"
- "Show golden retrievers available to adopt in the UK"
- "Find low-energy dogs suitable for apartments"

**Notes:**

- Organization name search supported (e.g., "Dogs Trust" → auto-maps to org ID)
- Returns enhanced data (AI profiles) when available
- Images limited to first 5 dogs when `include_images: true`

---

### 2. `rescuedogs_get_dog_details`

Get full profile for a specific dog including AI-generated personality.

**Parameters:**

| Name              | Type    | Default  | Description                          |
| ----------------- | ------- | -------- | ------------------------------------ |
| `slug`            | string  | required | Dog's URL slug (e.g., "buddy-12345") |
| `include_image`   | boolean | true     | Include photo in response            |
| `image_preset`    | enum    | medium   | thumbnail or medium                  |
| `response_format` | enum    | markdown | markdown or json                     |

**Response includes:**

- Basic info (breed, age, sex, size)
- AI personality profile (bio, traits, interests)
- Requirements (energy level, home type, experience)
- Organization details
- Adoption URL (traffic driver)

---

### 3. `rescuedogs_list_breeds`

Get available breeds with counts and statistics.

**Parameters:**

| Name              | Type   | Default  | Description              |
| ----------------- | ------ | -------- | ------------------------ |
| `breed_group`     | string | -        | Filter by FCI group      |
| `min_count`       | number | 1        | Minimum dogs available   |
| `limit`           | number | 20       | Number of breeds (1-100) |
| `response_format` | enum   | markdown | markdown or json         |

**Cached:** 10 minutes

---

### 4. `rescuedogs_get_statistics`

Platform overview statistics.

**Parameters:**

| Name              | Type | Default  | Description      |
| ----------------- | ---- | -------- | ---------------- |
| `response_format` | enum | markdown | markdown or json |

**Returns:**

- Total dogs, organizations, countries
- Dogs by country breakdown
- Top organizations by dog count

**Cached:** 10 minutes

---

### 5. `rescuedogs_get_filter_counts`

Get valid filter options with counts. Use to prevent dead-end searches.

**Parameters:**

| Name              | Type   | Default  | Description                                     |
| ----------------- | ------ | -------- | ----------------------------------------------- |
| `current_filters` | object | -        | Apply existing filters to see remaining options |
| `response_format` | enum   | markdown | markdown or json                                |

**Current filters object:**

```typescript
{
  breed?: string;
  size?: string;
  age_category?: string;
  sex?: string;
  adoptable_to_country?: string;
}
```

**Cached:** 5 minutes

---

### 6. `rescuedogs_list_organizations`

List rescue organizations with statistics.

**Parameters:**

| Name              | Type    | Default  | Description                |
| ----------------- | ------- | -------- | -------------------------- |
| `country`         | string  | -        | Filter by ISO country code |
| `active_only`     | boolean | true     | Only active organizations  |
| `limit`           | number  | 20       | Number of orgs (1-50)      |
| `response_format` | enum    | markdown | markdown or json           |

**Returns per org:**

- Name, location, website
- Dogs available, new this week
- Ships to countries

**Cached:** 10 minutes

---

### 7. `rescuedogs_match_preferences`

Find dogs matching lifestyle preferences. Translates user preferences to API filters.

**Parameters:**

| Name                   | Type    | Default  | Description                                              |
| ---------------------- | ------- | -------- | -------------------------------------------------------- |
| `living_situation`     | enum    | required | apartment, house_small_garden, house_large_garden, rural |
| `activity_level`       | enum    | required | sedentary, moderate, active, very_active                 |
| `experience`           | enum    | required | first_time, some, experienced                            |
| `has_children`         | boolean | -        | Children at home                                         |
| `has_other_dogs`       | boolean | -        | Other dogs at home                                       |
| `has_cats`             | boolean | -        | Cats at home                                             |
| `adoptable_to_country` | string  | -        | ISO country code                                         |
| `limit`                | number  | 5        | Matches to return (1-20)                                 |
| `include_images`       | boolean | false    | Include photos                                           |
| `response_format`      | enum    | markdown | markdown or json                                         |

**Mapping:**

- `apartment` → `home_type: apartment_ok`
- `sedentary` → `energy_level: low`
- `first_time` → `experience_level: first_time_ok`

---

### 8. `rescuedogs_get_adoption_guide`

Static adoption process guide. Zero API cost.

**Parameters:**

| Name      | Type   | Default  | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `topic`   | enum   | overview | overview, transport, fees, requirements, timeline |
| `country` | string | -        | ISO code for country-specific info                |

**Topics:**

- `overview`: Full adoption process walkthrough
- `transport`: PETS scheme, EU passport, timelines
- `fees`: What's included, typical costs (£300-700)
- `requirements`: Home checks, experience needs
- `timeline`: Week-by-week breakdown (6-10 weeks typical)

**Country-specific:** GB, IE, DE, FR supported

## Caching Strategy

| Data Type     | TTL    | Key                    |
| ------------- | ------ | ---------------------- |
| Breed stats   | 10 min | `breed_stats`          |
| Statistics    | 10 min | `statistics`           |
| Organizations | 10 min | `organizations`        |
| Filter counts | 5 min  | `filter_counts:{hash}` |
| Images        | 30 min | `image:{url}:{preset}` |

## Image Handling

Images use Cloudflare Image Transforms for optimization:

```
Original: https://images.rescuedogs.me/rescue_dogs/dog-123.jpg
Transformed: https://images.rescuedogs.me/cdn-cgi/image/w=200,h=200,fit=cover,q=70,f=jpeg/rescue_dogs/dog-123.jpg
```

**Presets:**

- `thumbnail`: 200x200, q=70 (~10-15KB)
- `medium`: 400x400, q=75 (~30-50KB)

**Behavior:**

- 5-second timeout per image
- Graceful degradation (returns null on failure)
- Parallel fetching with `Promise.all`

## Error Handling

Errors return actionable messages:

| Status  | Message                                                          |
| ------- | ---------------------------------------------------------------- |
| 404     | "Not found: The requested resource was not found"                |
| 422     | "Invalid request: Validation error"                              |
| 429     | "Rate limited: Too many requests. Please try again in a moment." |
| 5xx     | "Server error: The rescue dogs API is temporarily unavailable."  |
| Timeout | "Request timeout: The API took too long to respond."             |
| Network | "Connection error: Unable to reach the rescue dogs API."         |

## Country Codes

Use these ISO codes for `adoptable_to_country`:

| Code | Country                           |
| ---- | --------------------------------- |
| GB   | United Kingdom (UK also accepted) |
| IE   | Ireland                           |
| DE   | Germany                           |
| FR   | France                            |
| ES   | Spain                             |
| IT   | Italy                             |
| NL   | Netherlands                       |
| BE   | Belgium                           |
| AT   | Austria                           |
| RO   | Romania                           |
| GR   | Greece                            |
| BG   | Bulgaria                          |
| CY   | Cyprus                            |

**Note:** "UK" is auto-mapped to "GB" in the adoption guide.

## Constraints

1. **Active dogs only**: All queries filter `status=available` automatically
2. **European/UK focus**: Only covers European and UK rescue organizations
3. **Traffic driver**: All responses include `adoption_url` for each dog
4. **Character limit**: Responses truncated at 25,000 characters
5. **No auth**: Public API, no authentication required

## Development

```bash
cd rescuedogs-mcp-server

# Install dependencies
pnpm install

# Build
pnpm build

# Run in dev mode
pnpm dev

# Type check
pnpm typecheck
```

## File Structure

```
rescuedogs-mcp-server/
├── package.json          # npm config, dependencies
├── tsconfig.json         # TypeScript strict mode
├── README.md             # User-facing docs
├── src/
│   ├── index.ts          # McpServer + 8 tool handlers (740 lines)
│   ├── types.ts          # TypeScript interfaces (315 lines)
│   ├── constants.ts      # API URLs, cache TTLs, limits
│   ├── schemas/
│   │   └── index.ts      # Zod input validation (262 lines)
│   └── services/
│       ├── api-client.ts    # Axios API wrapper (255 lines)
│       ├── cache-service.ts # node-cache with TTL (104 lines)
│       ├── formatters.ts    # Markdown/JSON builders (443 lines)
│       └── image-service.ts # Image fetch + transform (94 lines)
└── dist/                 # Built output (19KB)
```

## Related Documentation

- [Architecture Reference](./architecture.md) - System overview

---

**Last Updated**: 2026-01-24
**Package**: rescuedogs-mcp-server v1.0.0
**API**: api.rescuedogs.me
