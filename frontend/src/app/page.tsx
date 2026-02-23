import type { Metadata } from "next";
import type { OrganizationCardData } from "../types/organizationComponents";
import Layout from "../components/layout/Layout";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import HeroSection from "../components/home/HeroSection";
import ClientHomePage from "../components/home/ClientHomePage";
import { getHomePageData, getCountryStats, getAgeStats } from "../services/serverAnimalsService";
import { getBreedsWithImagesForHomePage } from "../services/breedImagesService";
import { getEnhancedOrganizationsSSR } from "../services/organizationsService";
import { reportError } from "../utils/logger";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  let stats = { total_dogs: 4500, total_organizations: 13 };
  try {
    const data = await getHomePageData();
    stats = data.statistics || stats;
  } catch (e) {
    reportError(e, { context: "metadata_generation", component: "Home" });
  }

  const totalDogs = stats.total_dogs || 4500;
  const totalOrgs = stats.total_organizations || 13;

  return {
    title: `Find Rescue Dogs | ${totalDogs.toLocaleString()}+ Dogs Available`,
    description: `Browse ${totalDogs.toLocaleString()}+ rescue dogs from ${totalOrgs} European organizations. Filter by breed, size, age, and location to find your perfect companion.`,
    alternates: {
      canonical: "https://www.rescuedogs.me",
    },
    openGraph: {
      title: "Find Your Perfect Rescue Dog",
      description: `${totalDogs.toLocaleString()}+ dogs from verified rescue organizations across Europe.`,
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Find Rescue Dogs",
      description: `Browse ${totalDogs.toLocaleString()}+ rescue dogs from ${totalOrgs}+ European organizations.`,
    },
  };
}

export default async function Home(): Promise<React.JSX.Element> {
  // Fetch all data in parallel for optimal performance
  const fallbackHomePageData = {
    statistics: {
      total_dogs: 0,
      total_organizations: 0,
      countries: [],
      organizations: [],
    },
    recentDogs: [],
    diverseDogs: [],
  };

  const [homePageData, breedsWithImages, organizations, countryData, ageData] =
    await Promise.all([
      getHomePageData().catch((error) => {
        reportError(error, { context: "homepage_data_fetch", component: "Home" });
        return fallbackHomePageData;
      }),
      getBreedsWithImagesForHomePage({ minCount: 5, limit: 20 }).catch(
        (error) => {
          reportError(error, { context: "breeds_with_images_fetch", component: "Home" });
          return null;
        }
      ),
      getEnhancedOrganizationsSSR().catch((error) => {
        reportError(error, { context: "organizations_fetch", component: "Home" });
        return [];
      }),
      getCountryStats().catch((error) => {
        reportError(error, { context: "country_stats_fetch", component: "Home" });
        return { countries: [] };
      }),
      getAgeStats().catch((error) => {
        reportError(error, { context: "age_stats_fetch", component: "Home" });
        return { ageCategories: [] };
      }),
    ]);

  const { statistics, recentDogs } = homePageData;
  const countryStats = countryData?.countries || [];
  const ageStats = ageData?.ageCategories || [];

  const fallbackStats = {
    total_dogs: 0,
    total_organizations: 0,
    countries: [],
    organizations: [],
  };

  const heroStats = statistics ?? fallbackStats;
  const heroPreviewDogs = recentDogs?.slice(0, 3) ?? [];
  const firstDogImage = heroPreviewDogs[0]?.primary_image_url;

  return (
    <Layout>
      {firstDogImage && (
        <link rel="preload" as="image" href={firstDogImage} />
      )}
      <div className="hidden sm:block">
        <ErrorBoundary fallbackMessage="Unable to load hero section. Please refresh the page.">
          <HeroSection
            statistics={heroStats}
            previewDogs={heroPreviewDogs}
          />
        </ErrorBoundary>
      </div>
      <ClientHomePage
        initialStatistics={statistics}
        initialRecentDogs={recentDogs}
        initialBreedsWithImages={breedsWithImages}
        initialOrganizations={organizations as unknown as OrganizationCardData[]}
        initialCountryStats={countryStats}
        initialAgeStats={ageStats}
      />
    </Layout>
  );
}
