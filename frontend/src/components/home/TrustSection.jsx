"use client";

import React, { useState, useEffect } from 'react';
import { getStatistics } from '../../services/animalsService';
import OrganizationLink from '../ui/OrganizationLink';
import { reportError } from '../../utils/logger';
import { Button } from '@/components/ui/button';

/**
 * Trust section displaying platform statistics and organization links
 * Shows total dogs, organizations, countries with expandable organization list
 */
export default function TrustSection() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllOrganizations, setShowAllOrganizations] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStatistics();
        setStatistics(data);
      } catch (err) {
        reportError('Error fetching trust section statistics', { error: err.message });
        setError('Unable to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <section 
        role="region" 
        aria-label="Platform statistics and organizations"
        className="py-16 bg-gray-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-testid="trust-loading" className="text-center">
            <div className="animate-pulse space-y-8">
              {/* Statistics skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[1, 2, 3].map(i => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-12 w-20 bg-gray-200 rounded mx-auto mb-2"></div>
                    <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
                  </div>
                ))}
              </div>
              
              {/* Organizations skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-6 w-48 bg-gray-200 rounded mx-auto"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section 
        role="region" 
        aria-label="Platform statistics and organizations"
        className="py-16 bg-gray-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!statistics) {
    return null;
  }

  const { total_dogs, total_organizations, total_countries, organizations = [] } = statistics;
  
  // Show top 4 organizations initially, rest when expanded
  const visibleOrganizations = showAllOrganizations 
    ? organizations 
    : organizations.slice(0, 4);
  
  const remainingCount = organizations.length - 4;

  return (
    <section 
      data-testid="trust-section"
      role="region" 
      aria-label="Platform statistics and organizations"
      className="py-16 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          {/* Organizations Stat */}
          <div className="text-center">
            <div 
              data-testid="organizations-icon"
              className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 8a1 1 0 011-1h4a1 1 0 011 1v4H7v-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {total_organizations}
            </div>
            <div className="text-lg text-gray-600">
              Rescue Organizations
            </div>
          </div>

          {/* Dogs Stat */}
          <div className="text-center">
            <div 
              data-testid="dogs-icon"
              className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM4 8a1 1 0 000 2h1a1 1 0 100-2H4zm0 4a1 1 0 100 2h1a1 1 0 100-2H4zm4-4a1 1 0 000 2h1a1 1 0 100-2H8zm0 4a1 1 0 100 2h1a1 1 0 100-2H8zm4-4a1 1 0 000 2h1a1 1 0 100-2h-1zm0 4a1 1 0 100 2h1a1 1 0 100-2h-1z"/>
              </svg>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {total_dogs}
            </div>
            <div className="text-lg text-gray-600">
              Dogs Available
            </div>
          </div>

          {/* Countries Stat */}
          <div className="text-center">
            <div 
              data-testid="countries-icon"
              className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {total_countries}
            </div>
            <div className="text-lg text-gray-600">
              Countries
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Dogs available from these organizations:
          </h2>
          
          <div className="space-y-3 mb-6">
            {visibleOrganizations.map((org) => (
              <div key={org.id} className="inline-block mx-3">
                <OrganizationLink organization={org} />
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {!showAllOrganizations && remainingCount > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowAllOrganizations(true)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              + {remainingCount} more organizations
            </Button>
          )}

          {/* Show Less Button */}
          {showAllOrganizations && (
            <Button
              variant="ghost"
              onClick={() => setShowAllOrganizations(false)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 mt-4"
            >
              Show less
            </Button>
          )}
        </div>

      </div>
    </section>
  );
}