import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import { getAnimalsByCuration } from "@/services/serverAnimalsService";

// Next injects <meta name="robots" content="noindex"> on every 404. Without this the
// root layout's `robots: { index: true }` added a contradictory "index, follow" (#441).
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

const PATHS_BACK = [
  { href: "/dogs", label: "Browse all dogs" },
  { href: "/breeds", label: "Explore breeds" },
  { href: "/guides", label: "Read adoption guides" },
];

/**
 * Branded 404 (#456): site header and footer, ways back into the catalogue, and a few
 * newly listed dogs, since most dead links here are to dogs that have left the site.
 */
export default async function NotFound() {
  // Cached, and returns [] on API failure, so a 404 never becomes an error page
  const recentDogs = await getAnimalsByCuration("recent", 4);

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">404</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            The link may be old, or the dog it pointed to may already have found a home. Plenty
            more are still waiting.
          </p>
          <nav aria-label="Ways back" className="mt-8 flex flex-wrap justify-center gap-3">
            {PATHS_BACK.map(({ href, label }, i) => (
              <Link
                key={href}
                href={href}
                className={
                  i === 0
                    ? "inline-flex items-center rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700"
                    : "inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {recentDogs.length > 0 && (
          <section aria-labelledby="recent-dogs-heading" className="mt-16">
            <h2
              id="recent-dogs-heading"
              className="text-xl font-semibold text-center text-gray-900 dark:text-white"
            >
              Recently listed
            </h2>
            <ul className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {recentDogs.map((dog) => (
                <li key={dog.id}>
                  <Link
                    href={`/dogs/${dog.slug || `unknown-dog-${dog.id}`}`}
                    className="block rounded-xl bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                      {dog.primary_image_url && (
                        <Image
                          src={dog.primary_image_url}
                          alt={dog.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 224px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <span className="block font-semibold text-gray-900 dark:text-white truncate">
                        {dog.name}
                      </span>
                      {(dog.standardized_breed || dog.breed) && (
                        <span className="block text-sm text-gray-600 dark:text-gray-400 truncate">
                          {dog.standardized_breed || dog.breed}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}
