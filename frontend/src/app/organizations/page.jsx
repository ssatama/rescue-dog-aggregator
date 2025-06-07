// src/app/organizations/page.jsx
"use client";

import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import OrganizationCard from '../../components/organizations/OrganizationCard';
import Loading from '../../components/ui/Loading';
import { getOrganizations } from '../../services/organizationsService';
import { reportError } from '../../utils/logger';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const data = await getOrganizations();
        setOrganizations(data);
      } catch (err) {
        reportError('Error fetching organizations', { error: err.message });
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Rescue Organizations</h1>
        <p className="text-lg text-gray-600 mb-8">
          These organizations work tirelessly to rescue and rehome dogs. By adopting through them, 
          you're supporting their mission to save more animals.
        </p>
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>There was an error loading organizations. Please try again later.</p>
            <button
              onClick={() => fetchOrganizations()}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <Loading />
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Organizations Found</h3>
            <p className="text-gray-600">We couldn't find any rescue organizations in our database.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}