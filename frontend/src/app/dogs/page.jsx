// src/app/dogs/page.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';
import Loading from '../../components/ui/Loading';
import {
  getAnimals, // <<< Change this line
  getStandardizedBreeds,
  getBreedGroups,
  // getAnimalsByStandardizedBreed // Rename if you renamed this in the service too
} from '../../services/animalsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import shadcn Select components
import { Button } from "@/components/ui/button"; // Import Button
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose // Optional: For a close button inside
} from "@/components/ui/sheet"; // Import Sheet components
import { Filter } from 'lucide-react'; // Import an icon for the button
import FilterControls from '../../components/dogs/FilterControls'; // <<< Import the new component
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // <<< Import Alert components

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

  // *** NEW: State for mobile filter sheet ***
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Define options for filters that don't come from API (or have fixed values)
  const sexOptions = ["Any", "Male", "Female"];
  const sizeOptions = ["Any size", "Tiny", "Small", "Medium", "Large", "Extra Large"];
  const ageOptions = ["Any age", "Puppy", "Young", "Adult", "Senior"];

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
    setError(null); // Clear previous errors

    // Make a direct API call with minimal parameters
    // CORRECTED FUNCTION CALL HERE
    getAnimals({ // <<< Use getAnimals
      limit: 20, // Fetch initial page size
      offset: 0, // Start from the beginning
      // animal_type: "dog" // Backend likely defaults or doesn't need this
    })
      .then(data => {
        console.log("Direct API call received:", data.length, "animals");
        setDogs(data);
        setHasMore(data.length === 20);
      })
      .catch(err => {
        console.error("Error in direct API call:", err);
        setError('Failed to load animals. Please try refreshing.'); // Set error state
        setDogs([]); // Clear dogs on error
        setHasMore(false);
      })
      .finally(() => {
        setLoading(false);
      });

    // Force reset of other state as well
    setPage(1);
    setResetTrigger(prev => prev + 1); // Trigger useEffect for filters if needed
  }, []); // Removed dependencies as it should be static

  // Clear all filters function - now uses the direct API call
  const clearFilters = useCallback(() => {
    console.log("Clear filters triggered - using direct API call");
    resetAndFetchAllDogs();
  }, [resetAndFetchAllDogs]);
  
  // Function to fetch dogs with hybrid filtering approach
  const fetchDogs = useCallback(async (reset = false) => {
    setLoading(true); // Set loading true at the start

    const currentPage = reset ? 1 : page;
    const currentOffset = (currentPage - 1) * 20;

    const params = {
      limit: 20,
      offset: currentOffset,
      search: searchQuery || null,
      standardized_breed: standardizedBreedFilter !== "Any breed" ? standardizedBreedFilter : null,
      breed_group: breedGroupFilter !== "Any group" ? breedGroupFilter : null,
      sex: sexFilter !== "Any" ? sexFilter : null,
      standardized_size: sizeFilter !== "Any size" ? mapUiSizeToStandardized(sizeFilter) : null, // Assuming mapUiSizeToStandardized exists
      age_category: ageCategoryFilter !== "Any age" ? ageCategoryFilter : null,
    };

    try {
      const newAnimals = await getAnimals(params);

      // *** FIX: Ensure uniqueness when appending ***
      setDogs(prevDogs => {
        if (reset) {
          return newAnimals; // Replace entirely on reset
        } else {
          // Create a Set of existing IDs for quick lookup
          const existingIds = new Set(prevDogs.map(dog => dog.id));
          // Filter out animals that are already in the state
          const uniqueNewAnimals = newAnimals.filter(dog => !existingIds.has(dog.id));
          // Append only the unique new animals
          return [...prevDogs, ...uniqueNewAnimals];
        }
      });

      setHasMore(newAnimals.length === 20);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch animals:", err);
      // Only set error if it's not a reset (initial load/filter change)
      // Avoid showing error just because load more failed temporarily
      if (reset || page === 1) {
         setError('Failed to load animals. Please try refreshing.');
      }
      setHasMore(false); // Stop loading more on error
    } finally {
      setLoading(false);
    }
  // Add mapUiSizeToStandardized if it's defined outside and used
  }, [page, searchQuery, standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter, resetTrigger]); // Keep dependencies

  // Initial load - fetch dogs when the component first mounts
  useEffect(() => {
    console.log("Initial data load");
    fetchDogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // When filters change or reset is triggered
  useEffect(() => {
    console.log("Filters changed or reset triggered");

    // *** MOVE activeFilterCount calculation here ***
    let count = 0;
    if (standardizedBreedFilter !== "Any breed") count++;
    if (breedGroupFilter !== "Any group") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageCategoryFilter !== "Any age") count++;
    if (searchQuery) count++;
    setActiveFilterCount(count); // Set the count based on current filter states

    // Always trigger a data fetch with the current filters
    fetchDogs(true); // Reset pagination when filters change

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardizedBreedFilter, breedGroupFilter, sexFilter, sizeFilter, ageCategoryFilter, searchQuery, resetTrigger]); // Keep original dependencies
  
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

  // *** NEW: Derive active filter chips ***
  const activeFilters = [];
  if (searchQuery) {
    activeFilters.push({ id: 'search', type: 'Search', value: searchQuery, label: `Search: "${searchQuery}"` });
  }
  if (breedGroupFilter !== "Any group") {
    activeFilters.push({ id: 'breedGroup', type: 'Breed Group', value: breedGroupFilter, label: `Group: ${breedGroupFilter}` });
  }
  if (standardizedBreedFilter !== "Any breed") {
    activeFilters.push({ id: 'breed', type: 'Breed', value: standardizedBreedFilter, label: `Breed: ${standardizedBreedFilter}` });
  }
  if (sexFilter !== "Any") {
    activeFilters.push({ id: 'sex', type: 'Sex', value: sexFilter, label: `Sex: ${sexFilter}` });
  }
  if (sizeFilter !== "Any size") {
    activeFilters.push({ id: 'size', type: 'Size', value: sizeFilter, label: `Size: ${sizeFilter}` });
  }
  if (ageCategoryFilter !== "Any age") {
    activeFilters.push({ id: 'age', type: 'Age', value: ageCategoryFilter, label: `Age: ${ageCategoryFilter}` });
  }
  // *** REMOVE THIS useEffect for activeFilterCount ***
  // useEffect(() => {
  //   setActiveFilterCount(activeFilters.length);
  // }, [activeFilters]); // Depend on the derived array

  // *** ADD THIS LOG ***
  console.log("Active Filters Array:", activeFilters);

  // *** NEW: Function to remove a specific filter chip ***
  const removeFilter = (filterId) => {
    switch (filterId) {
      case 'search':
        setSearchQuery("");
        break;
      case 'breedGroup':
        setBreedGroupFilter("Any group");
        break;
      case 'breed':
        setStandardizedBreedFilter("Any breed");
        break;
      case 'sex':
        setSexFilter("Any");
        break;
      case 'size':
        setSizeFilter("Any size");
        break;
      case 'age':
        setAgeCategoryFilter("Any age");
        break;
      default:
        break;
    }
    // The useEffect watching filter state will trigger fetchDogs(true)
  };

  // *** NEW: Function to clear search query ***
  const clearSearch = () => {
    setSearchQuery("");
  };

  // *** Prepare props for FilterControls ***
  const filterControlProps = {
    searchQuery,
    handleSearchChange,
    clearSearch, // Pass the clear function
    breedGroupFilter,
    setBreedGroupFilter,
    breedGroups,
    standardizedBreedFilter,
    setStandardizedBreedFilter,
    standardizedBreeds,
    sexFilter,
    setSexFilter,
    sexOptions,
    sizeFilter,
    setSizeFilter,
    sizeOptions,
    ageCategoryFilter,
    setAgeCategoryFilter,
    ageOptions,
  };

  return (
    <Layout>
      {/* Use flex layout for sidebar and main content on medium screens and up */}
      <div className="max-w-7xl mx-auto md:flex md:gap-8">

        {/* --- Mobile Filter Button & Sheet --- */}
        <div className="md:hidden p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="font-semibold">Filters</h2>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm overflow-y-auto"> {/* Added overflow */}
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <FilterControls {...filterControlProps} />
                {/* Optional: Add a button inside the sheet to close it */}
                <SheetClose asChild className="mt-6 w-full">
                  <Button>Apply Filters</Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* --- Desktop Filter Sidebar --- */}
        {/* Hidden on small screens, visible as a sidebar on medium+ */}
        <aside className="hidden md:block md:w-64 lg:w-72 xl:w-80 md:flex-shrink-0 p-4 border-r border-gray-200">
          <div className="sticky top-4"> {/* Make sidebar sticky */}
            <h2 className="font-semibold mb-4">Filters</h2>
            {activeFilterCount > 0 && (
              <Button
                variant="link" // Use link variant for text-like appearance
                size="sm"      // Use small size
                onClick={clearFilters}
                // Keep flex, mb, adjust padding/height for link variant, ensure color
                className="text-blue-600 hover:text-blue-800 flex items-center mb-4 p-0 h-auto"
                aria-label="Clear all filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters ({activeFilterCount})
              </Button>
            )}
            <FilterControls {...filterControlProps} />
          </div>
        </aside>

        {/* --- Main Content Area --- */}
        <main className="flex-1 p-4"> {/* Takes remaining space */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Rescue Dog</h1>
          <p className="text-lg text-gray-600 mb-8">
            Browse available rescue dogs from multiple organizations. Use the filters to find your perfect match.
          </p>

          {/* *** REMOVE the old filter container *** */}
          {/* <div className="bg-gray-100 p-4 rounded-lg mb-8"> ... </div> */}

          {/* Active Filter Chips Display */}
          {activeFilters.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Active Filters:</span>
              {activeFilters.map((filter) => (
                <span
                  key={filter.id}
                  className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                >
                  {filter.label}
                  {/* Chip remove button (standard button is fine here) */}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="ml-1.5 flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    aria-label={`Remove ${filter.type} filter`}
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
              {/* *** REPLACE THIS BUTTON *** */}
              <Button
                variant="link"
                size="sm" // Match original text-sm
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 ml-2 p-0 h-auto" // Adjust classes for link variant
                aria-label="Clear all filters"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* *** REPLACE Error state div with Alert *** */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error} {/* Display the error message from state */}
                {/* Keep the Retry button inside */}
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRetry}
                  className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block" // Make it block to appear below text
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading / Results / No Results */}
          {loading && dogs.length === 0 ? (
            <Loading />
          ) : dogs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> {/* Adjusted grid cols */}
                {dogs.map((dog) => (
                  <DogCard key={dog.id} dog={dog} />
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button onClick={handleLoadMore} disabled={loading}>
                    {loading ? 'Loading...' : 'Load More Dogs'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            // *** No Dogs Found State ***
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Dogs Found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or clearing them to see all available dogs.
              </p>
              {/* *** ENSURE THIS USES DEFAULT BUTTON STYLE *** */}
              <Button onClick={resetAndFetchAllDogs}>
                Clear all filters
              </Button>
            </div>
          )}
        </main> {/* End Main Content Area */}

      </div> {/* End Flex container */}
    </Layout>
  );
}

// Helper function (if not already defined elsewhere)
// Make sure this function exists or adjust the params building logic
const mapUiSizeToStandardized = (uiSize) => {
  // Example mapping, adjust based on your actual needs
  const mapping = {
    "Tiny": "Tiny",
    "Small": "Small",
    "Medium": "Medium",
    "Large": "Large",
    "Extra Large": "XLarge", // Match backend if it uses XLarge
  };
  return mapping[uiSize] || null;
};