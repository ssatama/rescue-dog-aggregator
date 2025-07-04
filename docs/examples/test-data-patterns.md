# Test Data Patterns

## Core Principle

Use factory functions with optional overrides for test data. This ensures:

- Tests have complete, valid objects
- Easy customization for specific test cases
- Centralized test data management
- Real data structure consistency

## Python (Backend)

### Basic Factory Pattern

```python
def get_mock_dog(overrides=None):
    """Create a mock dog with sensible defaults."""
    dog = {
        "name": "Buddy",
        "breed": "Golden Retriever",
        "age_months": 24,
        "sex": "male",
        "size": "large",
        "organization_id": 1,
        "external_id": "buddy-123",
        "status": "available",
        "description": "A friendly dog looking for a home",
        "image_urls": ["https://example.com/buddy1.jpg"],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
    if overrides:
        dog.update(overrides)
    return dog

def get_mock_organization(overrides=None):
    """Create a mock organization."""
    org = {
        "id": 1,
        "name": "Test Rescue",
        "website_url": "https://test-rescue.org",
        "location_country": "DE",
        "location_city": "Berlin",
        "email": "contact@test-rescue.org",
        "phone": "+49 30 12345678",
        "description": "A test rescue organization"
    }
    if overrides:
        org.update(overrides)
    return org

# Usage in tests
def test_dog_filtering():
    young_dog = get_mock_dog({"age_months": 6})
    senior_dog = get_mock_dog({"age_months": 120, "name": "Rex"})

    dogs = [young_dog, senior_dog]
    filtered = filter_dogs_by_age(dogs, min_age=60)

    assert len(filtered) == 1
    assert filtered[0]['name'] == "Rex"
```

### Advanced Factory Patterns

```python
def get_mock_scrape_session(overrides=None):
    """Create a mock scrape session."""
    session = {
        "id": 1,
        "organization_id": 1,
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T01:00:00Z",
        "status": "completed",
        "animals_found": 10,
        "animals_added": 5,
        "animals_updated": 3,
        "errors": []
    }
    if overrides:
        session.update(overrides)
    return session

def get_mock_api_response(animals=None, overrides=None):
    """Create a mock API response."""
    if animals is None:
        animals = [get_mock_dog()]

    response = {
        "animals": animals,
        "total": len(animals),
        "page": 1,
        "per_page": 20,
        "filters_applied": {}
    }
    if overrides:
        response.update(overrides)
    return response

# Composite factory for complex scenarios
def create_test_scenario(org_count=2, dogs_per_org=3):
    """Create a complete test scenario with orgs and dogs."""
    organizations = []
    all_dogs = []

    for i in range(org_count):
        org = get_mock_organization({
            "id": i + 1,
            "name": f"Rescue {i + 1}"
        })
        organizations.append(org)

        for j in range(dogs_per_org):
            dog = get_mock_dog({
                "organization_id": org["id"],
                "name": f"Dog {j + 1} from {org['name']}",
                "external_id": f"org{i+1}-dog{j+1}"
            })
            all_dogs.append(dog)

    return {
        "organizations": organizations,
        "dogs": all_dogs
    }
```

## JavaScript (Frontend)

### Basic Factory Pattern

```javascript
const getMockDog = (overrides = {}) => {
  return {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    ageMonths: 24,
    sex: "male",
    size: "large",
    organizationId: 1,
    organizationName: "Test Rescue",
    primaryImageUrl: "https://example.com/buddy.jpg",
    imageUrls: [
      "https://example.com/buddy1.jpg",
      "https://example.com/buddy2.jpg",
    ],
    status: "available",
    description: "A friendly dog looking for a home",
    goodWithKids: true,
    goodWithDogs: true,
    goodWithCats: null,
    medicalNeeds: false,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
};

const getMockOrganization = (overrides = {}) => {
  return {
    id: 1,
    name: "Test Rescue",
    websiteUrl: "https://test-rescue.org",
    locationCountry: "DE",
    locationCity: "Berlin",
    email: "contact@test-rescue.org",
    phone: "+49 30 12345678",
    description: "A test rescue organization",
    logoUrl: "https://example.com/logo.png",
    ...overrides,
  };
};

// Usage in tests
test("displays senior dog badge", () => {
  const seniorDog = getMockDog({ ageMonths: 120, name: "Rex" });
  render(<DogCard dog={seniorDog} />);
  expect(screen.getByText("Senior")).toBeInTheDocument();
});

test("filters dogs by size", () => {
  const smallDog = getMockDog({ size: "small", name: "Tiny" });
  const largeDog = getMockDog({ size: "large", name: "Big" });

  render(<DogList dogs={[smallDog, largeDog]} sizeFilter="small" />);

  expect(screen.getByText("Tiny")).toBeInTheDocument();
  expect(screen.queryByText("Big")).not.toBeInTheDocument();
});
```

### Advanced Factory Patterns

```javascript
// API response factory
const getMockApiResponse = (dogs = null, overrides = {}) => {
  return {
    animals: dogs || [getMockDog()],
    total: dogs?.length || 1,
    page: 1,
    perPage: 20,
    hasMore: false,
    ...overrides,
  };
};

// Filter state factory
const getMockFilterState = (overrides = {}) => {
  return {
    breed: null,
    size: null,
    ageRange: null,
    organization: null,
    goodWithKids: null,
    goodWithDogs: null,
    goodWithCats: null,
    ...overrides,
  };
};

// User preferences factory
const getMockUserPreferences = (overrides = {}) => {
  return {
    favoriteDogs: [],
    savedSearches: [],
    emailAlerts: false,
    displayPreferences: {
      gridView: true,
      showDescriptions: true,
      imagesPerDog: 1,
    },
    ...overrides,
  };
};

// Complex scenario factory
const createTestScenario = (config = {}) => {
  const { orgCount = 2, dogsPerOrg = 3 } = config;

  const organizations = Array.from({ length: orgCount }, (_, i) =>
    getMockOrganization({
      id: i + 1,
      name: `Rescue ${i + 1}`,
    })
  );

  const dogs = organizations.flatMap((org) =>
    Array.from({ length: dogsPerOrg }, (_, i) =>
      getMockDog({
        id: org.id * 100 + i,
        organizationId: org.id,
        organizationName: org.name,
        name: `${org.name} Dog ${i + 1}`,
      })
    )
  );

  return { organizations, dogs };
};
```

## Best Practices

1. **Always use factories** - Never hardcode test data inline
2. **Keep defaults realistic** - Use valid, production-like data
3. **Make overrides explicit** - Pass only what needs to change
4. **Build incrementally** - Start simple, extract patterns as they emerge
5. **Share between test files** - Import from central test utilities

```python
# Python: tests/factories.py
from .dog_factory import get_mock_dog
from .org_factory import get_mock_organization
from .scenario_factory import create_test_scenario

# JavaScript: src/test-utils/factories.js
export { getMockDog } from './dogFactory';
export { getMockOrganization } from './orgFactory';
export { createTestScenario } from './scenarioFactory';
```
