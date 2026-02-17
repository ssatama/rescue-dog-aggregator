import type { Metadata } from "next";
import { Suspense } from "react";
import type { CountriesHubStats } from "@/types/pageComponents";
import CountriesHubClient from "./CountriesHubClient";
import CountryStructuredData from "@/components/countries/CountryStructuredData";
import { getCountryStats } from "@/services/serverAnimalsService";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getCountryStats();
  const totalDogs = stats?.total || 4600;
  const countryCount = stats?.countries?.length || 8;

  return {
    title: `Rescue Dogs by Country | ${totalDogs.toLocaleString()} Dogs Across ${countryCount} Countries`,
    description: `Find rescue dogs by location. Browse ${totalDogs.toLocaleString()} dogs from ${countryCount} European countries. Filter by UK, Germany, Italy, Turkey, and more.`,
    keywords:
      "rescue dogs by country, European rescue dogs, dogs from abroad, international dog adoption, rescue dogs UK, rescue dogs Germany",
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/country",
    },
    openGraph: {
      title: "Rescue Dogs by Country",
      description: `Browse ${totalDogs.toLocaleString()} rescue dogs from ${countryCount} European countries`,
      type: "website",
      images: ["/og-image.png"],
    },
  };
}

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function CountriesPage(): Promise<React.JSX.Element> {
  const countryStats = await getCountryStats() as unknown as CountriesHubStats;

  return (
    <>
      <CountryStructuredData
        stats={countryStats}
        pageType="index"
      />
      <Suspense fallback={<LoadingFallback />}>
        <CountriesHubClient initialStats={countryStats} />
      </Suspense>
    </>
  );
}
