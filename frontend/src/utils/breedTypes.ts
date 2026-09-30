/**
 * Rescue labels for a kind of dog rather than a breed (#669): "Hound Cross",
 * "Terrier", "Livestock Guardian Dog". Standardisation keeps them, so each has
 * a page, which people do search for ("hound mix"). The hub lists them apart
 * from the breeds, and their pages describe them as a type.
 */
const BREED_TYPES = new Set(["Hound", "Terrier", "Spaniel", "Spitz", "Livestock Guardian Dog"]);

export function isBreedType(primaryBreed: string | undefined): boolean {
  return primaryBreed !== undefined && BREED_TYPES.has(primaryBreed);
}

/** A type page's description, in place of a breed's */
export function breedTypeDescription(primaryBreed: string): string {
  const type = primaryBreed.toLowerCase();
  return `Dogs their rescue lists as a ${type} type or ${type} cross, without naming a specific breed.`;
}
