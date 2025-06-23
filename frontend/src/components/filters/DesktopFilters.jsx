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
import { Icon } from '../ui/Icon';

/**
 * Enhanced FilterSection component with custom collapse animations
 */
function FilterSection({ id, title, defaultOpen = false, children, count = 0 }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = useCallback((e) => {
    e.preventDefault(); // Prevent default details toggle
    setIsOpen(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(e);
    }
  }, [handleToggle]);

  const hasActiveFilters = count > 0;

  return (
    <details 
      data-testid={`filter-section-${id}`}
      data-open={isOpen}
      className={`filter-section overflow-hidden will-change-transform group ${
        hasActiveFilters ? 'filter-section-active' : ''
      } ${!isOpen ? 'collapsed' : ''}`}
      aria-label={`${title} filters section`}
      open={isOpen}
    >
      <summary 
        data-testid={`filter-summary-${id}`}
        className="flex items-center justify-between cursor-pointer py-3 px-4 hover:bg-gray-50/50 rounded-lg transition-all duration-200 ease-out interactive-enhanced btn-focus-ring"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-expanded={isOpen}
        role="button"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">{title}</span>
          {count > 0 && (
            <span className="inline-flex bg-orange-100 text-orange-700 px-2 rounded-full text-xs">
              ({count})
            </span>
          )}
        </div>
        <Icon 
          name="chevron-down"
          size="small"
          data-testid={`chevron-icon-${id}`}
          className={`text-gray-500 chevron-icon transition-transform duration-200 ease-out ${
            isOpen ? 'chevron-open' : ''
          } group-open:rotate-180`}
        />
      </summary>
      <div 
        data-testid={`filter-content-${id}`}
        className="filter-section-content transition-opacity transition-transform duration-200 ease-out will-change-transform mt-3 space-y-3 px-4 pb-2"
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
      className="hidden lg:block w-72 shrink-0"
    >
      <div 
        data-testid="desktop-filters-panel"
        className="bg-orange-50/50 backdrop-blur-md rounded-xl shadow-xl p-6 border border-orange-100/30 sticky top-24 z-10 cross-browser-transition cross-browser-will-change hover:shadow-xl hover:bg-orange-50/60 transition-colors duration-200"
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
            className="text-lg font-semibold text-gray-900"
          >
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span 
              data-testid="active-filters-badge"
              className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-sm font-medium"
            >
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        {/* Filters container with collapsible sections */}
        <div 
          data-testid="filters-container" 
          className="space-y-6"
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
              <div className="relative input-container form-enhanced">
                <Icon name="search" size="small" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Search dogs..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 w-full enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                />
                {searchQuery && (
                  <Button
                    data-testid="search-clear-button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 interactive-enhanced btn-focus-ring"
                  >
                    <Icon name="x" size="small" />
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
                  <SelectTrigger 
                    data-testid="organization-select"
                    className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                  >
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
              <div className="relative input-container form-enhanced">
                <Icon name="search" size="small" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  data-testid="breed-search-input"
                  type="text"
                  placeholder="Search breeds..."
                  value={breedInputValue}
                  onChange={handleBreedInputChange}
                  className="pl-10 w-full enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                />
                {breedInputValue && (
                  <Button
                    data-testid="breed-clear-button"
                    variant="ghost"
                    size="icon"
                    onClick={handleBreedClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 interactive-enhanced btn-focus-ring"
                  >
                    <Icon name="x" size="small" />
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
              <div className="relative input-container form-enhanced">
                <Icon name="search" size="small" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  data-testid="country-search-input"
                  type="text"
                  placeholder="Search countries..."
                  className="pl-10 w-full enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                />
              </div>
              
              {/* Ships To Country Select */}
              <div>
                <Select 
                  value={availableCountryFilter} 
                  onValueChange={setAvailableCountryFilter}
                >
                  <SelectTrigger 
                    data-testid="ships-to-country-select"
                    className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                  >
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
          <div className={`space-y-3 ${sectionCounts.age > 0 ? 'filter-section-active' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Age</h4>
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
                    className={`justify-start cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 cross-browser-shadow' 
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
          <div className={`space-y-3 ${sectionCounts.size > 0 ? 'filter-section-active' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Size</h4>
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
                    className={`justify-start cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 cross-browser-shadow' 
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
          <div className={`space-y-3 ${sectionCounts.sex > 0 ? 'filter-section-active' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Sex</h4>
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
                    className={`justify-center cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 cross-browser-shadow' 
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
          <button
            data-testid="clear-all-filters"
            className="w-full mt-6 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium py-2 px-4 rounded-lg transition-colors duration-200 interactive-enhanced enhanced-focus-button focus:ring-2 focus:ring-orange-600"
            onClick={resetFilters}
          >
            Clear All Filters
          </button>
        )}
      </div>
    </aside>
  );
}