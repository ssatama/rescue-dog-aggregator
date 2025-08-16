export interface Dog {
  id: number;
  name: string;
  age_months?: number;
  age_text?: string;
  sex?: string;
  standardized_size?: string;
  size?: string;
  standardized_breed?: string;
  breed?: string;
  location?: string;
  organization_name?: string;
  organization?: {
    name: string;
    country?: string;
  };
  properties?: {
    good_with_dogs?: boolean | string;
    good_with_cats?: boolean | string;
    good_with_children?: boolean | string;
    [key: string]: any;
  };
}

export interface AttributeComparison {
  values: any[];
  allSame: boolean;
  highlight: boolean[];
}

export interface ComparisonResult {
  [key: string]: AttributeComparison;
}

function normalizeBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  return value.toLowerCase() === "yes" || value.toLowerCase() === "true";
}

function getAgeInMonths(dog: Dog): number {
  if (dog.age_months !== undefined) return dog.age_months;

  // Try to parse from age_text if available
  if (dog.age_text) {
    const match = dog.age_text.match(/(\d+)\s*(year|month)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      return unit.includes("year") ? value * 12 : value;
    }
  }

  return -1; // Unknown age
}

function findHighlights(values: any[], attribute: string): boolean[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [false];

  // Check if all values are the same
  const firstValue = values[0];
  const allSame = values.every((v) => v === firstValue);

  if (allSame) {
    return values.map(() => false);
  }

  // Special logic for different attributes
  switch (attribute) {
    case "age": {
      // Highlight the youngest dogs
      const ageMonths = values.map((v) => {
        if (typeof v === "number") return v;
        const match = v?.match(/(\d+)\s*(year|month)/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          return unit.includes("year") ? value * 12 : value;
        }
        return Infinity;
      });

      const minAge = Math.min(...ageMonths.filter((a) => a !== Infinity));
      return ageMonths.map((age) => age === minAge);
    }

    case "breed":
    case "sex":
    case "size": {
      // Highlight the minority values
      const counts = new Map<any, number>();
      values.forEach((v) => {
        counts.set(v, (counts.get(v) || 0) + 1);
      });

      const minCount = Math.min(...counts.values());
      return values.map((v) => counts.get(v) === minCount);
    }

    case "good_with_dogs":
    case "good_with_cats":
    case "good_with_children": {
      // Highlight false values (less compatible)
      return values.map((v) => v === false);
    }

    default:
      // For other attributes, highlight values that are different from the majority
      const counts = new Map<any, number>();
      values.forEach((v) => {
        counts.set(v, (counts.get(v) || 0) + 1);
      });

      const maxCount = Math.max(...counts.values());
      return values.map((v) => counts.get(v) !== maxCount);
  }
}

export function analyzeComparison(dogs: Dog[]): ComparisonResult {
  if (dogs.length === 0) return {};

  const result: ComparisonResult = {};

  // Age comparison
  const ageValues = dogs.map(
    (dog) => dog.age_text || `${getAgeInMonths(dog)} months`,
  );
  result.age = {
    values: ageValues,
    allSame: ageValues.every((v) => v === ageValues[0]),
    highlight: findHighlights(ageValues, "age"),
  };

  // Sex comparison
  const sexValues = dogs.map((dog) => dog.sex);
  result.sex = {
    values: sexValues,
    allSame: sexValues.every((v) => v === sexValues[0]),
    highlight: findHighlights(sexValues, "sex"),
  };

  // Size comparison
  const sizeValues = dogs.map((dog) => dog.standardized_size || dog.size);
  result.size = {
    values: sizeValues,
    allSame: sizeValues.every((v) => v === sizeValues[0]),
    highlight: findHighlights(sizeValues, "size"),
  };

  // Breed comparison
  const breedValues = dogs.map(
    (dog) => dog.standardized_breed || dog.breed || "Mixed Breed",
  );
  result.breed = {
    values: breedValues,
    allSame: breedValues.every((v) => v === breedValues[0]),
    highlight: findHighlights(breedValues, "breed"),
  };

  // Location comparison - use org country as fallback
  const locationValues = dogs.map(
    (dog) => dog.location || dog.organization?.country,
  );
  result.location = {
    values: locationValues,
    allSame: locationValues.every((v) => v === locationValues[0]),
    highlight: findHighlights(locationValues, "location"),
  };

  // Organization comparison
  const orgValues = dogs.map(
    (dog) => dog.organization_name || dog.organization?.name,
  );
  result.organization = {
    values: orgValues,
    allSame: orgValues.every((v) => v === orgValues[0]),
    highlight: findHighlights(orgValues, "organization"),
  };

  // Good with dogs
  const goodWithDogsValues = dogs.map((dog) =>
    normalizeBoolean(dog.properties?.good_with_dogs),
  );
  result.good_with_dogs = {
    values: goodWithDogsValues,
    allSame: goodWithDogsValues.every((v) => v === goodWithDogsValues[0]),
    highlight: findHighlights(goodWithDogsValues, "good_with_dogs"),
  };

  // Good with cats
  const goodWithCatsValues = dogs.map((dog) =>
    normalizeBoolean(dog.properties?.good_with_cats),
  );
  result.good_with_cats = {
    values: goodWithCatsValues,
    allSame: goodWithCatsValues.every((v) => v === goodWithCatsValues[0]),
    highlight: findHighlights(goodWithCatsValues, "good_with_cats"),
  };

  // Good with children
  const goodWithChildrenValues = dogs.map((dog) =>
    normalizeBoolean(dog.properties?.good_with_children),
  );
  result.good_with_children = {
    values: goodWithChildrenValues,
    allSame: goodWithChildrenValues.every(
      (v) => v === goodWithChildrenValues[0],
    ),
    highlight: findHighlights(goodWithChildrenValues, "good_with_children"),
  };

  return result;
}
