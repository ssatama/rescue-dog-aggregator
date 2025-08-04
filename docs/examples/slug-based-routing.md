# Slug-Based Routing Examples

This guide demonstrates the slug-based URL patterns implemented throughout the Rescue Dog Aggregator for SEO-friendly URLs and better user experience.

## Core Concept

Every animal and organization has a unique `slug` field that creates readable URLs:

- Old: `/dogs/123` → New: `/dogs/buddy-golden-retriever-123`
- Old: `/organizations/1` → New: `/organizations/pets-turkey`

## Backend Implementation

### Database Schema

```sql
-- Animals table with slug column
ALTER TABLE animals ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE UNIQUE INDEX idx_animals_slug ON animals(slug);

-- Organizations table with slug column  
ALTER TABLE organizations ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);

-- Example data
INSERT INTO animals (name, breed, external_id, slug) VALUES 
('Buddy', 'Golden Retriever', 'buddy-123', 'buddy-golden-retriever-123');

INSERT INTO organizations (name, slug) VALUES 
('Pets Turkey', 'pets-turkey');
```

### API Route Structure

```python
# api/routes/animals.py - Current implementation
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(tags=["animals"])

@router.get("/{animal_slug}", response_model=AnimalWithImages)
async def get_animal_by_slug(animal_slug: str, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Get animal by SEO-friendly slug with legacy ID redirect."""
    try:
        animal_service = AnimalService(cursor)
        
        # Handle legacy numeric IDs with 301 redirect
        if animal_slug.isdigit():
            animal_id = int(animal_slug)
            animal = animal_service.get_animal_by_id(animal_id)
            if animal and hasattr(animal, "slug"):
                return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)
        
        # Primary slug-based lookup
        animal = animal_service.get_animal_by_slug(animal_slug)
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        
        return animal
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching animal {animal_slug}: {e}")
        raise APIException(status_code=500, detail="Internal server error")

# Explicit legacy route for backwards compatibility
@router.get("/id/{animal_id}", response_model=AnimalWithImages)
async def get_animal_by_id_legacy(animal_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Legacy endpoint - always redirects to slug URL."""
    animal_service = AnimalService(cursor)
    animal = animal_service.get_animal_by_id(animal_id)
    
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    # 301 redirect preserves SEO value
    return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)
```

### Service Layer Implementation

```python
# api/services/animal_service.py
class AnimalService:
    def get_animal_by_slug(self, slug: str) -> Optional[AnimalWithImages]:
        """Get animal by slug with image batch loading."""
        try:
            # Primary animal query by slug
            self.cursor.execute("""
                SELECT a.*, o.name as organization_name, o.slug as organization_slug
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.slug = %s AND a.availability_status = 'available'
            """, (slug,))
            
            animal_data = self.cursor.fetchone()
            if not animal_data:
                return None
            
            # Batch load images to prevent N+1 queries
            images = self._get_animal_images(animal_data['id'])
            animal_data['images'] = images
            
            return AnimalWithImages(**animal_data)
            
        except Exception as e:
            logger.exception(f"Error fetching animal by slug {slug}: {e}")
            raise APIException(status_code=500, detail="Database error fetching animal")
    
    def get_animal_by_id(self, animal_id: int) -> Optional[Animal]:
        """Legacy method - used only for redirects."""
        self.cursor.execute("SELECT * FROM animals WHERE id = %s", (animal_id,))
        animal_data = self.cursor.fetchone()
        return Animal(**animal_data) if animal_data else None
```

## Frontend Implementation (Next.js 15)

### Dynamic Routes with Slug

```typescript
// frontend/src/app/dogs/[slug]/page.tsx
import { Metadata } from 'next';
import { getAnimalBySlug } from '@/lib/api';
import DogDetailClient from './DogDetailClient';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

// Server component with async params handling
export default async function DogPage(props: Props) {
  const { params } = props;
  
  // Handle Next.js 15 async params
  const resolvedParams = params && typeof params.then === "function" 
    ? await params 
    : params || {};
  
  const animal = await getAnimalBySlug(resolvedParams.slug);
  
  if (!animal) {
    return <div>Animal not found</div>;
  }
  
  return <DogDetailClient animal={animal} />;
}

// SEO metadata generation
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { params } = props;
  const resolvedParams = params && typeof params.then === "function" 
    ? await params 
    : params || {};
  
  const animal = await getAnimalBySlug(resolvedParams.slug);
  
  if (!animal) {
    return { title: 'Animal Not Found' };
  }
  
  return {
    title: `${animal.name} - ${animal.breed} | Rescue Dogs`,
    description: `Meet ${animal.name}, a ${animal.age_text} ${animal.breed} looking for a loving home.`,
    openGraph: {
      title: `${animal.name} - ${animal.breed}`,
      description: `Adopt ${animal.name} from ${animal.organization.name}`,
      images: animal.images?.length > 0 ? [animal.images[0].image_url] : [],
      url: `https://rescuedogs.me/dogs/${animal.slug}`,
    },
  };
}

// Static generation with ISR
export async function generateStaticParams() {
  // Generate static pages for popular animals at build time
  const popularAnimals = await getPopularAnimals(100);
  
  return popularAnimals.map((animal) => ({
    slug: animal.slug,
  }));
}
```

### Client Component with Navigation

```typescript
// frontend/src/app/dogs/[slug]/DogDetailClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AnimalWithImages } from '@/types/api';

interface Props {
  animal: AnimalWithImages;
}

export default function DogDetailClient({ animal }: Props) {
  const router = useRouter();
  
  const handleViewSimilar = () => {
    // Navigate with breed filter using slug-based URL
    const params = new URLSearchParams({
      breed: animal.standardized_breed || animal.breed,
      size: animal.standardized_size || animal.size,
    });
    router.push(`/dogs?${params.toString()}`);
  };
  
  const handleViewOrganization = () => {
    // Navigate to organization using slug
    router.push(`/organizations/${animal.organization.slug}`);
  };
  
  return (
    <div className="dog-detail">
      <div className="breadcrumb">
        <button onClick={() => router.push('/dogs')}>All Dogs</button>
        <span> / {animal.name}</span>
      </div>
      
      <h1>{animal.name}</h1>
      <p>{animal.breed} • {animal.age_text}</p>
      
      <button onClick={handleViewSimilar}>
        Find Similar Dogs
      </button>
      
      <button onClick={handleViewOrganization}>
        About {animal.organization.name}
      </button>
    </div>
  );
}
```

### Link Components with Slug Support

```typescript
// frontend/src/components/dogs/DogCard.tsx
import Link from 'next/link';
import { AnimalWithImages } from '@/types/api';

interface DogCardProps {
  animal: AnimalWithImages;
  showOrganization?: boolean;
}

export function DogCard({ animal, showOrganization }: DogCardProps) {
  return (
    <div className="dog-card">
      {/* SEO-friendly link using slug */}
      <Link 
        href={`/dogs/${animal.slug}`}
        className="dog-card-link"
      >
        <img 
          src={animal.primary_image_url} 
          alt={`${animal.name} - ${animal.breed}`}
        />
        
        <div className="dog-info">
          <h3>{animal.name}</h3>
          <p>{animal.breed} • {animal.age_text}</p>
          
          {showOrganization && (
            <p className="organization">
              From {animal.organization.name}
            </p>
          )}
        </div>
      </Link>
      
      {/* Organization link also using slugs */}
      {animal.organization?.slug && (
        <Link 
          href={`/organizations/${animal.organization.slug}`}
          className="organization-link"
        >
          View Organization
        </Link>
      )}
    </div>
  );
}
```

## API Client Implementation

```typescript
// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function getAnimalBySlug(slug: string): Promise<AnimalWithImages | null> {
  try {
    const response = await fetch(`${API_BASE}/animals/${slug}`, {
      next: { revalidate: 300 }, // ISR cache for 5 minutes
    });
    
    if (response.status === 301 || response.status === 302) {
      // Handle redirects for legacy IDs
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        const finalResponse = await fetch(redirectUrl);
        return finalResponse.ok ? await finalResponse.json() : null;
      }
    }
    
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error(`Error fetching animal by slug ${slug}:`, error);
    return null;
  }
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  try {
    const response = await fetch(`${API_BASE}/organizations/${slug}`, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });
    
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error(`Error fetching organization by slug ${slug}:`, error);
    return null;
  }
}
```

## Migration Strategy

### Database Migration

```sql
-- Add slug columns with temporary defaults
ALTER TABLE animals ADD COLUMN slug VARCHAR(255);
ALTER TABLE organizations ADD COLUMN slug VARCHAR(255);

-- Generate initial slugs
UPDATE animals SET slug = LOWER(
  REGEXP_REPLACE(
    name || '-' || COALESCE(breed, 'dog') || '-' || id::text,
    '[^a-zA-Z0-9]+', '-', 'g'
  )
);

UPDATE organizations SET slug = LOWER(
  REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')
);

-- Make slugs unique and required
ALTER TABLE animals ALTER COLUMN slug SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX idx_animals_slug ON animals(slug);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
```

### Scraper Updates

```python
# scrapers/base_scraper.py - Updated to generate slugs
import re
from typing import Dict, Any

class BaseScraper:
    def generate_animal_slug(self, animal_data: Dict[str, Any]) -> str:
        """Generate SEO-friendly slug from animal data."""
        name = animal_data.get('name', 'dog')
        breed = animal_data.get('breed', 'mixed')
        external_id = animal_data.get('external_id', '')
        
        # Create slug: name-breed-id
        slug_parts = [name, breed, external_id]
        slug = '-'.join(part for part in slug_parts if part)
        
        # Clean slug: lowercase, replace special chars with hyphens
        slug = re.sub(r'[^a-zA-Z0-9]+', '-', slug.lower())
        slug = re.sub(r'-+', '-', slug).strip('-')
        
        # Ensure reasonable length
        return slug[:200] if len(slug) > 200 else slug
    
    def process_animal_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw animal data and add slug."""
        processed = self.standardize_animal_data(raw_data)
        processed['slug'] = self.generate_animal_slug(processed)
        return processed
```

## Testing Patterns

### Backend Tests

```python
# tests/api/test_slug_routing.py
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

class TestSlugBasedRouting:
    def test_get_animal_by_slug_success(self):
        """Test successful animal retrieval by slug."""
        # Arrange
        slug = "buddy-golden-retriever-123"
        
        # Act
        response = client.get(f"/api/animals/{slug}")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == slug
        assert data["name"] == "Buddy"
        assert "images" in data
    
    def test_legacy_id_redirect_to_slug(self):
        """Test legacy ID redirects to slug URL."""
        # Arrange
        animal_id = 123
        
        # Act
        response = client.get(f"/api/animals/id/{animal_id}", follow_redirects=False)
        
        # Assert
        assert response.status_code == 301
        assert "/animals/buddy-golden-retriever-123" in response.headers["location"]
    
    def test_numeric_slug_redirects_to_proper_slug(self):
        """Test numeric slug in main route redirects."""
        # Act
        response = client.get("/api/animals/123", follow_redirects=False)
        
        # Assert
        assert response.status_code == 301
        assert "/animals/buddy-golden-retriever-123" in response.headers["location"]
    
    def test_invalid_slug_returns_404(self):
        """Test invalid slug returns proper 404."""
        # Act
        response = client.get("/api/animals/nonexistent-slug")
        
        # Assert
        assert response.status_code == 404
        assert "Animal not found" in response.json()["detail"]
```

### Frontend Tests

```typescript
// frontend/src/app/dogs/[slug]/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DogPage from '../page';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('DogPage with slug routing', () => {
  const mockAnimal = {
    id: 1,
    slug: 'buddy-golden-retriever-123',
    name: 'Buddy',
    breed: 'Golden Retriever',
    age_text: '2 years old',
    organization: {
      id: 1,
      slug: 'pets-turkey',
      name: 'Pets Turkey'
    },
    images: [
      { id: 1, image_url: 'buddy1.jpg', is_primary: true }
    ]
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders animal from slug parameter', async () => {
    // Arrange
    vi.mocked(api.getAnimalBySlug).mockResolvedValue(mockAnimal);
    
    // Act
    render(<DogPage params={{ slug: 'buddy-golden-retriever-123' }} />);
    
    // Assert
    await screen.findByText('Buddy');
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
    expect(api.getAnimalBySlug).toHaveBeenCalledWith('buddy-golden-retriever-123');
  });
  
  it('handles async params in Next.js 15', async () => {
    // Arrange
    vi.mocked(api.getAnimalBySlug).mockResolvedValue(mockAnimal);
    const asyncParams = Promise.resolve({ slug: 'buddy-golden-retriever-123' });
    
    // Act
    render(<DogPage params={asyncParams} />);
    
    // Assert
    await screen.findByText('Buddy');
  });
  
  it('shows not found for invalid slug', async () => {
    // Arrange
    vi.mocked(api.getAnimalBySlug).mockResolvedValue(null);
    
    // Act
    render(<DogPage params={{ slug: 'invalid-slug' }} />);
    
    // Assert
    await screen.findByText('Animal not found');
  });
});
```

## SEO Benefits

### URL Structure Comparison

```
// Before (ID-based)
❌ /dogs/123 - Not descriptive, no SEO value
❌ /organizations/1 - Generic, forgettable

// After (Slug-based)  
✅ /dogs/buddy-golden-retriever-123 - Descriptive, SEO-friendly
✅ /organizations/pets-turkey - Brandable, memorable
```

### Search Engine Optimization

```typescript
// Metadata generation for SEO
export async function generateMetadata(props: Props): Promise<Metadata> {
  const animal = await getAnimalBySlug(resolvedParams.slug);
  
  return {
    title: `${animal.name} - ${animal.breed} for Adoption | Rescue Dogs`,
    description: `Meet ${animal.name}, a loving ${animal.age_text} ${animal.breed} ready for adoption from ${animal.organization.name}.`,
    keywords: [animal.breed, animal.size, 'dog adoption', animal.organization.country].join(', '),
    
    openGraph: {
      title: `Adopt ${animal.name} - ${animal.breed}`,
      description: `This beautiful ${animal.breed} is looking for a forever home`,
      url: `https://rescuedogs.me/dogs/${animal.slug}`,
      images: [
        {
          url: animal.primary_image_url,
          width: 800,
          height: 600,
          alt: `${animal.name} - ${animal.breed} for adoption`,
        }
      ],
      type: 'article',
    },
    
    twitter: {
      card: 'summary_large_image',
      title: `Adopt ${animal.name} - ${animal.breed}`,
      description: `Meet ${animal.name} from ${animal.organization.name}`,
      images: [animal.primary_image_url],
    },
    
    alternates: {
      canonical: `https://rescuedogs.me/dogs/${animal.slug}`,
    },
  };
}
```

This slug-based routing system provides better SEO, improved user experience, and maintains backwards compatibility with legacy URLs through automatic redirects.