import Image from "next/image";
import Link from "next/link";
import type { Dog } from "@/types/dog";

interface ServerDogListingProps {
  title: string;
  intro?: string;
  dogs: Dog[];
}

/**
 * Server-rendered stand-in for a listing page's client UI, used as its Suspense fallback.
 *
 * The client components call useSearchParams(), so Next renders them only in the browser
 * and the fallback is all that reaches the server HTML. Crawlers that don't run
 * JavaScript (AI crawlers, and Bing whenever it defers rendering) therefore get the page's
 * H1, intro and links to its dogs from here. Hydration replaces it with the interactive
 * grid, so the page never shows both (#437).
 */
export default function ServerDogListing({ title, intro, dogs }: ServerDogListingProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
      {intro && <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{intro}</p>}
      <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dogs.map((dog) => (
          <li key={dog.id}>
            <Link
              href={`/dogs/${dog.slug || `unknown-dog-${dog.id}`}`}
              className="rounded-xl bg-card text-card-foreground shadow-sm overflow-hidden flex flex-row md:flex-col h-full"
            >
              <div className="relative w-32 md:w-full flex-shrink-0 aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                {dog.primary_image_url && (
                  <Image
                    src={dog.primary_image_url}
                    alt={dog.name}
                    fill
                    sizes="(max-width: 767px) 128px, 25vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-3 md:p-4">
                <span className="block font-semibold text-gray-900 dark:text-white">{dog.name}</span>
                {(dog.standardized_breed || dog.breed) && (
                  <span className="block text-sm text-gray-600 dark:text-gray-400">
                    {dog.standardized_breed || dog.breed}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
