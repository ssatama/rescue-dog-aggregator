"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DogCard from "@/components/dogs/DogCard";
import DogCardSkeletonOptimized from "@/components/dogs/DogCardSkeletonOptimized";
import EmptyState from "@/components/ui/EmptyState";
import FilterChip from "@/components/ui/FilterChip";
import { ChevronRight, Heart, Sparkles, Users, Home } from "lucide-react";
import { getAnimals } from "@/services/animalsService";

const ITEMS_PER_PAGE = 12;

export default function MixedBreedsClient({ 
  breedData, 
  initialDogs, 
  popularMixes,
  breedStats,
  initialParams 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [dogs, setDogs] = useState(initialDogs);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [offset, setOffset] = useState(ITEMS_PER_PAGE);
  const [filters, setFilters] = useState({
    size: initialParams.size || "",
    age: initialParams.age || "",
    sex: initialParams.sex || "",
    good_with_kids: initialParams.good_with_kids === "true",
    good_with_dogs: initialParams.good_with_dogs === "true",
    good_with_cats: initialParams.good_with_cats === "true",
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Breeds", href: "/breeds" },
    { label: "Mixed Breeds", href: "/breeds/mixed" },
  ];

  // Size categories for mixed breeds
  const sizeCategories = [
    { value: "small", label: "Small", description: "Under 25 lbs" },
    { value: "medium", label: "Medium", description: "25-60 lbs" },
    { value: "large", label: "Large", description: "Over 60 lbs" },
  ];

  // Build API parameters
  const buildAPIParams = useCallback((currentFilters = filters) => {
    const params = {
      breed_type: "mixed",
      limit: ITEMS_PER_PAGE,
      offset: 0,
    };

    if (currentFilters.size) params.size = currentFilters.size;
    if (currentFilters.age) params.age = currentFilters.age;
    if (currentFilters.sex) params.sex = currentFilters.sex;
    if (currentFilters.good_with_kids) params.good_with_kids = true;
    if (currentFilters.good_with_dogs) params.good_with_dogs = true;
    if (currentFilters.good_with_cats) params.good_with_cats = true;

    return params;
  }, [filters]);

  // Update URL with filters
  const updateURL = useCallback((newFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.size) params.set("size", newFilters.size);
    if (newFilters.age) params.set("age", newFilters.age);
    if (newFilters.sex) params.set("sex", newFilters.sex);
    if (newFilters.good_with_kids) params.set("good_with_kids", "true");
    if (newFilters.good_with_dogs) params.set("good_with_dogs", "true");
    if (newFilters.good_with_cats) params.set("good_with_cats", "true");

    const queryString = params.toString();
    const newURL = queryString ? `/breeds/mixed?${queryString}` : "/breeds/mixed";
    
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [router]);

  // Handle filter changes
  const handleFilterChange = useCallback(async (filterType, value) => {
    const newFilters = { ...filters };
    
    if (filterType === "size" || filterType === "age" || filterType === "sex") {
      newFilters[filterType] = newFilters[filterType] === value ? "" : value;
    } else {
      newFilters[filterType] = !newFilters[filterType];
    }

    setFilters(newFilters);
    updateURL(newFilters);
    setOffset(ITEMS_PER_PAGE);

    // Fetch new data
    setIsLoading(true);
    try {
      const params = buildAPIParams(newFilters);
      params.offset = 0; // Reset offset for new filter
      
      const response = await getAnimals(params);
      const dogsData = Array.isArray(response) ? response : (response?.results || []);
      setDogs(dogsData);
      setHasMore(dogsData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching filtered dogs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, updateURL]);

  // Load more dogs
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const params = buildAPIParams();
      params.offset = offset;
      
      const response = await getAnimals(params);
      const newDogs = Array.isArray(response) ? response : (response?.results || []);
      
      setDogs(prev => [...prev, ...newDogs]);
      setOffset(prev => prev + ITEMS_PER_PAGE);
      setHasMore(newDogs.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more dogs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, offset, buildAPIParams]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.size) count++;
    if (filters.age) count++;
    if (filters.sex) count++;
    if (filters.good_with_kids) count++;
    if (filters.good_with_dogs) count++;
    if (filters.good_with_cats) count++;
    return count;
  }, [filters]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          {/* Hero Section - Emphasizing Uniqueness */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-8 mb-8 mt-4">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-violet-100 rounded-full">
                  <Sparkles className="h-12 w-12 text-violet-600" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                Every Mixed Breed is Unique
              </h1>
              <p className="text-xl text-gray-700 mb-2">
                {breedData.count} one-of-a-kind rescue dogs waiting for homes
              </p>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Mixed breeds combine the best traits from multiple breeds, creating dogs with 
                diverse personalities, unique looks, and often fewer health issues. Each one 
                has their own special story and character.
              </p>
            </div>
          </div>

          {/* Size Filter Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">Filter by Size</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {sizeCategories.map((size) => (
                <button
                  key={size.value}
                  onClick={() => handleFilterChange("size", size.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    filters.size === size.value
                      ? "bg-violet-50 border-violet-300"
                      : "bg-white border-gray-200 hover:border-violet-200"
                  }`}
                >
                  <h3 className="font-semibold text-lg">{size.label}</h3>
                  <p className="text-sm text-gray-600">{size.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Specific Mixes */}
          {popularMixes && popularMixes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center">
                Popular Mixed Breeds
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {popularMixes.map((mix) => (
                  <Link
                    key={mix.slug}
                    href={`/breeds/${mix.slug}`}
                    className="text-center p-3 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all"
                  >
                    <p className="font-semibold text-sm">{mix.name}</p>
                    <p className="text-2xl font-bold text-violet-600">{mix.count}</p>
                    <p className="text-xs text-gray-500">available</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 sticky top-0 z-10">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
              
              <FilterChip
                label="Young"
                active={filters.age === "young"}
                onClick={() => handleFilterChange("age", "young")}
              />
              <FilterChip
                label="Adult"
                active={filters.age === "adult"}
                onClick={() => handleFilterChange("age", "adult")}
              />
              <FilterChip
                label="Senior"
                active={filters.age === "senior"}
                onClick={() => handleFilterChange("age", "senior")}
              />
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              <FilterChip
                label="Male"
                active={filters.sex === "male"}
                onClick={() => handleFilterChange("sex", "male")}
              />
              <FilterChip
                label="Female"
                active={filters.sex === "female"}
                onClick={() => handleFilterChange("sex", "female")}
              />
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              <FilterChip
                label="Good with Kids"
                active={filters.good_with_kids}
                onClick={() => handleFilterChange("good_with_kids")}
              />
              <FilterChip
                label="Good with Dogs"
                active={filters.good_with_dogs}
                onClick={() => handleFilterChange("good_with_dogs")}
              />
              <FilterChip
                label="Good with Cats"
                active={filters.good_with_cats}
                onClick={() => handleFilterChange("good_with_cats")}
              />

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      size: "",
                      age: "",
                      sex: "",
                      good_with_kids: false,
                      good_with_dogs: false,
                      good_with_cats: false,
                    });
                    router.push("/breeds/mixed");
                  }}
                  className="ml-auto text-sm"
                >
                  Clear all ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>

          {/* Dogs Grid */}
          <div className="mb-8">
            {isLoading && dogs.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <DogCardSkeletonOptimized key={i} />
                ))}
              </div>
            ) : dogs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {dogs.map((dog) => (
                    <DogCard key={dog.id} dog={dog} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={loadMore}
                      disabled={isLoading}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {isLoading ? "Loading..." : `Load More Mixed Breeds`}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No mixed breed dogs found"
                description="Try adjusting your filters to see more results"
                actionLabel="Clear Filters"
                onAction={() => {
                  setFilters({
                    size: "",
                    age: "",
                    sex: "",
                    good_with_kids: false,
                    good_with_dogs: false,
                    good_with_cats: false,
                  });
                  router.push("/breeds/mixed");
                }}
              />
            )}
          </div>

          {/* Why Choose Mixed Breeds Section */}
          <Card className="p-8 bg-gradient-to-r from-violet-50 to-purple-50">
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Why Choose a Mixed Breed?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="p-3 bg-white rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-violet-600" />
                </div>
                <h4 className="font-semibold mb-2">Unique Personalities</h4>
                <p className="text-sm text-gray-600">
                  Every mixed breed has a one-of-a-kind personality shaped by their diverse heritage
                </p>
              </div>
              <div>
                <div className="p-3 bg-white rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <h4 className="font-semibold mb-2">Healthier Genetics</h4>
                <p className="text-sm text-gray-600">
                  Mixed breeds often have fewer breed-specific health issues due to genetic diversity
                </p>
              </div>
              <div>
                <div className="p-3 bg-white rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Home className="h-6 w-6 text-violet-600" />
                </div>
                <h4 className="font-semibold mb-2">Perfect Companions</h4>
                <p className="text-sm text-gray-600">
                  With such variety, you're sure to find a mixed breed that fits your lifestyle perfectly
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}