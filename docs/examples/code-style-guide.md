# Code Style Guide

## Python (Backend)

### Functional Programming Approach

Follow a "functional light" approach:

- **No mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **No side effects** in business logic
- Use comprehensions and functional tools (`map`, `filter`, `reduce`)

```python
# AVOID - Mutation
def add_dog_to_list(dogs, new_dog):
    dogs.append(new_dog)  # Mutates the list!
    return dogs

# GOOD - Immutable
def add_dog_to_list(dogs, new_dog):
    return dogs + [new_dog]  # Returns new list

# AVOID - Side effects in business logic
class DogProcessor:
    def process(self, dog):
        self.last_processed = dog  # Side effect!
        dog['processed'] = True    # Mutation!
        return dog

# GOOD - Pure function
def process_dog(dog):
    return {**dog, 'processed': True}  # Returns new dict

# GOOD - Functional approach with error handling
def validate_dog(dog):
    """Pure validation function."""
    errors = []

    if not dog.get('name'):
        errors.append("Name is required")

    if dog.get('age_months', 0) < 0:
        errors.append("Age cannot be negative")

    return {'valid': len(errors) == 0, 'errors': errors}

# GOOD - Composition
def process_dogs(dogs):
    return [
        process_dog(dog)
        for dog in dogs
        if validate_dog(dog)['valid']
    ]
```

### Code Structure

- **No nested if/else statements** - use early returns or guard clauses
- **Small functions** - each should do one thing well
- **Clear naming** - functions should be verbs, variables should be descriptive

```python
# AVOID - Nested conditionals
def calculate_adoption_fee(dog):
    if dog['age_months'] < 12:
        if dog['size'] == 'small':
            return 150
        else:
            return 200
    else:
        if dog['medical_needs']:
            return 50
        else:
            return 100

# GOOD - Early returns, clear logic
def calculate_adoption_fee(dog):
    if is_puppy(dog) and dog['size'] == 'small':
        return 150

    if is_puppy(dog):
        return 200

    if dog.get('medical_needs'):
        return 50

    return 100

def is_puppy(dog):
    return dog['age_months'] < 12
```

### No Comments in Code

Code should be self-documenting through clear naming and structure:

```python
# AVOID - Comments explaining what code does
def process_scraper_data(html):
    # Parse the HTML
    soup = BeautifulSoup(html, 'html.parser')

    # Find all dog cards
    cards = soup.find_all('div', class_='dog-card')

    # Extract data from each card
    dogs = []
    for card in cards:
        # Get the dog name
        name = card.find('h3').text
        dogs.append({'name': name})

    return dogs

# GOOD - Self-documenting code
def extract_dogs_from_html(html):
    parsed_content = BeautifulSoup(html, 'html.parser')
    dog_cards = parsed_content.find_all('div', class_='dog-card')

    return [extract_dog_from_card(card) for card in dog_cards]

def extract_dog_from_card(card):
    return {
        'name': extract_text(card, 'h3'),
        'breed': extract_text(card, '.breed'),
        'age': extract_text(card, '.age')
    }

def extract_text(element, selector):
    found = element.select_one(selector)
    return found.text.strip() if found else None
```

## JavaScript/React (Frontend)

### Functional Components Only

Use functional components with hooks:

```javascript
// AVOID - Class components
class DogCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { favorited: false };
  }

  render() {
    return <div>{this.props.dog.name}</div>;
  }
}

// GOOD - Functional component with hooks
function DogCard({ dog }) {
  const [favorited, setFavorited] = useState(false);

  const handleFavorite = () => {
    setFavorited(!favorited);
    // Save to localStorage or API
  };

  return (
    <div className="dog-card">
      <h3>{dog.name}</h3>
      <button onClick={handleFavorite}>{favorited ? "❤️" : "🤍"}</button>
    </div>
  );
}
```

### Immutable State Updates

Never mutate state directly:

```javascript
// AVOID - Mutating state
function DogList() {
  const [dogs, setDogs] = useState([]);

  const addDog = (newDog) => {
    dogs.push(newDog); // NO! Mutates array
    setDogs(dogs); // React won't re-render
  };

  const updateDog = (id, updates) => {
    const dog = dogs.find((d) => d.id === id);
    dog.name = updates.name; // NO! Mutates object
    setDogs(dogs);
  };
}

// GOOD - Immutable updates
function DogList() {
  const [dogs, setDogs] = useState([]);

  const addDog = (newDog) => {
    setDogs([...dogs, newDog]); // New array
  };

  const updateDog = (id, updates) => {
    setDogs(
      dogs.map((dog) =>
        dog.id === id
          ? { ...dog, ...updates } // New object
          : dog
      )
    );
  };

  const removeDog = (id) => {
    setDogs(dogs.filter((dog) => dog.id !== id));
  };
}
```

### Component Structure

```javascript
// GOOD - Well-structured component
function DogFilters({ filters, onFilterChange }) {
  // Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  // Derived values
  const availableBreeds = useMemo(
    () => getUniqueBreeds(filters.dogs),
    [filters.dogs]
  );

  // Event handlers
  const handleBreedChange = (breed) => {
    onFilterChange({ ...filters, breed });
  };

  const handleSizeChange = (size) => {
    onFilterChange({ ...filters, size });
  };

  // Early returns for edge cases
  if (!filters) return null;

  // Main render
  return (
    <div className="dog-filters">
      <BreedFilter
        breeds={availableBreeds}
        selected={filters.breed}
        onChange={handleBreedChange}
      />
      <SizeFilter selected={filters.size} onChange={handleSizeChange} />
    </div>
  );
}
```

## File Size Limits

- **Backend**: Maximum 200 lines per file
- **Frontend**: Maximum 150 lines per component
- **Tests**: Can be longer but prefer multiple focused test files

When files grow too large:

1. Extract helper functions to utilities
2. Split components into smaller sub-components
3. Create separate modules for related functionality
