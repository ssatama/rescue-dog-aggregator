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
import BreedsHeroSection from "@/components/breeds/BreedsHeroSection";
import PopularBreedsSection from "@/components/breeds/PopularBreedsSection";
import BreedGroupsSection from "@/components/breeds/BreedGroupsSection";
import { ChevronRight, Dog, Heart, Home } from "lucide-react";

export default function BreedsHubClient({ initialBreedStats, mixedBreedData, popularBreedsWithImages, breedGroups }) {
  const breedStats = initialBreedStats;
  const router = useRouter();

  // Breadcrumb items
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Breeds" }
  ];

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
        count: breedStats?.purebred_count ?? 0,
        href: "/breeds?type=purebred",
        icon: <Dog className="h-5 w-5" />,
        description: "Known temperaments and characteristics",
      },
      {
        title: "Crossbreeds",
        count: breedStats?.crossbreed_count ?? 0,
        href: "/breeds?type=crossbreed",
        icon: <Home className="h-5 w-5" />,
        description: "Best of both worlds combinations",
      },
    ],
    [breedStats],
  );

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
      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Hero Section with Mixed Breed Dogs */}
      {mixedBreedData && (
        <BreedsHeroSection 
          mixedBreedData={mixedBreedData} 
          totalDogs={breedStats?.total_dogs || 0} 
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Popular Individual Breeds Section with Images */}
          {popularBreedsWithImages && popularBreedsWithImages.length > 0 && (
            <PopularBreedsSection popularBreeds={popularBreedsWithImages} />
          )}

          {/* Expandable Breed Groups with Top Breeds */}
          {breedGroups && breedGroups.length > 0 && (
            <BreedGroupsSection breedGroups={breedGroups} />
          )}

          {/* Call to Action Section */}
          <div className="mt-16 text-center">
            <Card className="p-8 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-950/30">
              <h3 className="text-2xl font-semibold mb-4 dark:text-gray-100">
                Can't find your perfect match?
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Browse all available rescue dogs or use our advanced filters
              </p>
              <Button 
                size="lg" 
                onClick={() => router.push("/dogs")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Browse All Dogs
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
