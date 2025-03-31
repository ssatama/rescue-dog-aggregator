// src/app/dogs/page.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';
import Loading from '../../components/ui/Loading';
import { 
  getDogs, 
  getStandardizedBreeds, 
  getDogsByStandardizedBreed 
} from '../../services/dogsService';

export default function DogsPage() {
  // State for filters
  const [standardizedBreedFilter, setStandardizedBreedFilter] = useState("Any breed");
  const [breedGroupFilter, setBreedGroupFilter] = useState("Any group");
  const [sexFilter, setSexFilter] = useState("Any");
  const [sizeFilter, setSizeFilter] = useState("Any size");
  const [ageCategoryFilter, setAgeCategoryFilter] = useState("Any age");
  const [searchQuery, setSearchQuery] = useState("");
  
  // API related state
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [standardizedBreeds, setStandardizedBreeds] = useState(["Any breed"]);
  const [breedGroups, setBreedGroups] = useState([
    "Any group", "Sporting", "Hound", "Working", "Terrier", 
    "Toy", "Non-Sporting", "Herding", "Mixed", "Unknown"
  ]);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  // Reset trigger - increment this to force a data reload even if filters appear unchanged
  const [resetTrigger, setResetTrigger] = useState(0);

  // Fetch standardized breeds from the API
  useEffect(() => {
    async function fetchBreeds() {
      try {
        // In a real implementation, we would call the API
        // For now, let's use our hardcoded list as the API isn't ready yet
        // const breeds = await getStandardizedBreeds(breedGroupFilter !== "Any group" ? breedGroupFilter : null);
        
        // Mock implementation until API is ready
        let mockBreeds = ["Any breed"];
        
        // Filter breeds by group if a group is selected
        if (breedGroupFilter === "Sporting") {
          mockBreeds = mockBreeds.concat([
            "Labrador Retriever", "Golden Retriever", "Cocker Spaniel", 
            "English Springer Spaniel", "Pointer", "Setter", "Weimaraner"
          ]);
        } else if (breedGroupFilter === "Hound") {
          mockBreeds = mockBreeds.concat([
            "Beagle", "Dachshund", "Basset Hound", "Bloodhound", 
            "Greyhound", "Whippet", "Afghan Hound"
          ]);
        } else if (breedGroupFilter === "Working") {
          mockBreeds = mockBreeds.concat([
            "Boxer", "Rottweiler", "Doberman Pinscher", "Great Dane", 
            "Mastiff", "Saint Bernard", "Siberian Husky"
          ]);
        } else if (breedGroupFilter === "Terrier") {
          mockBreeds = mockBreeds.concat([
            "American Pit Bull Terrier", "Bull Terrier", "Jack Russell Terrier", 
            "Yorkshire Terrier", "West Highland White Terrier", "Airedale Terrier"
          ]);
        } else if (breedGroupFilter === "Mixed") {
          mockBreeds = mockBreeds.concat([
            "Mixed Breed", "Labrador Retriever Mix", "Shepherd Mix", "Terrier Mix"
          ]);
        } else if (breedGroupFilter === "Any group") {
          // Add some popular breeds from various groups
          mockBreeds = mockBreeds.concat([
            "Labrador Retriever", "German Shepherd", "Golden Retriever", 
            "American Pit Bull Terrier", "Beagle", "Poodle", "Mixed Breed"
          ]);
        }
        
        setStandardizedBreeds(mockBreeds);
        
        // If current breed isn't in the filtered list, reset to "Any breed"
        if (!mockBreeds.includes(standardizedBreedFilter) && breedGroupFilter !== "Any group") {
          setStandardizedBreedFilter("Any breed");
        }
      } catch (err) {
        console.error('Error fetching breeds:', err);
      }
    }
    
    fetchBreeds();
  }, [breedGroupFilter, standardizedBreedFilter]);
  
  // Direct API call function for resetting filters
  const resetAndFetchAllDogs = useCallback(() => {
    console.log("Direct reset and fetch all dogs triggered");
    
    // Reset all filter state immediately
    setStandardizedBreedFilter("Any breed");
    setBreedGroupFilter("Any group");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeCategoryFilter("Any age");
    setSearchQuery("");
    
    // Set loading state
    setLoading(true);
    
    // Make a direct API call with minimal parameters
    getDogs({
      page: 1,
      limit: 20,
      animal_type: "dog"
    })
      .then(data => {
        console.log("Direct API call received:", data.length, "dogs");
        setDogs(data);
        setHasMore(data.length === 20);
      })
      .catch(err => {
        console.error("Error in direct API call:", err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
      
    // Force reset of other state as well
    setPage(1);
    setResetTrigger(prev => prev + 1);
  }, []);
  
  // Clear all filters function - now uses the direct API call
  const clearFilters = useCallback(() => {
    console.log("Clear filters triggered - using direct API call");
    resetAndFetchAllDogs();
  }, [resetAndFetchAllDogs]);
  
  // Function to fetch dogs with hybrid filtering approach
  const fetchDogs = useCallback(async (isNewSearch = false) => {
    console.log("Fetching dogs with filters:", {
      standardizedBreedFilter, 
      breedGroupFilter,
      sexFilter, 
      sizeFilter, 
      ageCategoryFilter, 
      searchQuery, 
      page: isNewSearch ? 1 : page
    });
    
    if (isNewSearch) {
      setPage(1);
      setDogs([]);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build API params from filters - try both standard and legacy parameters
      const params = {
        page: isNewSearch ? 1 : page,
        limit: 20,
        animal_type: "dog", // Ensure we're only getting dogs
      };
      
      // Add standardized breed filter with fallback to regular breed
      if (standardizedBreedFilter !== "Any breed") {
        params.standardized_breed = standardizedBreedFilter;
        // Also include regular breed as fallback for older API versions
        params.breed = standardizedBreedFilter;
      }
      
      // Add breed group filter
      if (breedGroupFilter !== "Any group") {
        params.breed_group = breedGroupFilter;
      }
      
      // Add sex filter
      if (sexFilter !== "Any") {
        params.sex = sexFilter;
      }
      
      // Add standardized size filter with fallback
      if (sizeFilter !== "Any size") {
        // Map UI size values to backend standardized size values
        const sizeMapping = {
          "Tiny": "Tiny",
          "Small": "Small",
          "Medium": "Medium",
          "Large": "Large",
          "Extra Large": "XLarge"
        };
        
        const mappedSize = sizeMapping[sizeFilter] || sizeFilter;
        params.standardized_size = mappedSize;
        // Also include regular size as fallback
        params.size = mappedSize;
      }
      
      // Add age category filter
      if (ageCategoryFilter !== "Any age") {
        params.age_category = ageCategoryFilter;
        
        // Add age_min_months and age_max_months as fallback parameters
        if (ageCategoryFilter === "Puppy") {
          params.min_age_months = 0;
          params.max_age_months = 12;
        } else if (ageCategoryFilter === "Young") {
          params.min_age_months = 12;
          params.max_age_months = 36;
        } else if (ageCategoryFilter === "Adult") {
          params.min_age_months = 36;
          params.max_age_months = 96;
        } else if (ageCategoryFilter === "Senior") {
          params.min_age_months = 96;
          params.max_age_months = null;
        }
      }
      
      // Add search query
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      console.log("Sending API request with params:", params);
      
      const data = await getDogs(params);
      console.log("Received data:", data.length, "results");
      
      if (isNewSearch) {
        setDogs(data);
      } else {
        setDogs(prev => [...prev, ...data]);
      }
      
      // Check if we have more data to load
      setHasMore(data.length === params.limit);
      
    } catch (err) {
      setError(err);
      console.error('Error fetching dogs:', err);
    } finally {
      setLoading(false);
    }
  }, [standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter, searchQuery, page]);
  
  // Initial load - fetch dogs when the component first mounts
  useEffect(() => {
    console.log("Initial data load");
    fetchDogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // When filters change or reset is triggered
  useEffect(() => {
    console.log("Filters changed or reset triggered");
    
    // Calculate active filter count
    let count = 0;
    if (standardizedBreedFilter !== "Any breed") count++;
    if (breedGroupFilter !== "Any group") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageCategoryFilter !== "Any age") count++;
    if (searchQuery) count++;
    setActiveFilterCount(count);
    
    // Always trigger a data fetch with the current filters
    fetchDogs(true);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter, searchQuery, resetTrigger]);
  
  // Load more data when page changes
  useEffect(() => {
    if (page > 1) {
      console.log("Page changed - fetching more data");
      fetchDogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  
  // Handle loading more results
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle direct API reload (for error state)
  const handleRetry = () => {
    console.log("Retry triggered");
    resetAndFetchAllDogs();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Rescue Dog</h1>
        <p className="text-lg text-gray-600 mb-8">
          Browse available rescue dogs from multiple organizations. Use the filters to find your perfect match.
        </p>
        
        {/* Filters section */}
        <div className="bg-gray-100 p-4 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <button 
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                aria-label="Clear all filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            )}
          </div>
          
          {/* Search input */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or breed..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 pl-10 pr-4 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="Search dogs by name or breed"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {/* Breed Group filter - NEW */}
            <div>
              <label htmlFor="breed-group-filter" className="block text-sm font-medium text-gray-700 mb-1">Breed Group</label>
              <div className="relative">
                <select
                  id="breed-group-filter"
                  value={breedGroupFilter}
                  onChange={(e) => setBreedGroupFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  {breedGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                {breedGroupFilter !== "Any group" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Standardized Breed filter - UPDATED */}
            <div>
              <label htmlFor="breed-filter" className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <div className="relative">
                <select
                  id="breed-filter"
                  value={standardizedBreedFilter}
                  onChange={(e) => setStandardizedBreedFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  {standardizedBreeds.map((breed) => (
                    <option key={breed} value={breed}>{breed}</option>
                  ))}
                </select>
                {standardizedBreedFilter !== "Any breed" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sex filter */}
            <div>
              <label htmlFor="sex-filter" className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <div className="relative">
                <select
                  id="sex-filter"
                  value={sexFilter}
                  onChange={(e) => setSexFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  <option>Any</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {sexFilter !== "Any" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Size filter - UPDATED to use standardized sizes */}
            <div>
              <label htmlFor="size-filter" className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <div className="relative">
                <select
                  id="size-filter"
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  <option>Any size</option>
                  <option>Tiny</option>
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                  <option>Extra Large</option>
                </select>
                {sizeFilter !== "Any size" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Age filter - UPDATED to use age categories */}
            <div>
              <label htmlFor="age-filter" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="relative">
                <select
                  id="age-filter"
                  value={ageCategoryFilter}
                  onChange={(e) => setAgeCategoryFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  <option>Any age</option>
                  <option>Puppy</option>
                  <option>Young</option>
                  <option>Adult</option>
                  <option>Senior</option>
                </select>
                {ageCategoryFilter !== "Any age" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Filter results count */}
          <div className="mt-4 text-sm text-gray-600">
            Found {dogs.length} {dogs.length === 1 ? 'dog' : 'dogs'}
            {activeFilterCount > 0 && ` matching your ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'}`}
          </div>
        </div>
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>There was an error loading dogs. Please try again later.</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Initial loading state */}
        {loading && dogs.length === 0 ? (
          <Loading />
        ) : dogs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {dogs.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </div>
            
            {/* Load more button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 hover:bg-blue-600 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More Dogs'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No dogs found</h3>
            <p className="text-gray-600 mb-4">No dogs match your current filter criteria.</p>
            <button 
              onClick={resetAndFetchAllDogs}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}