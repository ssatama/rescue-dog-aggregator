"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapPin, Dog, Building2, ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CountriesHubClientProps, CountryData } from "@/types/pageComponents";
import { COUNTRIES, getAllCountryCodes } from "@/utils/countryData";

function CountryCard({ country }: { country: CountryData & { count: number; organizations?: number } }) {
  return (
    <Link href={`/dogs/country/${country.code.toLowerCase()}`}>
      <Card className="group relative overflow-hidden h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-300 dark:hover:border-orange-600">
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${country.gradient}`}
        />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{country.flag}</span>
            <div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-orange-600 transition-colors">
                {country.shortName}
              </h3>
              <p className="text-sm text-muted-foreground">{country.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Dog className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">
                {country.count?.toLocaleString() || 0}
              </span>
              <span className="text-muted-foreground">dogs</span>
            </div>
            {(country.organizations ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{country.organizations}</span>
                <span className="text-muted-foreground">orgs</span>
              </div>
            )}
          </div>

          <div className="flex items-center text-orange-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View dogs
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function CountriesHubClient({ initialStats }: CountriesHubClientProps) {
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Countries" },
  ];

  const countriesWithStats = useMemo(() => {
    return getAllCountryCodes()
      .map((code) => {
        const country = COUNTRIES[code as keyof typeof COUNTRIES];
        const stats = initialStats?.countries?.find((c) => c.code === code) || {
          count: 0,
          organizations: 0,
        };
        return { ...country, ...stats };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [initialStats]);

  const totalDogs = initialStats?.total || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-700 dark:to-amber-700 text-white py-12 md:py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        </div>

        <div className="absolute top-8 right-8 opacity-20">
          <MapPin className="h-24 w-24 text-white" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              Rescue Dogs by Country
            </h1>
            <p className="text-lg md:text-xl opacity-95 max-w-2xl mx-auto mb-8">
              {totalDogs.toLocaleString()} dogs waiting across{" "}
              {countriesWithStats.length} countries. Find your perfect match by
              location.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {countriesWithStats.slice(0, 4).map((country) => (
              <Link
                key={country.code}
                href={`/dogs/country/${country.code.toLowerCase()}`}
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 hover:bg-white/30 transition-colors cursor-pointer">
                  <span className="text-2xl mr-2">{country.flag}</span>
                  <span className="font-semibold">
                    {country.count.toLocaleString()}
                  </span>
                  <span className="text-sm opacity-90 ml-1">dogs</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {countriesWithStats.map((country, index) => (
              <div
                key={country.code}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CountryCard country={country} />
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Card className="p-8 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
              <h3 className="text-2xl font-semibold mb-3 dark:text-gray-100">
                Can&apos;t decide on a country?
              </h3>
              <p className="text-muted-foreground mb-6">
                Browse all available dogs with advanced filters
              </p>
              <Link href="/dogs">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Browse All Dogs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
