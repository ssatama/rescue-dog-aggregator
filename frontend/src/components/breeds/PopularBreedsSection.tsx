import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CardPhoto } from "@/components/dogs/DogCard";
import type { PopularBreedsSectionProps } from "@/types/breeds";
import type { BreedWithImages } from "@/schemas/animals";

const POPULAR_TILES = 7;

function isMixedOrUnknown(breed: BreedWithImages): boolean {
  return (
    ["Mixed Breed", "Mix", "Unknown"].includes(breed.primary_breed) ||
    breed.breed_group === "Mixed" ||
    breed.breed_group === "Unknown"
  );
}

interface Tile {
  name: string;
  href: string;
  count?: number;
  note?: string;
  image?: string;
}

function BreedTile({ tile, priority }: { tile: Tile; priority: boolean }): React.JSX.Element {
  return (
    <Link
      href={tile.href}
      className="group overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="breed-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <CardPhoto
          dog={{ name: tile.name, primary_image_url: tile.image }}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      <div className="p-3">
        <h3 className="font-display text-base font-bold text-ink sm:text-lg">{tile.name}</h3>
        <p className="text-sm text-subtle">
          {[tile.count ? `${tile.count} dogs` : null, tile.note].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

/**
 * The breeds with most dogs listed, with mixed breeds as one tile among them
 * rather than a hero of their own (#500).
 */
export default function PopularBreedsSection({ popularBreeds, mixedBreed }: PopularBreedsSectionProps) {
  const tiles: Tile[] = (popularBreeds ?? [])
    .filter((breed) => !isMixedOrUnknown(breed) && breed.breed_slug)
    .slice(0, mixedBreed ? POPULAR_TILES : POPULAR_TILES + 1)
    .map((breed) => ({
      name: breed.primary_breed,
      href: `/breeds/${breed.breed_slug}`,
      count: breed.count,
      note: breed.breed_group && breed.breed_group !== "Unknown" ? breed.breed_group : undefined,
      image: breed.sample_dogs?.find((dog) => dog.primary_image_url)?.primary_image_url,
    }));

  if (mixedBreed) {
    // Mixed breeds are the biggest group, so they take their place by count
    const mixedTile: Tile = {
      name: "Mixed breeds",
      href: "/breeds/mixed",
      count: mixedBreed.count,
      note: "Every one unique",
      image: mixedBreed.sample_dogs?.find((dog) => dog.primary_image_url)?.primary_image_url,
    };
    const at = tiles.findIndex((tile) => (tile.count ?? 0) < (mixedTile.count ?? 0));
    tiles.splice(at === -1 ? tiles.length : at, 0, mixedTile);
  }

  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="popular-breeds-heading" className="py-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="popular-breeds-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Most dogs listed
        </h2>
        <Link
          href="#all-breeds"
          className="inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:underline dark:text-orange-400"
        >
          All breeds A–Z
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <BreedTile key={tile.href} tile={tile} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
