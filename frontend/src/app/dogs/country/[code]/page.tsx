import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import CountryDogsClient from "./CountryDogsClient";
import CountryStructuredData from "@/components/countries/CountryStructuredData";
import {
  getAnimals,
  getAllMetadata,
  getCountryStats,
} from "@/services/serverAnimalsService";
import {
  getCountryByCode,
  getAllCountryCodes,
  COUNTRIES,
} from "@/utils/countryData";
import DogCardSkeletonOptimized from "@/components/ui/DogCardSkeletonOptimized";

export const revalidate = 300;

interface CountryPageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams(): Promise<Array<{ code: string }>> {
  return getAllCountryCodes().map((code) => ({
    code: code.toLowerCase(),
  }));
}

export async function generateMetadata(props: CountryPageProps): Promise<Metadata> {
  const params = await props.params;
  const country = getCountryByCode(params.code);

  if (!country) {
    return { title: "Country Not Found" };
  }

  const countryStats = await getCountryStats();
  const count =
    countryStats?.countries?.find((c: { code: string }) => c.code === country.code)?.count || 0;

  return {
    title: `${count.toLocaleString()} Rescue Dogs in ${country.name} | Adopt from ${country.shortName}`,
    description: `Browse ${count.toLocaleString()} rescue dogs currently in ${country.name}. ${country.description} View photos, profiles, and apply through verified rescue organizations.`,
    keywords: `rescue dogs ${country.name}, ${country.name} dog adoption, dogs from ${country.name}, adopt dog ${country.shortName}, ${country.name} rescue organizations`,
    alternates: {
      canonical: `https://www.rescuedogs.me/dogs/country/${params.code.toLowerCase()}`,
    },
    openGraph: {
      title: `Rescue Dogs Available in ${country.name}`,
      description: `Find your perfect rescue dog from ${country.name}. ${count.toLocaleString()} dogs currently available for adoption.`,
      type: "website",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${count} Rescue Dogs in ${country.name}`,
      description: `Browse rescue dogs from ${country.name}`,
    },
  };
}

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <DogCardSkeletonOptimized key={i} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}

export default async function CountryDogsPage(props: CountryPageProps): Promise<React.JSX.Element> {
  const params = await props.params;
  const country = getCountryByCode(params.code);

  if (!country) {
    notFound();
  }

  const [initialDogs, metadata, countryStats] = await Promise.all([
    getAnimals({
      location_country: country.code,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
    getCountryStats(),
  ]);

  const countryCount =
    countryStats?.countries?.find((c: { code: string }) => c.code === country.code)?.count || 0;

  return (
    <>
      <CountryStructuredData
        country={country}
        dogCount={countryCount}
        pageType="country"
      />
      <Suspense fallback={<LoadingFallback />}>
        <CountryDogsClient
          country={country}
          initialDogs={initialDogs}
          metadata={metadata}
          allCountries={COUNTRIES}
          totalCount={countryCount}
        />
      </Suspense>
    </>
  );
}
