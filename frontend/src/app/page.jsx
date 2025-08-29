import { Suspense } from "react";
import Layout from "../components/layout/Layout";
import ClientHomePage from "../components/home/ClientHomePage";
import { getHomePageData } from "../services/serverAnimalsService";

// Enable Incremental Static Regeneration with 5-minute revalidation
export const revalidate = 300;

// Home page with server-side data fetching and ISR
export default async function Home() {
  // Fetch all data on the server for optimal performance with error handling
  let homePageData;

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

  const { statistics, recentDogs, diverseDogs } = homePageData;

  return (
    <Layout>
      <ClientHomePage
        initialStatistics={statistics}
        initialRecentDogs={recentDogs}
        initialDiverseDogs={diverseDogs}
      />
    </Layout>
  );
}
