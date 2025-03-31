# Data Standardization Approach

## Overview

One of the core challenges in aggregating rescue dog data is the inconsistent format of information across different sources. The Rescue Dog Aggregator addresses this through a comprehensive standardization system that normalizes key data attributes while preserving original information.

## Standardization Components

### 1. Breed Standardization

The system maps various breed descriptions to standardized names:

- **Input examples**: "Lab mix", "Labrador/Retriever", "Yellow Lab"
- **Standardized output**: "Labrador Retriever Mix"

Additionally, breeds are categorized into groups:
- Sporting
- Hound
- Working
- Terrier
- Toy
- Non-Sporting
- Herding
- Mixed
- Unknown

This enables more consistent filtering and navigation by breed type.

### 2. Age Standardization

Age information comes in many formats:

- **Input examples**: "2 years old", "6 months", "young", "senior"
- **Standardized output**: 
  - Age in months (minimum and maximum range)
  - Age category (Puppy, Young, Adult, Senior)

The system uses pattern matching to extract numerical ages when available, and provides reasonable ranges when only descriptive terms are used.

### 3. Size Standardization

Size descriptions vary widely:

- **Input examples**: "Small", "Medium", "40 kg", "Large dog"
- **Standardized output**: Consistent size categories
  - Tiny (< 5 kg)
  - Small (5-10 kg)
  - Medium (10-25 kg)
  - Large (25-40 kg)
  - Extra Large (40+ kg)

When specific weights are provided, they're mapped to the appropriate category.

## Implementation Details

### Database Structure

The standardization is reflected in the database schema:

```sql
-- Original fields
breed VARCHAR(255),
age_text VARCHAR(100),
size VARCHAR(50),

-- Standardized fields
standardized_breed VARCHAR(100),
breed_group VARCHAR(50),
age_min_months INTEGER,
age_max_months INTEGER,
standardized_size VARCHAR(50)