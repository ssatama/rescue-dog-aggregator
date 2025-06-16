"use client";

import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Link from 'next/link';
import DogCard from '../components/dogs/DogCard';
import DogCardErrorBoundary from '../components/error/DogCardErrorBoundary';
import Loading from '../components/ui/Loading';
import { Button } from '@/components/ui/button';
import { getRandomAnimals } from '../services/animalsService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOrganizations } from '../services/organizationsService';
import { reportError } from '../utils/logger';
import { preloadImages } from '../utils/imageUtils';
import HeroSection from '../components/home/HeroSection';

export default function HomeClient() {
  const [featuredDogs, setFeaturedDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizationFilter, setOrganizationFilter] = useState("Any organization");
  const [organizations, setOrganizations] = useState([]);

  const fetchFeaturedDogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRandomAnimals(3);
      setFeaturedDogs(data);
      
      if (data && data.length > 0) {
        const imageUrls = data.map(dog => dog.primary_image_url).filter(Boolean);
        preloadImages(imageUrls);
      }
    } catch (err) {
      reportError("Error fetching featured dogs", { error: err.message });
      setError("Could not load featured dogs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedDogs();
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(["Any organization", ...orgs]);
      } catch (err) {
        reportError("Failed to fetch organizations", { error: err.message });
      }
    };
    fetchOrgs();
  }, []);

  return (
    <Layout>
      {/* Hero Section with Statistics */}
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="my-12 md:my-20">
          <h2 className="text-section text-center text-gray-900 mb-10">
            Featured Dogs Waiting for a Home
          </h2>

          {loading && <Loading />}

          {error && !loading && (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <Button variant="link" size="sm" onClick={fetchFeaturedDogs} className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!loading && !error && featuredDogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredDogs.map((dog, index) => (
                <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
                  <DogCard dog={dog} priority={index === 0} />
                </DogCardErrorBoundary>
              ))}
            </div>
          )}

          {!loading && !error && featuredDogs.length === 0 && (
             <p className="text-center text-body text-gray-500">No featured dogs available at the moment.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}