import { FILTER_DEFAULTS } from "@/constants/filters";
import { formatCount } from "@/utils/formatCount";
import { clampDescription } from "@/utils/seoMeta";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import CountryDogsClient from "./CountryDogsClient";
import Layout from "@/components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import CountryStructuredData from "@/components/countries/CountryStructuredData";
import {
  getAnimals,
  getAllMetadata,
  getCountryStats,
} from "@/services/serverAnimalsService";
import {
  getCountryByCode,
  getAllCountryCodes,
  getCountriesWithDogs,
  COUNTRIES,
} from "@/utils/countryData";

export const revalidate = 86400;

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
    title: `${formatCount(count)} Rescue Dogs in ${country.name} | Adopt from ${country.shortName}`,
    description: clampDescription(`Browse ${formatCount(count)} rescue dogs currently in ${country.name}. ${country.description} View photos, profiles, and apply through verified rescue organizations.`),
    keywords: `rescue dogs ${country.name}, ${country.name} dog adoption, dogs from ${country.name}, adopt dog ${country.shortName}, ${country.name} rescue organizations`,
    alternates: {
      canonical: `https://www.rescuedogs.me/dogs/country/${params.code.toLowerCase()}`,
    },
    openGraph: {
      title: `Rescue Dogs Available in ${country.name}`,
      description: `Find your perfect rescue dog from ${country.name}. ${formatCount(count)} dogs currently available for adoption.`,
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


export default async function CountryDogsPage(props: CountryPageProps): Promise<React.JSX.Element> {
  const params = await props.params;
  const country = getCountryByCode(params.code);

  if (!country) {
    notFound();
  }

  const [initialDogs, metadata, countryStats] = await Promise.all([
    getAnimals({
      location_country: country.code,
      sort: FILTER_DEFAULTS.SORT,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
    getCountryStats(),
  ]);

  const countryCount =
    countryStats?.countries?.find((c: { code: string }) => c.code === country.code)?.count || 0;

  // A country with no dogs has no page; it returns once a rescue there comes back and the
  // stats and this page revalidate (up to about a day) (#442). Only trust a zero when the stats loaded: on an API failure getCountryStats
  // returns no countries, and caching a 404 for a country that has dogs would be worse.
  if (countryStats?.countries?.length && countryCount === 0 && initialDogs.length === 0) {
    notFound();
  }

  // The page's own country always stays in its chip bar, even while stats lag its dogs
  const countriesWithDogs = getCountriesWithDogs(countryStats);
  const chipCountries = countriesWithDogs.length
    ? { ...Object.fromEntries(countriesWithDogs.map((c) => [c.code, c])), [country.code]: country }
    : COUNTRIES;

  return (
    <Layout>
      <CountryStructuredData
        country={country}
        dogCount={countryCount}
        pageType="country"
      />
      <Suspense fallback={<ServerDogListing title={`Rescue Dogs in ${country.name}`} intro={country.description} dogs={initialDogs} />}>
        <CountryDogsClient
          country={country}
          initialDogs={initialDogs}
          metadata={metadata}
          allCountries={chipCountries}
          totalCount={countryCount}
        />
      </Suspense>
    </Layout>
  );
}
