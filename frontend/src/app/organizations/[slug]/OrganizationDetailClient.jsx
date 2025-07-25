"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import DogsGrid from '../../../components/dogs/DogsGrid';
import DogFilters from '../../../components/filters/DogFilters';
import OrganizationHero from '../../../components/organizations/OrganizationHero';
import MobileFilterDrawer from '../../../components/filters/MobileFilterDrawer';
import useFilteredDogs from '../../../hooks/useFilteredDogs';
import { getDefaultFilters } from '../../../utils/dogFilters';
import { Button } from '../../../components/ui/button';
import { getOrganizationBySlug, getOrganizationDogs } from '../../../services/organizationsService';
import { reportError } from '../../../utils/logger';

export default function OrganizationDetailClient({ params = {} }) {
  const urlParams = useParams();
  const searchParams = useSearchParams();
  const organizationSlug = params?.slug || urlParams?.slug;
  
  const [organization, setOrganization] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalDogs, setTotalDogs] = useState(0);
  
  // Filter state management (only age, breed, sort for organization pages)
  const [filters, setFilters] = useState(() => {
    // Initialize filters from URL parameters or defaults (no shipsTo for org pages)
    const defaultFilters = getDefaultFilters();
    return {
      age: searchParams?.get('age') || defaultFilters.age,
      breed: searchParams?.get('breed') || defaultFilters.breed,
      sort: searchParams?.get('sort') || defaultFilters.sort
    };
  });
  
  // Since we're now filtering on the backend, use dogs directly
  // But keep useFilteredDogs for availableBreeds extraction
  const {
    availableBreeds
  } = useFilteredDogs(dogs, { age: 'All', breed: '', sort: 'newest' }, false);
  
  // Use dogs directly since they're already filtered by the backend
  const filteredDogs = dogs;
  const hasActiveFilters = (filters.age && filters.age !== 'All') || 
                          (filters.breed && filters.breed.trim() !== '');
  
  
  // Ships To filter not needed for organization pages - all dogs have same shipping options
  
  // Mobile filter handlers
  const handleMobileFilterOpen = () => {
    setIsMobileFilterOpen(true);
  };

  const handleMobileFilterClose = () => {
    setIsMobileFilterOpen(false);
  };

  const handleClearAllFilters = () => {
    const defaultFilters = getDefaultFilters();
    setFilters({
      age: defaultFilters.age,
      breed: defaultFilters.breed,
      sort: defaultFilters.sort
    });
  };
  
  // Fetch organization dogs with pagination and filtering
  const fetchOrganizationDogs = useCallback(async (currentPage = 1, loadMore = false) => {
    if (!loadMore) {
      setLoading(true);
      setDogs([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    const limit = 20;
    const offset = (currentPage - 1) * limit;

    // Build API filter parameters from current filters
    const apiParams = {
      limit,
      offset
    };

    // Add age filter if selected
    if (filters.age && filters.age !== 'All') {
      apiParams.age_category = filters.age;
    }

    // Add breed filter if selected
    if (filters.breed && filters.breed.trim() !== '') {
      apiParams.standardized_breed = filters.breed;
    }

    try {
      const dogsData = await getOrganizationDogs(organization?.id, apiParams);
      
      setDogs(prevDogs => loadMore ? [...prevDogs, ...dogsData] : dogsData);
      setHasMore(dogsData.length === limit);
      setPage(currentPage);
      setLoading(false);
      setLoadingMore(false);

    } catch (err) {
      reportError('Error fetching organization dogs', { error: err.message, organizationId: organization?.id });
      setError(err);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [organization?.id, filters]);


  // Handle Load More
  const handleLoadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      fetchOrganizationDogs(page + 1, true);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationSlug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch organization details
        const orgData = await getOrganizationBySlug(organizationSlug);
        setOrganization(orgData);
        setTotalDogs(orgData.total_dogs || 0);
        
        // Fetch first page of dogs using the organization ID
        const limit = 20;
        const apiParams = { limit, offset: 0 };
        
        // Add current filters
        if (filters.age && filters.age !== 'All') {
          apiParams.age_category = filters.age;
        }
        if (filters.breed && filters.breed.trim() !== '') {
          apiParams.standardized_breed = filters.breed;
        }
        
        const dogsData = await getOrganizationDogs(orgData.id, apiParams);
        setDogs(dogsData);
        setHasMore(dogsData.length === limit);
        setPage(1);
        setLoading(false);
        
      } catch (err) {
        reportError('Error fetching organization data', { error: err.message, organizationSlug });
        setError(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [organizationSlug, filters]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [filters]);
  
  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          {/* Hero skeleton */}
          <div className="bg-gradient-to-r from-amber-100 dark:from-amber-900/20 to-orange-200 dark:to-orange-900/30 rounded-lg p-8 mb-8">
            <div className="animate-pulse">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="space-y-3 flex-1">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Dogs grid skeleton */}
          <DogsGrid loading={true} skeletonCount={8} />
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (error || !organization) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-4">Organization Not Found</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Sorry, we couldn't find the organization you're looking for.
            </p>
            <Link 
              href="/organizations" 
              className="inline-block bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Return to Organizations
            </Link>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      {/* New OrganizationHero Component */}
      <OrganizationHero organization={organization} />
      
      <div className="max-w-7xl mx-auto p-4">
        {/* Contact Information (if available in properties) */}
        {organization.properties && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact Information</h2>
            <div className="space-y-2">
              {organization.properties.email && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${organization.properties.email}`} className="text-orange-500 dark:text-orange-400 hover:underline">
                    {organization.properties.email}
                  </a>
                </div>
              )}
              
              {organization.properties.phone && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${organization.properties.phone}`} className="text-orange-500 dark:text-orange-400 hover:underline">
                    {organization.properties.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Dogs section with filters */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Available Dogs</h2>
          </div>
          
          {/* Filter System - only age, breed, sort for organization pages */}
          {!loading && dogs.length > 0 && (
            <DogFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableBreeds={availableBreeds}
              hasActiveFilters={hasActiveFilters}
              showShipsToFilter={false}
              onMobileFilterClick={handleMobileFilterOpen}
            />
          )}
          
          {/* Dogs Grid with filtered results */}
          <div className="mt-6">
            <DogsGrid 
              dogs={filteredDogs} 
              loading={loading}
              loadingType="initial"
              emptyStateVariant={hasActiveFilters ? "noDogsFiltered" : "noDogsOrganization"}
              onClearFilters={() => setFilters(getDefaultFilters())}
              onBrowseOrganizations={() => window.location.href = '/organizations'}
            />
            
            {/* Load More Button */}
            {hasMore && !loading && !loadingMore && (
              <div className="text-center mt-8 mb-12">
                <button
                  data-testid="load-more-button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load More Dogs →
                </button>
              </div>
            )}
            
            {/* Loading More State */}
            {loadingMore && (
              <DogsGrid 
                dogs={[]}
                loading={true}
                loadingType="pagination"
                skeletonCount={6}
                className="mt-8"
              />
            )}
          </div>
        </div>
        
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={handleMobileFilterClose}
        // Basic props for organization page (limited filters)
        searchQuery=""
        handleSearchChange={() => {}}
        clearSearch={() => {}}
        organizationFilter="any"
        setOrganizationFilter={() => {}}
        organizations={[]}
        standardizedBreedFilter={filters.breed || 'Any breed'}
        setStandardizedBreedFilter={(breed) => setFilters(prev => ({ ...prev, breed }))}
        standardizedBreeds={availableBreeds}
        sexFilter="Any"
        setSexFilter={() => {}}
        sexOptions={['Any']}
        sizeFilter="Any size"
        setSizeFilter={() => {}}
        sizeOptions={['Any size']}
        ageCategoryFilter={filters.age || 'Any age'}
        setAgeCategoryFilter={(age) => setFilters(prev => ({ ...prev, age }))}
        ageOptions={['Any age', 'Puppy', 'Young', 'Adult', 'Senior']}
        availableCountryFilter="Any country"
        setAvailableCountryFilter={() => {}}
        availableCountries={['Any country']}
        resetFilters={handleClearAllFilters}
        filterCounts={null}
      />
    </Layout>
  );
}