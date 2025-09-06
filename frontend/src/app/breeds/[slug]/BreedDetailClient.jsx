"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DogCardOptimized from "@/components/dogs/DogCardOptimized";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BreedPhotoGallery from "@/components/breeds/BreedPhotoGallery";
import { BreedInfo } from "@/components/breeds/BreedStatistics";
import EmptyState from "@/components/ui/EmptyState";
import { getBreedDogs, getBreedFilterCounts } from "@/services/serverAnimalsService";

export default function BreedDetailClient({
  initialBreedData,
  initialDogs,
  initialParams,
}) {
  const router = useRouter();
  const [breedData, setBreedData] = useState(initialBreedData);
  const [dogs, setDogs] = useState(initialDogs);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    age: initialParams?.age || "all",
    sex: initialParams?.sex || "all",
    size: initialParams?.size || "all",
    goodWithCats: initialParams?.goodWithCats === "true",
    goodWithDogs: initialParams?.goodWithDogs === "true",
  });
  const [filterCounts, setFilterCounts] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadFilterCounts = useCallback(async () => {
    try {
      const counts = await getBreedFilterCounts(breedData.breed_slug);
      setFilterCounts(counts);
    } catch (error) {
      console.error("Error loading filter counts:", error);
    }
  }, [breedData.breed_slug]);

  const loadDogs = useCallback(
    async (newOffset = 0, append = false) => {
      setLoading(true);
      try {
        const filters = {
          ...activeFilters,
          limit: 12,
          offset: newOffset,
        };

        if (activeFilters.age !== "all") filters.age = activeFilters.age;
        if (activeFilters.sex !== "all") filters.sex = activeFilters.sex;
        if (activeFilters.size !== "all") filters.size = activeFilters.size;
        if (activeFilters.goodWithCats) filters.good_with_cats = true;
        if (activeFilters.goodWithDogs) filters.good_with_dogs = true;

        const result = await getBreedDogs(breedData.breed_slug, filters);
        const newDogs = result?.results || result || [];

        if (append) {
          setDogs((prev) => [...prev, ...newDogs]);
        } else {
          setDogs(newDogs);
        }

        setHasMore(newDogs.length === 12);
        setOffset(newOffset);
      } catch (error) {
        console.error("Error loading dogs:", error);
      } finally {
        setLoading(false);
      }
    },
    [breedData.breed_slug, activeFilters],
  );

  useEffect(() => {
    loadFilterCounts();
  }, [loadFilterCounts]);

  useEffect(() => {
    loadDogs(0, false);

    const params = new URLSearchParams();
    if (activeFilters.age !== "all") params.set("age", activeFilters.age);
    if (activeFilters.sex !== "all") params.set("sex", activeFilters.sex);
    if (activeFilters.size !== "all") params.set("size", activeFilters.size);
    if (activeFilters.goodWithCats) params.set("goodWithCats", "true");
    if (activeFilters.goodWithDogs) params.set("goodWithDogs", "true");

    const queryString = params.toString();
    router.replace(
      `/breeds/${breedData.breed_slug}${queryString ? `?${queryString}` : ""}`,
      { scroll: false },
    );
  }, [activeFilters]);

  const handleFilterChange = (filterType, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleLoadMore = () => {
    const newOffset = offset + 12;
    loadDogs(newOffset, true);
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Breeds", href: "/breeds" },
    { label: breedData.primary_breed, href: `/breeds/${breedData.breed_slug}` },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid lg:grid-cols-2 gap-8 mb-12 mt-6">
          <BreedPhotoGallery
            dogs={breedData.topDogs}
            breedName={breedData.primary_breed}
            className="w-full"
          />

          <BreedInfo breedData={breedData} />
        </div>

        {breedData.personality_traits &&
          breedData.personality_traits.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">Personality Profile</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Common Traits</h3>
                  <div className="flex flex-wrap gap-2">
                    {breedData.personality_traits?.slice(0, 8).map((trait) => (
                      <Badge
                        key={trait}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                {breedData.experience_distribution && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Experience Level
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          First-time OK
                        </span>
                        <span className="font-semibold">
                          {breedData.experience_distribution.first_time_ok || 0}{" "}
                          dogs
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          Some Experience
                        </span>
                        <span className="font-semibold">
                          {breedData.experience_distribution.some_experience ||
                            0}{" "}
                          dogs
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          Experienced
                        </span>
                        <span className="font-semibold">
                          {breedData.experience_distribution.experienced || 0}{" "}
                          dogs
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        <div className="sticky top-16 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 -mx-4 sm:-mx-6 lg:-mx-8 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={activeFilters.age === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("age", "all")}
                className="flex-shrink-0"
              >
                All Ages ({breedData.count})
              </Button>
              <Button
                variant={activeFilters.age === "young" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("age", "young")}
                className="flex-shrink-0"
              >
                Young ({filterCounts?.age?.young || 0})
              </Button>
              <Button
                variant={activeFilters.age === "adult" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("age", "adult")}
                className="flex-shrink-0"
              >
                Adult ({filterCounts?.age?.adult || 0})
              </Button>
              <Button
                variant={activeFilters.age === "senior" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("age", "senior")}
                className="flex-shrink-0"
              >
                Senior ({filterCounts?.age?.senior || 0})
              </Button>

              <div className="border-l border-gray-300 dark:border-gray-600 mx-2" />

              <Button
                variant={activeFilters.sex === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("sex", "all")}
                className="flex-shrink-0"
              >
                Any Sex
              </Button>
              <Button
                variant={activeFilters.sex === "male" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("sex", "male")}
                className="flex-shrink-0"
              >
                Male ({filterCounts?.sex?.male || 0})
              </Button>
              <Button
                variant={activeFilters.sex === "female" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("sex", "female")}
                className="flex-shrink-0"
              >
                Female ({filterCounts?.sex?.female || 0})
              </Button>

              <div className="border-l border-gray-300 dark:border-gray-600 mx-2" />

              <Button
                variant={activeFilters.goodWithCats ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  handleFilterChange(
                    "goodWithCats",
                    !activeFilters.goodWithCats,
                  )
                }
                className="flex-shrink-0"
              >
                😺 Cat Friendly
              </Button>
              <Button
                variant={activeFilters.goodWithDogs ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  handleFilterChange(
                    "goodWithDogs",
                    !activeFilters.goodWithDogs,
                  )
                }
                className="flex-shrink-0"
              >
                🐕 Dog Friendly
              </Button>
            </div>
          </div>
        </div>

        <div id="dogs-grid">
          {loading && dogs.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg h-96 animate-pulse"
                />
              ))}
            </div>
          ) : dogs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dogs.map((dog) => (
                  <DogCardOptimized key={dog.id} dog={dog} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    size="lg"
                    variant="outline"
                  >
                    {loading ? "Loading..." : "Load More Dogs"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title={`No ${breedData.primary_breed} dogs found`}
              description="Try adjusting your filters to see more results"
              actionLabel="Clear Filters"
              onAction={() =>
                setActiveFilters({
                  age: "all",
                  sex: "all",
                  size: "all",
                  goodWithCats: false,
                  goodWithDogs: false,
                })
              }
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
