"use client"; // Needs client-side interactivity

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // <<< Import Input component
// --- NEW: Import unified Icon component ---
import { Icon } from "../ui/Icon";
// --- END NEW ---

// Define props expected by this component
// We pass state values and setters down from the parent page
export default function FilterControls({
  searchQuery,
  handleSearchChange,
  clearSearch, // Function to clear search
  // — Removed breedGroup props —
  // breedGroupFilter,
  // setBreedGroupFilter,
  // breedGroups,
  // — Added organization props —
  organizationFilter,
  setOrganizationFilter,
  organizations, // now array of {id,name}
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
  // --- NEW: Location Filter Props ---
  locationCountryFilter,
  setLocationCountryFilter,
  locationCountries,
  availableCountryFilter,
  setAvailableCountryFilter,
  availableCountries,
  availableRegionFilter,
  setAvailableRegionFilter,
  availableRegions,
  // --- END NEW ---
}) {
  return (
    // --- MODIFIED: Change grid to single column for vertical stacking ---
    <div className="grid grid-cols-1 gap-4" data-testid="filter-controls">
      {/* Search Input */}
      <div className="relative">
        {" "}
        {/* Removed col-span */}
        <label
          htmlFor="search-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          {/* Use Search icon */}
          <Icon name="search" size="small" className="mr-2" color="default" />
          Search
        </label>
        <Input
          id="search-filter"
          data-testid="search-input"
          type="text"
          placeholder="Name or breed..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pr-8" // Add padding for the clear button
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-500 hover:text-gray-700 mt-3" // Added mt-3 to align with input box
            aria-label="Clear search"
            data-testid="search-clear-button"
          >
            <Icon name="x" size="small" />
          </Button>
        )}
      </div>

      {/* New Rescue Organization Filter */}
      <div>
        <label
          htmlFor="organization-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="home" size="small" className="mr-2" color="default" />
          Rescue Organization
        </label>
        <Select
          value={organizationFilter}
          onValueChange={setOrganizationFilter}
        >
          <SelectTrigger
            id="organization-filter"
            data-testid="organization-select"
          >
            <SelectValue placeholder="Any organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem
                key={org.id ?? "any"}
                value={org.id != null ? org.id.toString() : "any"} // "any" = reset
              >
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Standardized Breed Filter */}
      <div>
        <label
          htmlFor="breed-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon
            name="paw-print"
            size="small"
            className="mr-2"
            color="default"
          />
          Breed
        </label>
        <Select
          value={standardizedBreedFilter}
          onValueChange={setStandardizedBreedFilter}
        >
          <SelectTrigger id="breed-filter" data-testid="breed-select">
            <SelectValue placeholder="Any breed" />
          </SelectTrigger>
          <SelectContent>
            {standardizedBreeds.map((breed) => (
              <SelectItem key={breed} value={breed}>
                {breed}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sex Filter */}
      <div>
        <label
          htmlFor="sex-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="tag" size="small" className="mr-2" color="default" />{" "}
          {/* Using Tag as placeholder */}
          Sex
        </label>
        <Select value={sexFilter} onValueChange={setSexFilter}>
          <SelectTrigger id="sex-filter" data-testid="sex-select">
            <SelectValue placeholder="Any sex" />
          </SelectTrigger>
          <SelectContent>
            {sexOptions.map((sex) => (
              <SelectItem key={sex} value={sex}>
                {sex}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size Filter */}
      <div>
        <label
          htmlFor="size-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="ruler" size="small" className="mr-2" color="default" />
          Size
        </label>
        <Select value={sizeFilter} onValueChange={setSizeFilter}>
          <SelectTrigger id="size-filter" data-testid="size-select">
            <SelectValue placeholder="Any size" />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Age Category Filter */}
      <div>
        <label
          htmlFor="age-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="calendar" size="small" className="mr-2" color="default" />
          Age
        </label>
        <Select value={ageCategoryFilter} onValueChange={setAgeCategoryFilter}>
          <SelectTrigger id="age-filter" data-testid="age-select">
            <SelectValue placeholder="Any age" />
          </SelectTrigger>
          <SelectContent>
            {ageOptions.map((age) => (
              <SelectItem key={age} value={age}>
                {age}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* --- NEW: Location Filters with Labels --- */}
      {/* Location Country Filter */}
      <div>
        <label
          htmlFor="location-country-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="map-pin" size="small" className="mr-2" color="default" />
          Located In
        </label>
        <Select
          value={locationCountryFilter}
          onValueChange={setLocationCountryFilter}
        >
          <SelectTrigger id="location-country-filter">
            <SelectValue placeholder="Any country" />
          </SelectTrigger>
          <SelectContent>
            {locationCountries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Available To Country Filter */}
      <div>
        <label
          htmlFor="available-country-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon name="globe" size="small" className="mr-2" color="default" />
          Adoptable to Country
        </label>
        <Select
          value={availableCountryFilter}
          onValueChange={setAvailableCountryFilter}
        >
          <SelectTrigger id="available-country-filter">
            <SelectValue placeholder="Any country" />
          </SelectTrigger>
          <SelectContent>
            {availableCountries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Available To Region Filter */}
      <div>
        <label
          htmlFor="available-region-filter"
          className="flex items-center text-sm font-medium text-gray-700 mb-1"
        >
          <Icon
            name="locate-fixed"
            size="small"
            className="mr-2"
            color="default"
          />
          Adoptable in Region
        </label>
        <Select
          value={availableRegionFilter}
          onValueChange={setAvailableRegionFilter}
          // Disable if no country is selected or only "Any country" is available
          disabled={
            !availableCountryFilter ||
            availableCountryFilter === "Any country" ||
            availableRegions.length <= 1
          }
        >
          <SelectTrigger id="available-region-filter">
            <SelectValue placeholder="Any region" />
          </SelectTrigger>
          <SelectContent>
            {availableRegions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* --- END NEW --- */}
    </div> // --- MODIFIED: Close the outer grid div ---
  );
}
