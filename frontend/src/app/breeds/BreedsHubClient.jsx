"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/EmptyState";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ChevronRight, Dog, Heart, Home } from "lucide-react";

export default function BreedsHubClient({ initialBreedStats }) {
  const breedStats = initialBreedStats;
  const router = useRouter();

  // Calculate pure breeds and crossbreeds from API data
  const pureBreedCount = useMemo(() => {
    // Check if API provides purebred_count directly
    if (breedStats?.purebred_count !== undefined) {
      return breedStats.purebred_count;
    }
    // Fallback: Sum all breeds except Mixed and Unknown
    const groups = breedStats?.breed_groups ?? [];
    return groups
      .filter((group) => group.name !== "Mixed" && group.name !== "Unknown")
      .reduce((sum, group) => sum + group.count, 0);
  }, [breedStats]);

  const crossbreedCount = useMemo(() => {
    // This would come from a specific API field if available
    // For now, estimate based on breed patterns
    return breedStats?.crossbreed_count ?? 0;
  }, [breedStats]);

  // Breed type cards configuration (3 cards as specified in PRD)
  const breedTypeCards = useMemo(
    () => [
      {
        title: "Mixed Breeds",
        count: (breedStats?.breed_groups || []).find(g => g.name === "Mixed")?.count ?? 0,
        href: "/breeds/mixed",
        icon: <Heart className="h-5 w-5" />,
        description: "Unique personalities from diverse backgrounds",
      },
      {
        title: "Pure Breeds",
        count: pureBreedCount,
        href: "/breeds?type=purebred",
        icon: <Dog className="h-5 w-5" />,
        description: "Known temperaments and characteristics",
      },
      {
        title: "Crossbreeds",
        count: crossbreedCount,
        href: "/breeds?type=crossbreed",
        icon: <Home className="h-5 w-5" />,
        description: "Best of both worlds combinations",
      },
    ],
    [breedStats, pureBreedCount, crossbreedCount],
  );

  // Breed group color styles - matching mockup design
  const breedGroupStyles = {
    'Hound': { 
      bg: 'bg-orange-50 hover:bg-orange-100', 
      border: 'border-2 border-orange-200', 
      text: 'text-orange-700',
      countColor: 'text-orange-600',
      icon: 'bg-orange-100' 
    },
    'Sporting': { 
      bg: 'bg-emerald-50 hover:bg-emerald-100', 
      border: 'border-2 border-emerald-200', 
      text: 'text-emerald-700',
      countColor: 'text-emerald-600',
      icon: 'bg-emerald-100' 
    },
    'Herding': { 
      bg: 'bg-purple-50 hover:bg-purple-100', 
      border: 'border-2 border-purple-200', 
      text: 'text-purple-700',
      countColor: 'text-purple-600',
      icon: 'bg-purple-100' 
    },
    'Working': { 
      bg: 'bg-blue-50 hover:bg-blue-100', 
      border: 'border-2 border-blue-200', 
      text: 'text-blue-700',
      countColor: 'text-blue-600',
      icon: 'bg-blue-100' 
    },
    'Terrier': { 
      bg: 'bg-red-50 hover:bg-red-100', 
      border: 'border-2 border-red-200', 
      text: 'text-red-700',
      countColor: 'text-red-600',
      icon: 'bg-red-100' 
    },
    'Non-Sporting': { 
      bg: 'bg-teal-50 hover:bg-teal-100', 
      border: 'border-2 border-teal-200', 
      text: 'text-teal-700',
      countColor: 'text-teal-600',
      icon: 'bg-teal-100' 
    },
    'Toy': { 
      bg: 'bg-pink-50 hover:bg-pink-100', 
      border: 'border-2 border-pink-200', 
      text: 'text-pink-700',
      countColor: 'text-pink-600',
      icon: 'bg-pink-100' 
    },
    'Mixed': { 
      bg: 'bg-violet-50 hover:bg-violet-100', 
      border: 'border-2 border-violet-200', 
      text: 'text-violet-700',
      countColor: 'text-violet-600',
      icon: 'bg-violet-100' 
    }
  };

  // Breed groups from API (7 groups from PRD, excluding "Unknown")
  const breedGroups = useMemo(
    () =>
      (breedStats?.breed_groups || [])
        .filter((group) => group.name !== "Unknown" && group.count > 0)
        .sort((a, b) => b.count - a.count) // Sort by count descending
        .slice(0, 8) // Take top 8 groups (including Mixed if present)
        .map((group) => ({
          name: group.name,
          count: group.count,
          href: `/dogs?breed_group=${encodeURIComponent(group.name)}`,
          styles: breedGroupStyles[group.name] || {
            bg: 'bg-gray-50 hover:bg-gray-100',
            border: 'border-2 border-gray-200',
            text: 'text-gray-700',
            countColor: 'text-gray-600',
            icon: 'bg-gray-100'
          }
        })),
    [breedStats],
  );

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Breeds", href: "/breeds" },
  ];

  if (!breedStats || breedStats.error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Unable to load breed data"
            description="We're having trouble loading breed information. Please try again later."
            actionLabel="Go to Homepage"
            onAction={() => router.push("/")}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          {/* Hero Section */}
          <div className="text-center mb-12 mt-8">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              Discover Dogs by Breed
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              {breedStats?.total_dogs ?? 0} rescue dogs across{" "}
              {breedStats?.unique_breeds ?? 0} breeds
            </p>
            <p className="text-lg text-muted-foreground">
              {breedStats?.qualifying_breeds?.length ?? 0} breeds with dedicated
              pages
            </p>
          </div>

          {/* Filter Chips Row */}
          <div className="flex justify-center gap-3 mb-10">
            <Link href="/breeds/mixed">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 px-4 py-2 text-sm"
              >
                Mixed Breeds
              </Badge>
            </Link>
            <Link href="/breeds?type=purebred">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 px-4 py-2 text-sm"
              >
                Pure Breeds
              </Badge>
            </Link>
            <Link href="/breeds?type=crossbreed">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 px-4 py-2 text-sm"
              >
                Crossbreeds
              </Badge>
            </Link>
          </div>

          {/* Breed Type Cards Section */}
          <section className="mb-16" aria-labelledby="breed-types-heading">
            <h2
              id="breed-types-heading"
              className="text-2xl font-semibold mb-6 text-center"
            >
              Browse by Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {breedTypeCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  aria-label={`View ${card.title.toLowerCase()}: ${card.count} dogs available`}
                >
                  <Card className="p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer h-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="p-2 bg-primary/10 rounded-lg"
                        aria-hidden="true"
                      >
                        {card.icon}
                      </div>
                      <ChevronRight
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                    <p className="text-3xl font-bold text-primary mb-2">
                      {card.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {card.description}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Popular Individual Breeds Section */}
          {breedStats?.qualifying_breeds && breedStats.qualifying_breeds.length > 0 && (
            <section className="mb-16" aria-labelledby="popular-breeds-heading">
              <h2
                id="popular-breeds-heading"
                className="text-2xl font-semibold mb-6 text-center"
              >
                Popular Breeds
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {breedStats.qualifying_breeds
                  .slice(0, 12)
                  .map((breed) => (
                    <Link
                      key={breed.slug}
                      href={`/breeds/${breed.slug}`}
                      className="group"
                    >
                      <Card className="p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer h-full">
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary">
                          {breed.primary_breed}
                        </h3>
                        <p className="text-2xl font-bold text-primary">
                          {breed.count}
                        </p>
                        <p className="text-xs text-muted-foreground">available</p>
                      </Card>
                    </Link>
                  ))}
              </div>
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dogs")}
                >
                  Browse All Breeds
                </Button>
              </div>
            </section>
          )}

          {/* Breed Groups Grid */}
          <section aria-labelledby="breed-groups-heading">
            <h2
              id="breed-groups-heading"
              className="text-2xl font-semibold mb-6 text-center"
            >
              Popular Breed Groups
            </h2>
            {breedGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {breedGroups.map((group) => (
                  <Link
                    key={group.name}
                    href={group.href}
                    aria-label={`View ${group.name} dogs: ${group.count} available`}
                  >
                    <div className={`p-6 rounded-lg ${group.styles.bg} ${group.styles.border} shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer h-full focus-within:ring-2 focus-within:ring-offset-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold mb-1 ${group.styles.text}`}>
                            {group.name}
                          </h3>
                          <p className={`text-3xl font-bold ${group.styles.countColor}`}>
                            {group.count.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            rescue dogs available
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 ${group.styles.text} opacity-60`}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No breed groups available"
                description="Breed group data is currently unavailable. Please check back later."
              />
            )}
          </section>

          {/* Call to Action Section */}
          <div className="mt-16 text-center">
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-primary/10">
              <h3 className="text-2xl font-semibold mb-4">
                Can't find your perfect match?
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Browse all available rescue dogs or use our advanced filters
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={() => router.push("/dogs")}>
                  Browse All Dogs
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/dogs?filters=advanced")}
                >
                  Advanced Search
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
