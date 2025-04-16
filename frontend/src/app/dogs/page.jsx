// src/app/dogs/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';
import Loading from '../../components/ui/Loading';
import {
  getAnimals,
  getStandardizedBreeds,
  getBreedGroups,
  getLocationCountries,
  getAvailableCountries,
  getAvailableRegions,
} from '../../services/animalsService';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Filter, X } from 'lucide-react';
import FilterControls from '../../components/dogs/FilterControls';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Helper function to map UI size to standardized size
const mapUiSizeToStandardized = (uiSize) => {
  const mapping = {
    "Tiny": "Tiny",
    "Small": "Small",
    "Medium": "Medium",
    "Large": "Large",
    "Extra Large": "XLarge",
  };
  return mapping[uiSize] || null; // Return null if not found
};


export default function DogsPage() {
  // ... (Keep all state variables: filters, API state, options state, etc.) ...
  const [standardizedBreedFilter, setStandardizedBreedFilter] = useState("Any breed");
  const [breedGroupFilter, setBreedGroupFilter] = useState("Any group");
  const [sexFilter, setSexFilter] = useState("Any");
  const [sizeFilter, setSizeFilter] = useState("Any size");
  const [ageCategoryFilter, setAgeCategoryFilter] = useState("Any age");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationCountryFilter, setLocationCountryFilter] = useState("Any country");
  const [availableCountryFilter, setAvailableCountryFilter] = useState("Any country");
  const [availableRegionFilter, setAvailableRegionFilter] = useState("Any region");

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [standardizedBreeds, setStandardizedBreeds] = useState(["Any breed"]);
  const [breedGroups, setBreedGroups] = useState(["Any group"]);
  const [locationCountries, setLocationCountries] = useState(["Any country"]);
  const [availableCountries, setAvailableCountries] = useState(["Any country"]);
  const [availableRegions, setAvailableRegions] = useState(["Any region"]);

  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const sexOptions = ["Any", "Male", "Female"];
  const sizeOptions = ["Any size", "Tiny", "Small", "Medium", "Large", "Extra Large"];
  const ageOptions = ["Any age", "Puppy", "Young", "Adult", "Senior"];

  // ... (Keep all useEffect hooks for fetching options and data) ...
  // --- Fetch Breed Groups ---
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groups = await getBreedGroups();
        setBreedGroups(["Any group", ...groups]);
      } catch (err) {
        console.error("Failed to fetch breed groups:", err);
      }
    };
    fetchGroups();
  }, []);

  // --- Fetch Standardized Breeds (depends on breed group) ---
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        const breeds = await getStandardizedBreeds(breedGroupFilter === "Any group" ? null : breedGroupFilter);
        setStandardizedBreeds(["Any breed", ...breeds]);
      } catch (err) {
        console.error("Failed to fetch standardized breeds:", err);
        setStandardizedBreeds(["Any breed"]);
      }
    };
    fetchBreeds();
  }, [breedGroupFilter]);

  // --- Fetch Location Options ---
  useEffect(() => {
    const fetchLocationMeta = async () => {
      try {
        const [locCountries, availCountries] = await Promise.all([
          getLocationCountries(),
          getAvailableCountries()
        ]);
        setLocationCountries(["Any country", ...locCountries]);
        setAvailableCountries(["Any country", ...availCountries]);
      } catch (err) {
        console.error("Failed to fetch location metadata:", err);
      }
    };
    fetchLocationMeta();
  }, []);

  // --- Fetch Available Regions (depends on available country) ---
  useEffect(() => {
    const fetchRegions = async () => {
      if (availableCountryFilter && availableCountryFilter !== "Any country") {
        try {
          const regions = await getAvailableRegions(availableCountryFilter);
          setAvailableRegions(["Any region", ...regions]);
        } catch (err) {
          console.error(`Failed to fetch regions for ${availableCountryFilter}:`, err);
          setAvailableRegions(["Any region"]);
        }
      } else {
        setAvailableRegions(["Any region"]);
      }
      setAvailableRegionFilter("Any region");
    };
    fetchRegions();
  }, [availableCountryFilter]);

  // --- Main Data Fetching Logic ---
  const fetchDogs = useCallback(async (currentPage = 1, loadMore = false) => {
    if (!loadMore) {
      setLoading(true);
      setDogs([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    const limit = 20;
    const offset = (currentPage - 1) * limit;

    const params = {
      limit,
      offset,
      search: searchQuery || null,
      standardized_breed: standardizedBreedFilter === "Any breed" ? null : standardizedBreedFilter,
      breed_group: breedGroupFilter === "Any group" ? null : breedGroupFilter,
      sex: sexFilter === "Any" ? null : sexFilter,
      standardized_size: mapUiSizeToStandardized(sizeFilter),
      age_category: ageCategoryFilter === "Any age" ? null : ageCategoryFilter,
      location_country: locationCountryFilter === "Any country" ? null : locationCountryFilter,
      available_to_country: availableCountryFilter === "Any country" ? null : availableCountryFilter,
      available_to_region: availableRegionFilter === "Any region" ? null : availableRegionFilter,
    };

    const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null));

    try {
      const newDogs = await getAnimals(cleanParams);
      setDogs(prevDogs => loadMore ? [...prevDogs, ...newDogs] : newDogs);
      setHasMore(newDogs.length === limit);
      setPage(currentPage);
    } catch (err) {
      console.error("Error fetching dogs:", err);
      setError("Failed to load dogs. Please try again.");
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
      searchQuery, standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter,
      locationCountryFilter, availableCountryFilter, availableRegionFilter,
      resetTrigger
    ]);

  // --- Trigger Fetch on Filter/Search/Reset Change ---
  useEffect(() => {
    fetchDogs(1);
  }, [fetchDogs]);

  // --- Handle Load More ---
  const handleLoadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      fetchDogs(page + 1, true);
    }
  };

  // --- Calculate Active Filters ---
  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (standardizedBreedFilter !== "Any breed") count++;
    if (breedGroupFilter !== "Any group") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageCategoryFilter !== "Any age") count++;
    if (locationCountryFilter !== "Any country") count++;
    if (availableCountryFilter !== "Any country") count++;
    if (availableRegionFilter !== "Any region") count++;
    setActiveFilterCount(count);
  }, [
      searchQuery, standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter,
      locationCountryFilter, availableCountryFilter, availableRegionFilter
    ]);

  // --- Reset Filters ---
  const resetFilters = () => {
    setSearchQuery("");
    setStandardizedBreedFilter("Any breed");
    setBreedGroupFilter("Any group");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeCategoryFilter("Any age");
    setLocationCountryFilter("Any country");
    setAvailableCountryFilter("Any country");
    setPage(1);
    setHasMore(true);
    setResetTrigger(prev => prev + 1);
    setIsSheetOpen(false);
  };

  // --- Clear Individual Filter ---
  const clearFilter = (filterType) => {
    switch (filterType) {
      case 'search': setSearchQuery(""); break;
      case 'breed': setStandardizedBreedFilter("Any breed"); break;
      case 'group': setBreedGroupFilter("Any group"); break;
      case 'sex': setSexFilter("Any"); break;
      case 'size': setSizeFilter("Any size"); break;
      case 'age': setAgeCategoryFilter("Any age"); break;
      case 'location_country': setLocationCountryFilter("Any country"); break;
      case 'available_country': setAvailableCountryFilter("Any country"); break;
      case 'available_region': setAvailableRegionFilter("Any region"); break;
      default: break;
    }
    setPage(1);
    setHasMore(true);
    setResetTrigger(prev => prev + 1);
  };

  // --- Handle Search Input Change ---
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // --- Clear Search Input ---
  const clearSearch = () => {
    setSearchQuery("");
    setPage(1);
    setHasMore(true);
    setResetTrigger(prev => prev + 1);
  };

  // --- Render Active Filter Badges ---
  const renderActiveFilters = () => {
    const filters = [];
    if (searchQuery) filters.push({ type: 'search', label: `Search: "${searchQuery}"` });
    if (standardizedBreedFilter !== "Any breed") filters.push({ type: 'breed', label: standardizedBreedFilter });
    if (breedGroupFilter !== "Any group") filters.push({ type: 'group', label: `${breedGroupFilter} Group` });
    if (sexFilter !== "Any") filters.push({ type: 'sex', label: sexFilter });
    if (sizeFilter !== "Any size") filters.push({ type: 'size', label: sizeFilter });
    if (ageCategoryFilter !== "Any age") filters.push({ type: 'age', label: ageCategoryFilter });
    if (locationCountryFilter !== "Any country") filters.push({ type: 'location_country', label: `Located: ${locationCountryFilter}` });
    if (availableCountryFilter !== "Any country") filters.push({ type: 'available_country', label: `Ships To: ${availableCountryFilter}` });
    if (availableRegionFilter !== "Any region") filters.push({ type: 'available_region', label: `Region: ${availableRegionFilter}` });

    if (filters.length === 0) return null;

    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Active Filters:</span>
        {filters.map(filter => (
          <Badge key={filter.type} variant="secondary" className="flex items-center gap-1">
            {filter.label}
            <button onClick={() => clearFilter(filter.type)} className="ml-1 p-0.5 rounded-full hover:bg-gray-300">
              <X size={12} />
            </button>
          </Badge>
        ))}
        <Button variant="link" size="sm" onClick={resetFilters} className="text-blue-600 hover:text-blue-800 p-0 h-auto">
          Clear All
        </Button>
      </div>
    );
  };


  return (
    <Layout>
      {/* --- MODIFIED: Restore Outer Container --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Your New Best Friend</h1>

        {/* --- MODIFIED: Add Grid for Sidebar + Main Content --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* --- MODIFIED: Sidebar for Desktop Filters --- */}
          <aside className="hidden md:block md:col-span-1">
            <div className="sticky top-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Filters</h2>
              {/* Desktop Filter Controls */}
              <FilterControls
                searchQuery={searchQuery}
                handleSearchChange={handleSearchChange}
                clearSearch={clearSearch}
                breedGroupFilter={breedGroupFilter}
                setBreedGroupFilter={setBreedGroupFilter}
                breedGroups={breedGroups}
                standardizedBreedFilter={standardizedBreedFilter}
                setStandardizedBreedFilter={setStandardizedBreedFilter}
                standardizedBreeds={standardizedBreeds}
                sexFilter={sexFilter}
                setSexFilter={setSexFilter}
                sexOptions={sexOptions}
                sizeFilter={sizeFilter}
                setSizeFilter={setSizeFilter}
                sizeOptions={sizeOptions}
                ageCategoryFilter={ageCategoryFilter}
                setAgeCategoryFilter={setAgeCategoryFilter}
                ageOptions={ageOptions}
                locationCountryFilter={locationCountryFilter}
                setLocationCountryFilter={setLocationCountryFilter}
                locationCountries={locationCountries}
                availableCountryFilter={availableCountryFilter}
                setAvailableCountryFilter={setAvailableCountryFilter}
                availableCountries={availableCountries}
                availableRegionFilter={availableRegionFilter}
                setAvailableRegionFilter={setAvailableRegionFilter}
                availableRegions={availableRegions}
              />
              <Button variant="outline" className="w-full mt-6" onClick={resetFilters}>Clear All Filters</Button>
            </div>
          </aside>
          {/* --- END Sidebar --- */}


          {/* --- MODIFIED: Main Content Area --- */}
          <main className="md:col-span-3">

            {/* Filter Trigger for Mobile */}
            <div className="md:hidden mb-4">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    {/* Mobile Filter Controls */}
                    <FilterControls
                      searchQuery={searchQuery}
                      handleSearchChange={handleSearchChange}
                      clearSearch={clearSearch}
                      breedGroupFilter={breedGroupFilter}
                      setBreedGroupFilter={setBreedGroupFilter}
                      breedGroups={breedGroups}
                      standardizedBreedFilter={standardizedBreedFilter}
                      setStandardizedBreedFilter={setStandardizedBreedFilter}
                      standardizedBreeds={standardizedBreeds}
                      sexFilter={sexFilter}
                      setSexFilter={setSexFilter}
                      sexOptions={sexOptions}
                      sizeFilter={sizeFilter}
                      setSizeFilter={setSizeFilter}
                      sizeOptions={sizeOptions}
                      ageCategoryFilter={ageCategoryFilter}
                      setAgeCategoryFilter={setAgeCategoryFilter}
                      ageOptions={ageOptions}
                      locationCountryFilter={locationCountryFilter}
                      setLocationCountryFilter={setLocationCountryFilter}
                      locationCountries={locationCountries}
                      availableCountryFilter={availableCountryFilter}
                      setAvailableCountryFilter={setAvailableCountryFilter}
                      availableCountries={availableCountries}
                      availableRegionFilter={availableRegionFilter}
                      setAvailableRegionFilter={setAvailableRegionFilter}
                      availableRegions={availableRegions}
                    />
                    <SheetClose asChild>
                      <Button className="w-full mt-4">Apply Filters</Button>
                    </SheetClose>
                    <Button variant="outline" className="w-full mt-2" onClick={resetFilters}>Clear All Filters</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filter Badges */}
            {renderActiveFilters()}

            {/* Error Display */}
            {error && !loading && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error Loading Dogs</AlertTitle>
                <AlertDescription>
                  {error}
                  <Button variant="link" size="sm" onClick={() => fetchDogs(1)} className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading && <Loading />}

            {/* Dog Grid */}
            {!loading && dogs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"> {/* Adjusted grid for main area */}
                {dogs.map((dog) => (
                  <DogCard key={dog.id} dog={dog} />
                ))}
              </div>
            )}

            {/* No Results State */}
            {!loading && !error && dogs.length === 0 && (
              <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Dogs Found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search terms.</p>
                <Button variant="outline" onClick={resetFilters}>Clear All Filters</Button>
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && !loadingMore && (
              <div className="text-center mt-8 mb-12">
                <Button onClick={handleLoadMore} disabled={loadingMore}>
                  Load More Dogs
                </Button>
              </div>
            )}
            {loadingMore && <Loading />}

          </main>
          {/* --- END Main Content Area --- */}

        </div> {/* --- END Grid for Sidebar + Main Content --- */}
      </div> {/* --- END Outer Container --- */}
    </Layout>
  );
}