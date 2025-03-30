// src/app/dogs/page.jsx
"use client";

import { useState, useEffect } from 'react';
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
  
  // Function to fetch dogs
  const fetchDogs = async (isNewSearch = false) => {
    if (isNewSearch) {
      setPage(1);
      setDogs([]);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build API params from filters
      const params = {
        page: isNewSearch ? 1 : page,
        limit: 20,
      };
      
      // Add filters
      if (breedFilter !== "Any breed") params.breed = breedFilter;
      if (sexFilter !== "Any") params.sex = sexFilter;
      if (sizeFilter !== "Any size") params.size = sizeFilter;
      
      // Handle age filter - backend would need to support this
      if (ageFilter === "Puppy") params.age_group = "puppy";
      else if (ageFilter === "Young") params.age_group = "young";
      else if (ageFilter === "Adult") params.age_group = "adult";
      else if (ageFilter === "Senior") params.age_group = "senior";
      
      // Add search query if present
      if (searchQuery) params.search = searchQuery;
      
      const data = await getDogs(params);
      
      if (isNewSearch) {
        setDogs(data);
      } else {
        setDogs(prev => [...prev, ...data]);
      }
      
      // Check if we have more data to load
      setHasMore(data.length === params.limit);
      
      // If this is the first load, extract unique breeds for filter
      if ((page === 1 || isNewSearch) && data.length > 0) {
        const uniqueBreeds = [...new Set(data.map(dog => dog.breed))].filter(Boolean);
        setBreeds(["Any breed", ...uniqueBreeds]);
      }
      
    } catch (err) {
      setError(err);
      console.error('Error fetching dogs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchDogs();
  }, []);
  
  // When filters change
  useEffect(() => {
    // Calculate active filter count
    let count = 0;
    if (breedFilter !== "Any breed") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageFilter !== "Any age") count++;
    if (searchQuery) count++;
    setActiveFilterCount(count);
    
    // Don't trigger on initial load
    if (dogs.length > 0) {
      fetchDogs(true);
    }
  }, [breedFilter, sexFilter, sizeFilter, ageFilter, searchQuery]);
  
  // Load more data when page changes
  useEffect(() => {
    if (page > 1) {
      fetchDogs();
    }
  }, [page]);
  
  // Clear all filters
  const clearFilters = () => {
    setBreedFilter("Any breed");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeFilter("Any age");
    setSearchQuery("");
  };
  
  // Load more handler
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
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
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-4 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <div className="relative">
                <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <div className="relative">
                <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <div className="relative">
                <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="relative">
                <select
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
              onClick={() => fetchDogs(true)}
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
                  className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
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
              onClick={clearFilters}
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