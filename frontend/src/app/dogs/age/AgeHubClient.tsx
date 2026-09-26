import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AgeEntryPoints from "@/components/home/AgeEntryPoints";
import type { AgeHubClientProps } from "@/types/pageComponents";

/** /dogs/age (#502): the two age pages, as on the home page. */
export default function AgeHubClient({ initialStats }: AgeHubClientProps) {
  const countFor = (slug: string): number =>
    initialStats?.ageCategories?.find((s) => s.slug?.toLowerCase() === slug)?.count ?? 0;

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Dogs", url: "/dogs" },
          { name: "By Age" },
        ]}
      />

      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Puppies and senior dogs</h1>
      <p className="mt-2 max-w-2xl text-base text-subtle">
        The youngest and oldest rescue dogs often wait the longest. Pick an age to see who is listed now.
      </p>

      <div className="mt-6 max-w-3xl">
        {/* Both ages are always linked: the hub is only these links */}
        <AgeEntryPoints puppies={countFor("puppies")} seniors={countFor("senior")} keepEmpty />
      </div>

      <Link
        href="/dogs"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-orange-400"
      >
        Browse dogs of every age
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
