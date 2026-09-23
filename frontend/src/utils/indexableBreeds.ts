export interface IndexableBreedCandidate {
  breed_type?: string;
  breed_group?: string;
  primary_breed?: string;
  breed_slug?: string;
}

/**
 * The breeds that get their own indexable page: the sitemap lists exactly these, and
 * /breeds links every one of them. Mixed breeds share /breeds/mixed; "Unknown" is the
 * absence of a breed, not a breed, and indexing it offers a searcher nothing.
 */
export function getIndexableBreeds<T extends IndexableBreedCandidate>(breeds: T[] | undefined): T[] {
  if (!Array.isArray(breeds)) return [];
  const seenSlugs = new Set<string>();
  return breeds.filter((breed) => {
    const isMixed =
      breed.breed_type === "mixed" ||
      breed.breed_group === "Mixed" ||
      breed.primary_breed?.toLowerCase().includes("mix");
    const isUnknown =
      breed.breed_type === "unknown" ||
      breed.breed_slug === "unknown" ||
      breed.primary_breed?.toLowerCase() === "unknown";
    if (isMixed || isUnknown || !breed.breed_slug) return false;
    if (seenSlugs.has(breed.breed_slug)) return false;
    seenSlugs.add(breed.breed_slug);
    return true;
  });
}
