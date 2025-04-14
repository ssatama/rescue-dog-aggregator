// rescue-dog-aggregator/frontend/src/components/dogs/FilterControls.jsx
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
import { PawPrint, Users, Tag, Ruler, Calendar } from 'lucide-react';
import { X } from 'lucide-react'; // Import X icon for clear button

// Define props expected by this component
// We pass state values and setters down from the parent page
export default function FilterControls({
  searchQuery,
  handleSearchChange,
  clearSearch, // Function to clear search
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
}) {
  return (
    <div className="space-y-4"> {/* Add spacing between elements */}
      {/* Search input - USING SHADCN/UI INPUT */}
      <div className="relative">
        {/* Search Icon (optional but recommended) */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {/* Replace <input> with Input */}
        <Input
          type="text"
          placeholder="Search by name or breed..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 pr-10" // Add padding for icon and clear button
          aria-label="Search dogs by name or breed"
        />
        {/* Clear button */}
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" // Position button inside input
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Grid of Select components */}
      {/* Use grid-cols-1 for stacking in sidebar/sheet */}
      <div className="grid grid-cols-1 gap-4">
        {/* Breed Group filter */}
        <div>
          <label htmlFor="breed-group-filter" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Users className="h-4 w-4 mr-2 text-gray-500" /> {/* Icon */}
            Breed Group
          </label>
          <Select value={breedGroupFilter} onValueChange={setBreedGroupFilter}>
            <SelectTrigger className="w-full" id="breed-group-filter">
              <SelectValue placeholder="Select breed group" />
            </SelectTrigger>
            <SelectContent>
              {breedGroups.map((group) => (
                <SelectItem key={group} value={group}>{group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Standardized Breed filter */}
        <div>
          <label htmlFor="breed-filter" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <PawPrint className="h-4 w-4 mr-2 text-gray-500" /> {/* Icon */}
            Breed
          </label>
          <Select value={standardizedBreedFilter} onValueChange={setStandardizedBreedFilter}>
            <SelectTrigger className="w-full" id="breed-filter">
              <SelectValue placeholder="Select breed" />
            </SelectTrigger>
            <SelectContent>
              {standardizedBreeds.map((breed) => (
                <SelectItem key={breed} value={breed}>{breed}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sex filter */}
        <div>
          <label htmlFor="sex-filter" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Tag className="h-4 w-4 mr-2 text-gray-500" /> {/* Icon (using Tag as placeholder) */}
            Sex
          </label>
          <Select value={sexFilter} onValueChange={setSexFilter}>
            <SelectTrigger className="w-full" id="sex-filter">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              {sexOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size filter */}
        <div>
          <label htmlFor="size-filter" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Ruler className="h-4 w-4 mr-2 text-gray-500" /> {/* Icon */}
            Size
          </label>
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="w-full" id="size-filter">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age filter */}
        <div>
          <label htmlFor="age-filter" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" /> {/* Icon */}
            Age
          </label>
          <Select value={ageCategoryFilter} onValueChange={setAgeCategoryFilter}>
            <SelectTrigger className="w-full" id="age-filter">
              <SelectValue placeholder="Select age" />
            </SelectTrigger>
            <SelectContent>
              {ageOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}