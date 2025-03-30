// src/app/organizations/[id]/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import DogCard from '../../../components/dogs/DogCard';
import Loading from '../../../components/ui/Loading';
import { getOrganizationById, getOrganizationDogs } from '../../../services/organizationsService';

export default function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params.id;
  
  const [organization, setOrganization] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch organization details
        const orgData = await getOrganizationById(organizationId);
        setOrganization(orgData);
        
        // Fetch dogs from this organization
        const dogsData = await getOrganizationDogs(organizationId);
        setDogs(dogsData);
        
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [organizationId]);
  
  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          <Loading />
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (error || !organization) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Organization Not Found</h1>
            <p className="text-gray-700 mb-6">
              Sorry, we couldn't find the organization you're looking for.
            </p>
            <Link 
              href="/organizations" 
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Return to Organizations
            </Link>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Prepare location text
  const locationText = [organization.city, organization.country].filter(Boolean).join(', ');
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4">
        <Link href="/organizations" className="flex items-center text-blue-500 mb-6 hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Organizations
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          {/* Organization details section */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            {/* Logo with fallback */}
            <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {organization.logo_url ? (
                <img 
                  src={organization.logo_url} 
                  alt={`${organization.name} logo`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-blue-500">
                  {organization.name.charAt(0)}
                </span>
              )}
            </div>
            
            {/* Organization title and location */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{organization.name}</h1>
              {locationText && (
                <p className="text-gray-600 mb-2">{locationText}</p>
              )}
              
              {/* Website link */}
              {organization.website_url && (
                <a 
                  href={organization.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-blue-500 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          </div>
          
          {/* Description */}
          <div className="border-t pt-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-gray-700">{organization.description || "No detailed description available for this organization."}</p>
          </div>
          
          {/* Contact Information (if available in properties) */}
          {organization.properties && (
            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
              <div className="space-y-2">
                {organization.properties.email && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${organization.properties.email}`} className="text-blue-500 hover:underline">
                      {organization.properties.email}
                    </a>
                  </div>
                )}
                
                {organization.properties.phone && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${organization.properties.phone}`} className="text-blue-500 hover:underline">
                      {organization.properties.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Dogs section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Available Dogs</h2>
          </div>
          
          {dogs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {dogs.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs currently available</h3>
              <p className="text-gray-600">This organization doesn't have any dogs listed for adoption at the moment.</p>
            </div>
          )}
        </div>
        
        {/* Call to action */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-xl font-bold text-blue-800 mb-3">Want to help?</h3>
          <p className="text-blue-700 mb-4">
            {organization.name} is always looking for volunteers, foster homes, and donations to support their rescue efforts.
          </p>
          <a 
            href={organization.website_url || "#"} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Learn How to Support
          </a>
        </div>
      </div>
    </Layout>
  );
}