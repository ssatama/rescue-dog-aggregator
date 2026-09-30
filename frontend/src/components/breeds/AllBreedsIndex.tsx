import Link from "next/link";
import { breedCatalogHref, getIndexableBreeds } from "@/utils/indexableBreeds";
import { isBreedType } from "@/utils/breedTypes";

interface AllBreedsIndexProps {
  breeds?: Array<{ primary_breed?: string; breed_slug?: string; breed_type?: string; breed_group?: string; count?: number }>;
  /** Breeds too small for a page, linked to the catalog instead (#668) */
  otherBreeds?: Array<{ primary_breed: string; count: number }>;
}

function BreedLinks({ breeds }: { breeds: Array<{ primary_breed?: string; href: string; count?: number }> }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {breeds.map((breed) => (
        <li key={breed.href}>
          <Link
            href={breed.href}
            className="block py-2.5 text-ink hover:text-orange-700 hover:underline dark:hover:text-orange-400"
          >
            {breed.primary_breed}
            {breed.count ? <span className="text-sm text-subtle"> ({breed.count})</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Server-rendered A–Z links to every breed page in the sitemap, so the hub links each
 * one without depending on a group being expanded (#438). Types such as "Hound" have
 * pages too, listed apart so they don't read as breeds (#669).
 */
const byName = (a: { primary_breed?: string }, b: { primary_breed?: string }): number =>
  (a.primary_breed ?? "").localeCompare(b.primary_breed ?? "", "en");

export default function AllBreedsIndex({ breeds, otherBreeds = [] }: AllBreedsIndexProps) {
  const withPage = getIndexableBreeds(breeds).map((breed) => ({ ...breed, href: `/breeds/${breed.breed_slug}` }));
  const withoutPage = otherBreeds.map((breed) => ({ ...breed, href: breedCatalogHref(breed.primary_breed) }));
  const breedsOnly = withPage.filter((breed) => !isBreedType(breed.primary_breed)).sort(byName);
  // A type too small for a page is still a type, not one of the other breeds
  const types = [...withPage, ...withoutPage].filter((breed) => isBreedType(breed.primary_breed)).sort(byName);
  const others = withoutPage.filter((breed) => !isBreedType(breed.primary_breed)).sort(byName);
  if (breedsOnly.length === 0 && types.length === 0 && others.length === 0) return null;

  return (
    <div className="container mx-auto px-4 pb-12">
      {breedsOnly.length > 0 && (
        <section id="all-breeds" className="scroll-mt-20 pt-8" aria-labelledby="all-breeds-heading">
          <h2 id="all-breeds-heading" className="mb-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            All breeds A–Z
          </h2>
          <BreedLinks breeds={breedsOnly} />
        </section>
      )}
      {types.length > 0 && (
        <section id="breed-types" className="scroll-mt-20 pt-8" aria-labelledby="breed-types-heading">
          <h2 id="breed-types-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Breed types
          </h2>
          <p className="mb-2 mt-1 text-subtle">Dogs their rescue lists as a type, such as a hound cross, rather than a breed.</p>
          <BreedLinks breeds={types} />
        </section>
      )}
      {others.length > 0 && (
        <section id="other-breeds" className="scroll-mt-20 pt-8" aria-labelledby="other-breeds-heading">
          <h2 id="other-breeds-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Other breeds
          </h2>
          <p className="mb-2 mt-1 text-subtle">Too few dogs for a page of their own; each opens in the catalog.</p>
          <BreedLinks breeds={others} />
        </section>
      )}
    </div>
  );
}
