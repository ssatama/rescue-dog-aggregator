import { formatCount } from "@/utils/formatCount";
import { clampDescription } from "@/utils/seoMeta";
import type { Metadata } from "next";
import CountriesHubClient from "./CountriesHubClient";
import Layout from "@/components/layout/Layout";
import CountryStructuredData from "@/components/countries/CountryStructuredData";
import { getCountryStats, getListCounts } from "@/services/serverAnimalsService";
import { getCountryPageStats } from "@/utils/countryData";

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const stats = getCountryPageStats(await getCountryStats());
  const totalDogs = stats?.total || 4600;
  const countryCount = stats?.countries?.length || 8;

  return {
    title: `Rescue Dogs by Country | ${formatCount(totalDogs)} Dogs Across ${countryCount} Countries`,
    description: clampDescription(`Find rescue dogs by where they are now. Browse ${formatCount(totalDogs)} dogs in ${countryCount} European countries. Pick a country to see its dogs.`),
    keywords:
      "rescue dogs by country, European rescue dogs, dogs from abroad, international dog adoption, rescue dogs UK, rescue dogs Germany",
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/country",
    },
    openGraph: {
      title: "Rescue Dogs by Country",
      description: `Browse ${formatCount(totalDogs)} rescue dogs in ${countryCount} European countries`,
      type: "website",
      images: ["/og-image.png"],
    },
  };
}

export default async function CountriesPage(): Promise<React.JSX.Element> {
  const [allStats, allCounts] = await Promise.all([getCountryStats(), getListCounts({})]);
  // Only countries with a page: enough dogs, and a known country for each (#702)
  const countryStats = getCountryPageStats(allStats);

  return (
    <Layout>
      <CountryStructuredData
        stats={countryStats}
        pageType="index"
      />
      <CountriesHubClient
        initialStats={countryStats}
        adoptableOptions={allCounts?.available_country_options}
      />
    </Layout>
  );
}
