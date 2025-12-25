import { Suspense } from "react";
import Layout from "../components/layout/Layout";
import ClientHomePage from "../components/home/ClientHomePage";
import { getHomePageData, getCountryStats } from "../services/serverAnimalsService";
import { getBreedsWithImagesForHomePage } from "../services/breedImagesService";
import { getEnhancedOrganizationsSSR } from "../services/organizationsService";

// Enable Incremental Static Regeneration with 5-minute revalidation
export const revalidate = 300;

// Generate metadata for SEO with dynamic stats
export async function generateMetadata() {
  let stats = { total_dogs: 4500, total_organizations: 13 };
  try {
    const data = await getHomePageData();
    stats = data.statistics || stats;
  } catch (e) {
    // Use fallback stats
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

// Home page with server-side data fetching and ISR
export default async function Home() {
  // Fetch all data on the server for optimal performance with error handling
  let homePageData;
  let breedsWithImages = null;
  let organizations = [];
  let countryStats = [];

  try {
    homePageData = await getHomePageData();
  } catch (error) {
    console.error("Failed to fetch home page data:", error);
    // Provide fallback data to prevent page crash
    homePageData = {
      statistics: {
        total_dogs: 0,
        total_organizations: 0,
        total_countries: 0,
      },
      recentDogs: [],
      diverseDogs: [],
    };
  }

  // Fetch breeds with images for homepage (server-side)
  try {
    breedsWithImages = await getBreedsWithImagesForHomePage({
      minCount: 5,
      limit: 20,
    });
  } catch (error) {
    console.error("Failed to fetch breeds with images:", error);
    // Will be null, client can handle gracefully
  }

  // Fetch organizations for TrustBand (server-side)
  try {
    organizations = await getEnhancedOrganizationsSSR();
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    // Will be empty array, client can handle gracefully
  }

  // Fetch country stats for CountryBrowseSection (server-side)
  try {
    const countryData = await getCountryStats();
    countryStats = countryData?.countries || [];
  } catch (error) {
    console.error("Failed to fetch country stats:", error);
    // Will be empty array, client can handle gracefully
  }

  const { statistics, recentDogs, diverseDogs } = homePageData;

  return (
    <Layout>
      <ClientHomePage
        initialStatistics={statistics}
        initialRecentDogs={recentDogs}
        initialDiverseDogs={diverseDogs}
        initialBreedsWithImages={breedsWithImages}
        initialOrganizations={organizations}
        initialCountryStats={countryStats}
      />
    </Layout>
  );
}