// src/app/dogs/page.jsx
"use client";

import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';

export default function DogsPage() {
  // Enhanced mock data with more variety
  const allDogs = [
    { id: 1, name: "Buddy", breed: "Golden Retriever", age_text: "2 years", sex: "Male", size: "Large" },
    { id: 2, name: "Luna", breed: "German Shepherd", age_text: "1 year", sex: "Female", size: "Large" },
    { id: 3, name: "Max", breed: "Labrador", age_text: "3 years", sex: "Male", size: "Large" },
    { id: 4, name: "Bella", breed: "Beagle", age_text: "4 years", sex: "Female", size: "Medium" },
    { id: 5, name: "Charlie", breed: "Poodle", age_text: "2 years", sex: "Male", size: "Medium" },
    { id: 6, name: "Lucy", breed: "Border Collie", age_text: "5 years", sex: "Female", size: "Medium" },
    { id: 7, name: "Cooper", breed: "Husky", age_text: "3 years", sex: "Male", size: "Large" },
    { id: 8, name: "Daisy", breed: "Corgi", age_text: "1 year", sex: "Female", size: "Small" },
    { id: 9, name: "Rocky", breed: "Boxer", age_text: "6 months", sex: "Male", size: "Medium" },
    { id: 10, name: "Lola", breed: "Chihuahua", age_text: "7 years", sex: "Female", size: "Small" },
    { id: 11, name: "Bear", breed: "Bernese Mountain Dog", age_text: "4 years", sex: "Male", size: "Large" },
    { id: 12, name: "Molly", breed: "Shih Tzu", age_text: "8 months", sex: "Female", size: "Small" },
  ];

  // Filter states
  const [breedFilter, setBreedFilter] = useState("Any breed");
  const [sexFilter, setSexFilter] = useState("Any");
  const [sizeFilter, setSizeFilter] = useState("Any size");
  const [ageFilter, setAgeFilter] = useState("Any age");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filtered results
  const [filteredDogs, setFilteredDogs] = useState(allDogs);
  
  // Active filter count for UI feedback
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  // Extract unique breeds, sizes for filter options
  const breeds = ["Any breed", ...new Set(allDogs.map(dog => dog.breed))];
  const sizes = ["Any size", "Small", "Medium", "Large"];
  
  // Apply filters when any filter changes
  useEffect(() => {
    // Filter the dogs based on all criteria
    const result = allDogs.filter(dog => {
      // Search by name (case insensitive)
      if (searchQuery && !dog.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by breed
      if (breedFilter !== "Any breed" && dog.breed !== breedFilter) {
        return false;
      }
      
      // Filter by sex
      if (sexFilter !== "Any" && dog.sex !== sexFilter) {
        return false;
      }
      
      // Filter by size
      if (sizeFilter !== "Any size" && dog.size !== sizeFilter) {
        return false;
      }
      
      // Filter by age
      if (ageFilter !== "Any age") {
        const ageText = dog.age_text.toLowerCase();
        
        if (ageFilter === "Puppy" && !ageText.includes("month") && !ageText.includes("months")) {
          return false;
        }
        
        if (ageFilter === "Young" && !ageText.match(/^[1-2] year/)) {
          return false;
        }
        
        if (ageFilter === "Adult" && !ageText.match(/^[3-7] year/)) {
          return false;
        }
        
        if (ageFilter === "Senior" && !ageText.match(/^[8-9]\d* year/)) {
          return false;
        }
      }
      
      // If passed all filters
      return true;
    });
    
    setFilteredDogs(result);
    
    // Calculate how many filters are active for UI feedback
    let count = 0;
    if (breedFilter !== "Any breed") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageFilter !== "Any age") count++;
    if (searchQuery) count++;
    setActiveFilterCount(count);
  }, [breedFilter, sexFilter, sizeFilter, ageFilter, searchQuery]);
  
  // Clear all filters
  const clearFilters = () => {
    setBreedFilter("Any breed");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeFilter("Any age");
    setSearchQuery("");
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Rescue Dog</h1>
        <p className="text-lg text-gray-600 mb-8">
          Browse available rescue dogs from multiple organizations. Use the filters to find your perfect match.
        </p>
        
        {/* Enhanced filters section */}
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
                  {sizes.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
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
            Found {filteredDogs.length} {filteredDogs.length === 1 ? 'dog' : 'dogs'}
            {activeFilterCount > 0 && ` matching your ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'}`}
          </div>
        </div>
        
        {/* Dogs grid with conditional empty state */}
        {filteredDogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredDogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} />
            ))}
          </div>
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