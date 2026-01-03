# rescuedogs-mcp-server

MCP server for discovering rescue dogs from European and UK organizations. Search, filter, and get detailed profiles of dogs available for adoption.

## Installation

```bash
npm install -g rescuedogs-mcp-server
```

## Claude Desktop Configuration

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

## Available Tools

### rescuedogs_search_dogs

Search for rescue dogs with comprehensive filtering.

```
"Find medium-sized dogs good for first-time owners"
"Show me golden retrievers available to adopt in the UK"
"Find low-energy dogs suitable for apartments"
```

**Parameters:**
- `query` - Free-text search
- `breed` - Filter by breed name
- `breed_group` - Filter by FCI group (Herding, Sporting, etc.)
- `size` - Tiny, Small, Medium, Large, XLarge
- `age_category` - puppy, young, adult, senior
- `sex` - male, female
- `energy_level` - low, medium, high, very_high
- `experience_level` - first_time_ok, some_experience, experienced_only
- `home_type` - apartment_ok, house_preferred, house_required
- `adoptable_to_country` - ISO country code (GB, IE, FR, DE)
- `include_images` - Include dog photos (default: false)

### rescuedogs_get_dog_details

Get full details for a specific dog including AI-generated personality profile.

```
"Tell me about the dog with slug 'buddy-12345'"
"Show me details for Max"
```

**Parameters:**
- `slug` - Dog's URL slug (required)
- `include_image` - Include photo (default: true)

### rescuedogs_list_breeds

Get available breeds with counts and statistics.

```
"What breeds are available?"
"Show me herding breeds with at least 10 dogs"
```

**Parameters:**
- `breed_group` - Filter by FCI group
- `min_count` - Minimum dogs available
- `limit` - Number of breeds to return

### rescuedogs_get_statistics

Get overall platform statistics.

```
"How many rescue dogs are available?"
"Show me platform statistics"
```

### rescuedogs_get_filter_counts

Get available filter options with counts based on current filters.

```
"What filter options are available if I've selected Labrador breed?"
"Show me available sizes for dogs in Spain"
```

### rescuedogs_list_organizations

List rescue organizations with their statistics.

```
"Which rescue organizations are in the UK?"
"Show me all organizations"
```

### rescuedogs_match_preferences

Find dogs matching your lifestyle preferences.

```
"I live in an apartment, have moderate activity, and am a first-time dog owner"
"Find dogs for an active family with a house and garden"
```

**Parameters:**
- `living_situation` - apartment, house_small_garden, house_large_garden, rural
- `activity_level` - sedentary, moderate, active, very_active
- `experience` - first_time, some, experienced
- `has_children`, `has_other_dogs`, `has_cats` - boolean
- `adoptable_to_country` - ISO country code

### rescuedogs_get_adoption_guide

Get information about the rescue dog adoption process.

```
"How does rescue dog adoption work?"
"Tell me about transport for adopting to the UK"
"What fees should I expect?"
```

**Parameters:**
- `topic` - overview, transport, fees, requirements, timeline
- `country` - ISO code for country-specific info

## Geographic Scope

This server covers **European and UK rescue organizations only**:

- United Kingdom
- Ireland
- Germany
- France
- Spain
- Italy
- Romania
- Greece
- Bulgaria
- Cyprus
- And more...

US, Canadian, and Australian rescues are not supported.

## Country Codes

Use these codes for the `adoptable_to_country` parameter:

| Code | Country |
|------|---------|
| GB | United Kingdom (UK also accepted) |
| IE | Ireland |
| DE | Germany |
| FR | France |
| ES | Spain |
| IT | Italy |
| NL | Netherlands |
| BE | Belgium |
| AT | Austria |
| RO | Romania |
| GR | Greece |
| BG | Bulgaria |
| CY | Cyprus |

Dogs can be adopted to countries where the rescue organization ships to. Use `rescuedogs_list_organizations` to see which countries each organization serves.

## Data Source

All data comes from [rescuedogs.me](https://www.rescuedogs.me), aggregating listings from vetted rescue organizations.

- 1,500+ available dogs
- 12+ rescue organizations
- 370+ breeds
- 96% AI personality profile coverage

## License

MIT
