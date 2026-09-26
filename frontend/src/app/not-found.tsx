import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import WayBack from "@/components/ui/WayBack";
import { getAnimalsByCuration } from "@/services/serverAnimalsService";

// Next injects <meta name="robots" content="noindex"> on every 404. Without this the
// root layout's `robots: { index: true }` added a contradictory "index, follow" (#441).
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

/**
 * Branded 404 (#456, #503): the site's one way-back pattern, and a few newly
 * listed dogs, since most dead links here are to dogs that are no longer listed.
 */
export default async function NotFound() {
  // Cached, and returns [] on API failure, so a 404 never becomes an error page
  const recentDogs = await getAnimalsByCuration("recent", 4);

  return (
    <Layout>
      <WayBack
        eyebrow="404"
        title="We couldn't find that page"
        message="The link may be old, or the dog it pointed to may no longer be listed. Plenty more are still waiting."
      >
        {recentDogs.length > 0 && (
          <section aria-labelledby="recent-dogs-heading" className="mt-12">
            <h2 id="recent-dogs-heading" className="font-display text-xl font-bold text-ink">
              Recently listed
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {recentDogs.map((dog) => (
                <li key={dog.id}>
                  <Link
                    href={`/dogs/${dog.slug || `unknown-dog-${dog.id}`}`}
                    className="block overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative aspect-square bg-soft">
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
                      <span className="block truncate font-display font-bold text-ink">{dog.name}</span>
                      {(dog.standardized_breed || dog.breed) && (
                        <span className="block truncate text-sm text-subtle">
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
      </WayBack>
    </Layout>
  );
}
