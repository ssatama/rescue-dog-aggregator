import { formatCount } from "@/utils/formatCount";
import type { Metadata } from "next";
import Layout from "../components/layout/Layout";
import HomeHero from "../components/home/HomeHero";
import AdoptableNowRow from "../components/home/AdoptableNowRow";
import HomeDogRow from "../components/home/HomeDogRow";
import { HOME_ROW_DOGS } from "../constants/layout";
import AgeEntryPoints from "../components/home/AgeEntryPoints";
import RescuesStrip from "../components/home/RescuesStrip";
import GuidesTeaser from "../components/home/GuidesTeaser";
import {
  getAgeStats,
  getAnimals,
  getAnimalsByCuration,
  getStatistics,
} from "../services/serverAnimalsService";
import { getAllGuides } from "../lib/guides";
import { reportError } from "../utils/logger";

export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
  let stats: { total_dogs?: number; total_organizations?: number } = {};
  try {
    stats = await getStatistics();
  } catch (e) {
    reportError(e, { context: "metadata_generation", component: "Home" });
  }

  // No invented fallback numbers: this route is ISR-cached for 6 hours, so a made-up
  // "4,500+ dogs" would be served that long. Without live stats, say nothing numeric (#444).
  const totalDogs = stats.total_dogs ?? 0;
  const totalOrgs = stats.total_organizations ?? 0;
  const hasStats = totalDogs > 0 && totalOrgs > 0;

  return {
    title: hasStats
      ? `Find Rescue Dogs | ${formatCount(totalDogs)}+ Dogs Available`
      : "Find Rescue Dogs from Across Europe | rescuedogs.me",
    description: hasStats
      ? `Browse ${formatCount(totalDogs)}+ rescue dogs from ${totalOrgs} European organizations. Filter by breed, size, age and location to find your companion.`
      : "Browse rescue dogs from verified European organizations. Filter by breed, size, age and location to find your companion.",
    alternates: {
      canonical: "https://www.rescuedogs.me",
    },
    openGraph: {
      title: "Find Your Perfect Rescue Dog",
      description: hasStats
        ? `${formatCount(totalDogs)}+ dogs from verified rescue organizations across Europe.`
        : "Rescue dogs from verified rescue organizations across Europe.",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Find Rescue Dogs",
      description: hasStats
        ? `Browse ${formatCount(totalDogs)}+ rescue dogs from ${totalOrgs} European organizations.`
        : "Browse rescue dogs from verified European organizations.",
    },
  };
}

export default async function Home(): Promise<React.JSX.Element> {
  const [statistics, lookingForHomes, waitingLongest, ageStats, guides] = await Promise.all([
    getStatistics(),
    // Rescues dealt out in turn, so one rescue's latest batch cannot fill the row
    getAnimals({ sort: "recommended", limit: HOME_ROW_DOGS, animal_type: "dog", status: "available" }),
    // Each rescue's longest-listed dog, longest first
    getAnimalsByCuration("longest_waiting", HOME_ROW_DOGS),
    getAgeStats(),
    getAllGuides(),
  ]);

  // The service answers a failed fetch with empty lists and zero counts. This
  // page is cached for hours, so a home without dogs or statistics must fail the
  // render instead: ISR keeps serving the last good page, and a Vercel build that
  // hits the API mid-deploy fails rather than shipping it. Only CI, which builds
  // with no API at all, renders it anyway.
  if (
    (statistics.total_dogs === 0 || lookingForHomes.length === 0 || waitingLongest.length === 0) &&
    process.env.GITHUB_ACTIONS !== "true"
  ) {
    throw new Error("Home: no dogs or statistics came back from the API");
  }

  const rescues = statistics.organizations ?? [];
  const age = (slug: string): number =>
    ageStats.ageCategories.find((category) => category.slug === slug)?.count ?? 0;
  const oldestListing = waitingLongest[0]?.created_at;
  const waitingSince = oldestListing
    ? new Date(oldestListing).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    : null;

  return (
    <Layout>
      <HomeHero totalDogs={statistics.total_dogs} totalRescues={statistics.total_organizations} />
      <div className="mx-auto grid max-w-7xl gap-10 pt-2 sm:gap-12 sm:px-2 lg:px-4">
        <AdoptableNowRow dogs={lookingForHomes} totalDogs={statistics.total_dogs} rescues={rescues} />
        <HomeDogRow
          id="home-waiting"
          title="Waiting longest"
          meta={waitingSince ? `Some listed since ${waitingSince}` : null}
          href="/dogs?sort=oldest"
          linkLabel="See all"
          dogs={waitingLongest}
        />
        <AgeEntryPoints puppies={age("puppies")} seniors={age("senior")} />
        <GuidesTeaser
          guides={guides.map(({ slug, frontmatter }) => ({
            slug,
            title: frontmatter.title,
            description: frontmatter.description,
            readTime: frontmatter.readTime,
          }))}
        />
        <RescuesStrip rescues={rescues} />
      </div>
    </Layout>
  );
}
