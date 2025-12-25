import { Suspense } from "react";
import { notFound } from "next/navigation";
import CountryDogsClient from "./CountryDogsClient";
import CountryStructuredData from "@/components/countries/CountryStructuredData";
import { getAnimals, getAllMetadata } from "@/services/serverAnimalsService";
import {
  getCountryByCode,
  getAllCountryCodes,
  COUNTRIES,
} from "@/utils/countryData";
import DogCardSkeletonOptimized from "@/components/ui/DogCardSkeletonOptimized";

export const revalidate = 300;

export async function generateStaticParams() {
  return getAllCountryCodes().map((code) => ({
    code: code.toLowerCase(),
  }));
}

export async function generateMetadata(props) {
  const params = await props.params;
  const country = getCountryByCode(params.code);

  if (!country) {
    return { title: "Country Not Found" };
  }

  const response = await getAnimals({
    location_country: country.code,
    limit: 1,
  });
  const count = response?.total || 0;

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

function LoadingFallback() {
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

export default async function CountryDogsPage(props) {
  const params = await props.params;
  const country = getCountryByCode(params.code);

  if (!country) {
    notFound();
  }

  const [initialDogs, metadata] = await Promise.all([
    getAnimals({
      location_country: country.code,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
  ]);

  const featuredDogs = initialDogs?.results?.slice(0, 4) || [];

  return (
    <>
      <CountryStructuredData
        country={country}
        dogCount={initialDogs?.total || 0}
        pageType="detail"
      />
      <Suspense fallback={<LoadingFallback />}>
        <CountryDogsClient
          country={country}
          initialDogs={initialDogs}
          featuredDogs={featuredDogs}
          metadata={metadata}
          allCountries={COUNTRIES}
        />
      </Suspense>
    </>
  );
}
