### TDD Process - THE FUNDAMENTAL PRACTICE

**CRITICAL**: TDD is not optional. Every feature, every bug fix, every change MUST follow this process:

#### TDD Example - Backend (Python)

```python
# Step 1: Red - Write failing test first
def test_calculate_dog_adoption_fee():
    """Test adoption fee calculation based on dog attributes."""
    # Young small dog
    young_small = get_mock_dog({"age_months": 6, "size": "small"})
    assert calculate_adoption_fee(young_small) == 150

    # Young large dog
    young_large = get_mock_dog({"age_months": 8, "size": "large"})
    assert calculate_adoption_fee(young_large) == 200

    # Senior with medical needs
    senior_medical = get_mock_dog({
        "age_months": 120,
        "medical_needs": True
    })
    assert calculate_adoption_fee(senior_medical) == 50

# Step 2: Run test - confirm it fails
# pytest tests/test_adoption.py::test_calculate_dog_adoption_fee -v
# FAILED - function doesn't exist

# Step 3: Green - Minimal implementation
def calculate_adoption_fee(dog):
    if dog['age_months'] < 12 and dog['size'] == 'small':
        return 150
    if dog['age_months'] < 12:
        return 200
    if dog.get('medical_needs'):
        return 50
    return 100

# Step 4: Run test - confirm it passes
# pytest tests/test_adoption.py::test_calculate_dog_adoption_fee -v
# PASSED

# Step 5: Refactor - Clean up the code
PUPPY_AGE_MONTHS = 12
PUPPY_SMALL_FEE = 150
PUPPY_LARGE_FEE = 200
SENIOR_MEDICAL_FEE = 50
STANDARD_FEE = 100

def calculate_adoption_fee(dog):
    """Calculate adoption fee based on age, size, and medical needs."""
    if is_puppy(dog):
        return PUPPY_SMALL_FEE if is_small(dog) else PUPPY_LARGE_FEE

    if has_medical_needs(dog):
        return SENIOR_MEDICAL_FEE

    return STANDARD_FEE

def is_puppy(dog):
    return dog['age_months'] < PUPPY_AGE_MONTHS

def is_small(dog):
    return dog['size'] == 'small'

def has_medical_needs(dog):
    return dog.get('medical_needs', False)
```

## 🔧 Common Tasks

### Adding a New Scraper

1. **Create configuration file first** (TDD for configs!)

   ```yaml
   # configs/organizations/new-org.yaml
   schema_version: "1.0"
   id: "new-org"
   name: "New Organization"
   enabled: true
   scraper:
     class_name: "NewOrgScraper"
     module: "scrapers.new_org"
   ```

2. **Write failing tests**

   ```python
   # tests/scrapers/test_new_org_scraper.py
   def test_extract_dog_data():
       scraper = NewOrgScraper()
       html = load_fixture('new_org_sample.html')

       dogs = scraper.extract_dogs(html)

       assert len(dogs) == 10
       assert dogs[0]['name'] == "Expected Name"
       # This will FAIL - scraper doesn't exist yet
   ```

3. **Run test to confirm failure**

   ```bash
   pytest tests/scrapers/test_new_org_scraper.py -v
   ```

4. **Implement scraper**

   ```python
   # scrapers/new_org/scraper.py
   from scrapers.base_scraper import BaseScraper

   class NewOrgScraper(BaseScraper):
       def collect_data(self):
           # Minimal implementation to make test pass
           pass
   ```

5. **Verify all tests pass**

   ```bash
   pytest tests/ -m "not browser and not complex_setup" -v
   ```

6. **Sync to database**
   ```bash
   python management/config_commands.py sync
   ```

#### TDD Example - Frontend (JavaScript)

```javascript
// Step 1: Red - Write failing test first
test("displays adoption fee based on dog attributes", () => {
  // Young small dog
  const youngSmall = getMockDog({ ageMonths: 6, size: "small" });
  render(<AdoptionFee dog={youngSmall} />);
  expect(screen.getByText("Adoption Fee: €150")).toBeInTheDocument();

  // Senior with medical needs
  const seniorMedical = getMockDog({
    ageMonths: 120,
    medicalNeeds: true,
  });
  render(<AdoptionFee dog={seniorMedical} />);
  expect(screen.getByText("Adoption Fee: €50")).toBeInTheDocument();
});

// Step 2: Run test - confirm it fails
// npm test AdoptionFee
// FAIL - Component doesn't exist

// Step 3: Green - Minimal implementation
function AdoptionFee({ dog }) {
  const fee = calculateAdoptionFee(dog);
  return <div>Adoption Fee: €{fee}</div>;
}

function calculateAdoptionFee(dog) {
  if (dog.ageMonths < 12 && dog.size === "small") return 150;
  if (dog.ageMonths < 12) return 200;
  if (dog.medicalNeeds) return 50;
  return 100;
}

// Step 4: Run test - confirm it passes
// npm test AdoptionFee
// PASS

// Step 5: Refactor - Extract constants, improve structure
const FEES = {
  PUPPY_SMALL: 150,
  PUPPY_LARGE: 200,
  MEDICAL_NEEDS: 50,
  STANDARD: 100,
};

const isPuppy = (dog) => dog.ageMonths < 12;
const isSmall = (dog) => dog.size === "small";

function calculateAdoptionFee(dog) {
  if (isPuppy(dog)) {
    return isSmall(dog) ? FEES.PUPPY_SMALL : FEES.PUPPY_LARGE;
  }

  if (dog.medicalNeeds) {
    return FEES.MEDICAL_NEEDS;
  }

  return FEES.STANDARD;
}

function AdoptionFee({ dog }) {
  const fee = calculateAdoptionFee(dog);

  return (
    <div className="adoption-fee">
      <span className="label">Adoption Fee:</span>
      <span className="amount">€{fee}</span>
    </div>
  );
}
```

### Refactoring Guidelines

#### When to Refactor

- **Always assess after green**: Once tests pass, evaluate if refactoring would add value
- **When you see duplication**: But only knowledge duplication, not structural similarity
- **When names could be clearer**: Variable names, function names that don't express intent
- **When patterns emerge**: After implementing several similar features

#### Understanding DRY - It's About Knowledge, Not Code

DRY (Don't Repeat Yourself) is about not duplicating **knowledge** in the system, not about eliminating all code that looks similar.

```python
# NOT a DRY violation - different knowledge despite similar code
def validate_dog_age(age_months):
    return 0 <= age_months <= 240  # Dogs rarely live past 20 years

def validate_adoption_fee(fee):
    return 0 <= fee <= 500  # Max adoption fee policy

def validate_organization_years(years):
    return 0 <= years <= 100  # Reasonable org age

# These look similar but represent different business rules that will
# evolve independently. Don't abstract them!

# This IS a DRY violation - same knowledge in multiple places
# Bad - knowledge duplicated
class DogCard:
    def get_age_category(self, dog):
        if dog['age_months'] < 12:
            return 'puppy'
        elif dog['age_months'] < 36:
            return 'young'
        elif dog['age_months'] < 96:
            return 'adult'
        else:
            return 'senior'

class DogFilter:
    def filter_by_age(self, dogs, category):
        if category == 'puppy':
            return [d for d in dogs if d['age_months'] < 12]
        elif category == 'young':
            return [d for d in dogs if 12 <= d['age_months'] < 36]
        # ... same knowledge repeated

# Good - knowledge in one place
AGE_CATEGORIES = {
    'puppy': (0, 12),
    'young': (12, 36),
    'adult': (36, 96),
    'senior': (96, float('inf'))
}

def get_age_category(age_months):
    for category, (min_age, max_age) in AGE_CATEGORIES.items():
        if min_age <= age_months < max_age:
            return category
    return 'unknown'
```
