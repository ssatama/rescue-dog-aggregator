"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * Reusable FilterSection component using native details/summary elements
 */
function FilterSection({ id, title, defaultOpen = false, children, count = 0 }) {
  return (
    <details 
      data-testid={`filter-section-${id}`}
      className="group"
      open={defaultOpen}
      aria-label={`${title} filters section`}
    >
      <summary 
        data-testid={`filter-summary-${id}`}
        className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
        role="button"
        aria-expanded={defaultOpen}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">{title}</span>
          {count > 0 && (
            <span className="inline-flex bg-orange-100 text-orange-700 px-2 rounded-full text-xs">
              ({count})
            </span>
          )}
        </div>
        <ChevronDown 
          data-testid={`chevron-icon-${id}`}
          className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" 
        />
      </summary>
      <div 
        data-testid={`filter-content-${id}`}
        className="mt-3 space-y-3"
      >
        {children}
      </div>
    </details>
  );
}

/**
 * Desktop floating filter panel for the dog catalog page
 * Features collapsible sections, enhanced UI controls, and backdrop blur
 */
export default function DesktopFilters({
  // Search
  searchQuery,
  handleSearchChange,
  clearSearch,
  
  // Organization
  organizationFilter,
  setOrganizationFilter,
  organizations,
  
  // Breed
  standardizedBreedFilter,
  setStandardizedBreedFilter,
  standardizedBreeds,
  
  // Pet Details
  sexFilter,
  setSexFilter,
  sexOptions,
  
  sizeFilter,
  setSizeFilter,
  sizeOptions,
  
  ageCategoryFilter,
  setAgeCategoryFilter,
  ageOptions,
  
  // Location
  locationCountryFilter,
  setLocationCountryFilter,
  locationCountries,
  
  availableCountryFilter,
  setAvailableCountryFilter,
  availableCountries,
  
  availableRegionFilter,
  setAvailableRegionFilter,
  availableRegions,
  
  // Filter management
  resetFilters
}) {
  // Local state for breed input to handle real-time suggestions
  const [breedInputValue, setBreedInputValue] = useState(
    standardizedBreedFilter === 'Any breed' ? '' : standardizedBreedFilter
  );

  // Optimized handlers with useCallback
  const handleBreedInputChange = useCallback((e) => {
    const value = e.target.value;
    setBreedInputValue(value);
    setStandardizedBreedFilter(value || 'Any breed');
  }, [setStandardizedBreedFilter]);

  const handleBreedClear = useCallback(() => {
    setBreedInputValue('');
    setStandardizedBreedFilter('Any breed');
  }, [setStandardizedBreedFilter]);

  const handleBreedSuggestionClick = useCallback((breed) => {
    setBreedInputValue(breed);
    setStandardizedBreedFilter(breed);
  }, [setStandardizedBreedFilter]);

  // Filtered breeds for suggestions (memoized for performance)
  const filteredBreeds = useMemo(() => {
    if (!breedInputValue || breedInputValue.trim().length === 0) return [];
    return standardizedBreeds
      .filter(breed => 
        breed.toLowerCase().includes(breedInputValue.toLowerCase()) && 
        breed !== 'Any breed'
      )
      .slice(0, 5);
  }, [breedInputValue, standardizedBreeds]);
  
  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    // Search query
    if (searchQuery && searchQuery.trim() !== '') count++;
    
    // Organization filter
    if (organizationFilter && organizationFilter !== 'any') count++;
    
    // Breed filter
    if (standardizedBreedFilter && standardizedBreedFilter !== 'Any breed') count++;
    
    // Sex filter
    if (sexFilter && sexFilter !== 'Any') count++;
    
    // Size filter
    if (sizeFilter && sizeFilter !== 'Any size') count++;
    
    // Age filter
    if (ageCategoryFilter && ageCategoryFilter !== 'Any age') count++;
    
    // Location country filter
    if (locationCountryFilter && locationCountryFilter !== 'Any country') count++;
    
    // Available country filter
    if (availableCountryFilter && availableCountryFilter !== 'Any country') count++;
    
    // Available region filter
    if (availableRegionFilter && availableRegionFilter !== 'Any region') count++;
    
    return count;
  }, [
    searchQuery,
    organizationFilter,
    standardizedBreedFilter,
    sexFilter,
    sizeFilter,
    ageCategoryFilter,
    locationCountryFilter,
    availableCountryFilter,
    availableRegionFilter
  ]);

  // Calculate section-specific filter counts
  const sectionCounts = useMemo(() => {
    const counts = {
      search: 0,
      breed: 0,
      shipsToCountry: 0,
      age: 0,
      size: 0,
      sex: 0
    };

    // Search & Basic section
    if (searchQuery && searchQuery.trim() !== '') counts.search++;
    if (organizationFilter && organizationFilter !== 'any') counts.search++;

    // Breed section
    if (standardizedBreedFilter && standardizedBreedFilter !== 'Any breed') counts.breed++;

    // Ships to Country section
    if (availableCountryFilter && availableCountryFilter !== 'Any country') counts.shipsToCountry++;

    // Age section
    if (ageCategoryFilter && ageCategoryFilter !== 'Any age') counts.age++;

    // Size section
    if (sizeFilter && sizeFilter !== 'Any size') counts.size++;

    // Sex section  
    if (sexFilter && sexFilter !== 'Any') counts.sex++;

    return counts;
  }, [
    searchQuery,
    organizationFilter,
    standardizedBreedFilter,
    availableCountryFilter,
    ageCategoryFilter,
    sizeFilter,
    sexFilter
  ]);

  return (
    <aside 
      data-testid="desktop-filters-container"
      className="hidden md:block w-72 shrink-0"
    >
      <div 
        data-testid="desktop-filters-panel"
        className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-6 border border-white/50 sticky top-24 z-10 transition-all duration-300 hover:shadow-xl hover:bg-white/98"
        role="complementary"
        aria-label="Filter options"
      >
        {/* Header with title and active filter count */}
        <div 
          data-testid="filters-header" 
          className="flex items-center justify-between mb-6"
        >
          <h3 
            data-testid="filters-title" 
            className="font-semibold text-lg"
          >
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span 
              data-testid="active-filters-badge"
              className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm"
            >
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        {/* Filters container with collapsible sections */}
        <div 
          data-testid="filters-container" 
          className="space-y-4"
        >
          {/* === DROPDOWN FILTERS SECTION === */}
          
          {/* Search & Basic Filters Section */}
          <FilterSection 
            id="search" 
            title="Search & Basic" 
            defaultOpen={true}
            count={sectionCounts.search}
          >
            {/* Search Input */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Search dogs..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 w-full"
                />
                {searchQuery && (
                  <Button
                    data-testid="search-clear-button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Organization Select */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Organization</label>
                <Select 
                  value={organizationFilter || 'any'} 
                  onValueChange={setOrganizationFilter}
                >
                  <SelectTrigger data-testid="organization-select">
                    <SelectValue>
                      {organizationFilter === 'any' || !organizationFilter 
                        ? 'Any Organization' 
                        : organizations.find(org => org.id?.toString() === organizationFilter)?.name || 'Any Organization'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem
                        key={org.id ?? "any"}
                        value={org.id != null ? org.id.toString() : "any"}
                      >
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterSection>
          
          {/* Breed Section */}
          <FilterSection 
            id="breed" 
            title="Breed" 
            defaultOpen={false}
            count={sectionCounts.breed}
          >
            <div className="space-y-3">
              {/* Breed Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  data-testid="breed-search-input"
                  type="text"
                  placeholder="Search breeds..."
                  value={breedInputValue}
                  onChange={handleBreedInputChange}
                  className="pl-10 w-full"
                />
                {breedInputValue && (
                  <Button
                    data-testid="breed-clear-button"
                    variant="ghost"
                    size="icon"
                    onClick={handleBreedClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Breed Suggestions - Show when user has typed something */}
              {filteredBreeds.length > 0 && (
                <div 
                  data-testid="breed-suggestions"
                  className="max-h-32 overflow-y-auto border rounded-md bg-white shadow-sm animate-in slide-in-from-top-2 duration-200"
                >
                  {/* Show filtered breed suggestions */}
                  {filteredBreeds.map(breed => (
                    <button
                      key={breed}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors duration-150 focus:bg-gray-100 focus:outline-none"
                      onClick={() => handleBreedSuggestionClick(breed)}
                    >
                      {breed}
                    </button>
                  ))}
                </div>
              )}
              {breedInputValue && breedInputValue.trim().length > 0 && filteredBreeds.length === 0 && (
                <div 
                  data-testid="breed-suggestions"
                  className="border rounded-md bg-white shadow-sm animate-in slide-in-from-top-2 duration-200"
                >
                  <div className="p-2 text-sm text-gray-500">
                    No breeds found for "{breedInputValue}"
                  </div>
                </div>
              )}
            </div>
          </FilterSection>
          
          {/* Ships to Country Section - Simplified from Location */}
          <FilterSection 
            id="ships-to-country" 
            title="Ships to Country" 
            defaultOpen={false}
            count={sectionCounts.shipsToCountry}
          >
            <div className="space-y-3">
              {/* Country Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  data-testid="country-search-input"
                  type="text"
                  placeholder="Search countries..."
                  className="pl-10 w-full"
                />
              </div>
              
              {/* Ships To Country Select */}
              <div>
                <Select 
                  value={availableCountryFilter} 
                  onValueChange={setAvailableCountryFilter}
                >
                  <SelectTrigger data-testid="ships-to-country-select">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {availableCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterSection>
          
          {/* === BUTTON/LOLLIPOP FILTERS SECTION === */}
          
          {/* Age Filter - Non-collapsible */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Age</h4>
              {sectionCounts.age > 0 && (
                <span className="inline-flex bg-orange-100 text-orange-700 px-2 rounded-full text-xs">
                  ({sectionCounts.age})
                </span>
              )}
            </div>
            <div 
              data-testid="age-button-grid"
              className="grid grid-cols-2 gap-2"
            >
              {ageOptions.map((age) => {
                const isActive = ageCategoryFilter === age;
                return (
                  <Button
                    key={age}
                    data-testid={`age-button-${age}`}
                    variant="outline"
                    onClick={() => setAgeCategoryFilter(age)}
                    className={`justify-start transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 hover:shadow-sm'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    {age}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Size Filter - Non-collapsible */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Size</h4>
              {sectionCounts.size > 0 && (
                <span className="inline-flex bg-orange-100 text-orange-700 px-2 rounded-full text-xs">
                  ({sectionCounts.size})
                </span>
              )}
            </div>
            <div 
              data-testid="size-button-grid"
              className="grid grid-cols-2 gap-2"
            >
              {sizeOptions.map((size) => {
                const isActive = sizeFilter === size;
                return (
                  <Button
                    key={size}
                    data-testid={`size-button-${size}`}
                    variant="outline"
                    onClick={() => setSizeFilter(size)}
                    className={`justify-start transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 hover:shadow-sm'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    {size}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Sex Filter - Non-collapsible Button Grid (New Lollipop Style) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Sex</h4>
              {sectionCounts.sex > 0 && (
                <span className="inline-flex bg-orange-100 text-orange-700 px-2 rounded-full text-xs">
                  ({sectionCounts.sex})
                </span>
              )}
            </div>
            <div 
              data-testid="sex-button-grid"
              className="grid grid-cols-3 gap-2"
            >
              {sexOptions.map((sex) => {
                const isActive = sexFilter === sex;
                return (
                  <Button
                    key={sex}
                    data-testid={`sex-button-${sex}`}
                    variant="outline"
                    onClick={() => setSexFilter(sex)}
                    className={`justify-center transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 hover:shadow-sm'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    {sex}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Clear all filters button */}
        {activeFilterCount > 0 && (
          <Button
            data-testid="clear-all-filters"
            variant="outline"
            className="w-full mt-6"
            onClick={resetFilters}
          >
            Clear All Filters
          </Button>
        )}
      </div>
    </aside>
  );
}