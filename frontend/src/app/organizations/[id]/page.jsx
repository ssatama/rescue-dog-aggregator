"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import DogCard from '../../../components/dogs/DogCard';

export default function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params.id;
  
  const [organization, setOrganization] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Enhanced mock data with all fields
    const mockOrganization = {
      id: organizationId,
      name: "Pets in Turkey",
      location: "Izmir, Turkey",
      description: "A non-profit dog rescue organization in Turkey that rescues and rehomes street dogs. Founded by a passionate group of animal lovers, they work tirelessly to provide medical care, shelter, and forever homes for dogs in need.",
      logoUrl: null,
      websiteUrl: "https://www.petsinturkey.org",
      contactEmail: "contact@petsinturkey.example.org",
      contactPhone: "+90 555 123 4567",
      yearEstablished: 2015,
      socialMedia: {
        facebook: "https://facebook.com/petsinturkey",
        instagram: "https://instagram.com/petsinturkey",
        twitter: null // Example of a missing social link
      }
    };
    
    // Mock dogs for this organization
    const mockDogs = [
      { id: 101, name: "Buddy", breed: "Golden Retriever", age_text: "2 years", sex: "Male", primary_image_url: null },
      { id: 102, name: "Luna", breed: "German Shepherd", age_text: "1 year", sex: "Female", primary_image_url: null },
      { id: 103, name: "Max", breed: "Labrador", age_text: "3 years", sex: "Male", primary_image_url: null },
      { id: 104, name: "Bella", breed: "Beagle", age_text: "4 years", sex: "Female", primary_image_url: null },
      { id: 105, name: "Charlie", breed: "Poodle", age_text: "2 years", sex: "Male", primary_image_url: null },
    ];
    
    // Simple timeout to simulate API call
    setTimeout(() => {
      setOrganization(mockOrganization);
      setDogs(mockDogs);
      setLoading(false);
    }, 800);
  }, [organizationId]);
  
  // Enhanced loading state with skeleton
  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          {/* Skeleton for organization info */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              {/* Logo skeleton */}
              <div className="w-32 h-32 rounded-full bg-gray-200"></div>
              
              {/* Info skeleton */}
              <div className="flex-1">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            
            {/* Description skeleton */}
            <div className="border-t pt-4 mb-4">
              <div className="h-6 bg-gray-200 rounded w-1/6 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            
            {/* Contact info skeleton */}
            <div className="border-t pt-4">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            </div>
          </div>
          
          {/* Dogs section skeleton */}
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }
  
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
          {/* Logo section with organization details */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            {/* Logo with fallback */}
            <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {organization.logoUrl ? (
                <img 
                  src={organization.logoUrl} 
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
              <p className="text-gray-600 mb-2">{organization.location}</p>
              
              {/* Year established (conditional) */}
              {organization.yearEstablished && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Established:</span> {organization.yearEstablished}
                </p>
              )}
              
              {/* Website link */}
              <a 
                href={organization.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center text-blue-500 hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </a>
            </div>
          </div>
          
          {/* Description */}
          <div className="border-t pt-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-gray-700">{organization.description}</p>
          </div>
          
          {/* Contact Information Section */}
          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
            <div className="space-y-2">
              {organization.contactEmail && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${organization.contactEmail}`} className="text-blue-500 hover:underline">
                    {organization.contactEmail}
                  </a>
                </div>
              )}
              
              {organization.contactPhone && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${organization.contactPhone}`} className="text-blue-500 hover:underline">
                    {organization.contactPhone}
                  </a>
                </div>
              )}
              
              {/* Social Media Links */}
              {organization.socialMedia && (
                <div className="mt-3">
                  <p className="text-gray-700 mb-2">Follow on social media:</p>
                  <div className="flex space-x-3">
                    {organization.socialMedia.facebook && (
                      <a 
                        href={organization.socialMedia.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        aria-label="Facebook"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                        </svg>
                      </a>
                    )}
                    
                    {organization.socialMedia.instagram && (
                      <a 
                        href={organization.socialMedia.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-800"
                        aria-label="Instagram"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428.247-.667.642-1.272 1.153-1.772a4.91 4.91 0 011.772-1.153c.637-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.04 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.398.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.04.058 2.67 0 2.986-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.04 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.04-.058zm0 3.064a5.133 5.133 0 110 10.267 5.133 5.133 0 010-10.267zm0 8.468a3.334 3.334 0 100-6.668 3.334 3.334 0 000 6.668zm6.538-8.669a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/>
                        </svg>
                      </a>
                    )}
                    
                    {organization.socialMedia.twitter && (
                      <a 
                        href={organization.socialMedia.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-600"
                        aria-label="Twitter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22 5.8a8.49 8.49 0 01-2.36.64 4.13 4.13 0 001.81-2.27 8.21 8.21 0 01-2.61 1 4.1 4.1 0 00-7 3.74 11.64 11.64 0 01-8.45-4.29 4.16 4.16 0 001.27 5.49 4.09 4.09 0 01-1.86-.52v.05a4.1 4.1 0 003.3 4 4.1 4.1 0 01-1.85.07 4.11 4.11 0 003.83 2.85A8.22 8.22 0 012 18.8a11.57 11.57 0 006.29 1.85c7.55 0 11.67-6.25 11.67-11.67 0-.17 0-.35-.02-.52A8.32 8.32 0 0022 5.8z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Dogs section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Available Dogs</h2>
            {/* Filter toggle could be added here in the future */}
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
            href={organization.websiteUrl} 
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