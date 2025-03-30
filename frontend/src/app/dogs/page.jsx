// src/app/dogs/page.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';
import Loading from '../../components/ui/Loading';
import { getDogs } from '../../services/dogsService';

export default function DogsPage() {
  // State for filters
  const [breedFilter, setBreedFilter] = useState("Any breed");
  const [sexFilter, setSexFilter] = useState("Any");
  const [sizeFilter, setSizeFilter] = useState("Any size");
  const [ageFilter, setAgeFilter] = useState("Any age");
  const [searchQuery, setSearchQuery] = useState("");
  
  // API related state
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [breeds, setBreeds] = useState(["Any breed"]);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  // Reset trigger - increment this to force a data reload even if filters appear unchanged
  const [resetTrigger, setResetTrigger] = useState(0);
  
  // Direct API call function for resetting filters
  const resetAndFetchAllDogs = useCallback(() => {
    console.log("Direct reset and fetch all dogs triggered");
    
    // Reset all filter state immediately
    setBreedFilter("Any breed");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeFilter("Any age");
    setSearchQuery("");
    
    // Set loading state
    setLoading(true);
    
    // Make a direct API call with minimal parameters
    getDogs({
      page: 1,
      limit: 20
    })
      .then(data => {
        console.log("Direct API call received:", data.length, "dogs");
        setDogs(data);
        setHasMore(data.length === 20);
        // Also update breeds dropdown
        if (data.length > 0) {
          const uniqueBreeds = [...new Set(data.map(dog => dog.breed).filter(Boolean))];
          setBreeds(["Any breed", ...uniqueBreeds.sort()]);
        }
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
      breedFilter, 
      sexFilter, 
      sizeFilter, 
      ageFilter, 
      searchQuery, 
      page: isNewSearch ? 1 : page,
      resetTrigger
    });
    
    if (isNewSearch) {
      setPage(1);
      setDogs([]);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build API params from filters - ONLY include parameters the backend supports
      const params = {
        page: isNewSearch ? 1 : page,
        limit: 20,
      };
      
      // Only add supported filters to API request
      if (breedFilter !== "Any breed") params.breed = breedFilter;
      if (sexFilter !== "Any") params.sex = sexFilter;
      if (searchQuery) params.search = searchQuery;
      
      // NOTE: We intentionally don't add size or age_group to API request parameters
      // to avoid sending parameters the backend doesn't support
      
      console.log("Sending API request with params:", params);
      
      const data = await getDogs(params);
      console.log("Received data:", data.length, "results");
      
      // Apply frontend filtering for size and age if those filters are active
      let filteredData = [...data];
      
      // Apply size filter in frontend if selected
      if (sizeFilter !== "Any size") {
        console.log("Applying size filter in frontend:", sizeFilter);
        filteredData = filteredData.filter(dog => {
          // Match size based on what's in the database
          if (!dog.size) return false;
          
          const dogSize = String(dog.size).toLowerCase();
          const filterSize = sizeFilter.toLowerCase();
          
          return dogSize.includes(filterSize);
        });
      }
      
      // Apply age filter in frontend if selected
      if (ageFilter !== "Any age") {
        console.log("Applying age filter in frontend:", ageFilter);
        filteredData = filteredData.filter(dog => {
          if (!dog.age_text) return false;
          
          const ageText = String(dog.age_text).toLowerCase();
          
          switch (ageFilter) {
            case "Puppy":
              return ageText.includes("puppy") || 
                     ageText.includes("month") || 
                     (ageText.includes("year") && parseInt(ageText) <= 1);
            case "Young":
              return ageText.includes("young") || 
                     (ageText.includes("year") && parseInt(ageText) > 1 && parseInt(ageText) <= 3);
            case "Adult":
              return ageText.includes("adult") || 
                     (ageText.includes("year") && parseInt(ageText) > 3 && parseInt(ageText) <= 8);
            case "Senior":
              return ageText.includes("senior") || 
                     (ageText.includes("year") && parseInt(ageText) > 8);
            default:
              return true;
          }
        });
      }
      
      console.log("After frontend filtering:", filteredData.length, "results");
      
      if (isNewSearch) {
        setDogs(filteredData);
      } else {
        setDogs(prev => [...prev, ...filteredData]);
      }
      
      // Check if we have more data to load - based on original data from API
      setHasMore(data.length === params.limit);
      
      // If this is the first load, extract unique breeds for filter
      if ((page === 1 || isNewSearch) && data.length > 0) {
        const uniqueBreeds = [...new Set(data.map(dog => dog.breed).filter(Boolean))];
        setBreeds(["Any breed", ...uniqueBreeds.sort()]);
      }
      
    } catch (err) {
      setError(err);
      console.error('Error fetching dogs:', err);
    } finally {
      setLoading(false);
    }
  }, [breedFilter, sexFilter, sizeFilter, ageFilter, searchQuery, page, resetTrigger]);
  
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
    if (breedFilter !== "Any breed") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageFilter !== "Any age") count++;
    if (searchQuery) count++;
    setActiveFilterCount(count);
    
    // Always trigger a data fetch with the current filters
    fetchDogs(true);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breedFilter, sexFilter, sizeFilter, ageFilter, searchQuery, resetTrigger]);
  
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Breed filter */}
            <div>
              <label htmlFor="breed-filter" className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <div className="relative">
                <select
                  id="breed-filter"
                  value={breedFilter}
                  onChange={(e) => setBreedFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  {breeds.map((breed) => (
                    <option key={breed} value={breed}>{breed}</option>
                  ))}
                </select>
                {breedFilter !== "Any breed" && (
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
            
            {/* Size filter */}
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
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                </select>
                {sizeFilter !== "Any size" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Age filter */}
            <div>
              <label htmlFor="age-filter" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="relative">
                <select
                  id="age-filter"
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                >
                  <option>Any age</option>
                  <option>Puppy</option>
                  <option>Young</option>
                  <option>Adult</option>
                  <option>Senior</option>
                </select>
                {ageFilter !== "Any age" && (
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