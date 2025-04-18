"use client"; // Add this if not already present

import { useState, useEffect } from 'react'; // Import hooks
import Layout from '../components/layout/Layout';
import Link from 'next/link';
import DogCard from '../components/dogs/DogCard'; // Import DogCard
import Loading from '../components/ui/Loading'; // Import Loading
import { Button } from '@/components/ui/button'; // Import Button (optional, for retry)
import { getRandomAnimals } from '../services/animalsService'; // Import the new service function
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { getOrganizations } from '../services/organizationsService'; // new

export default function Home() {
  const [featuredDogs, setFeaturedDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizationFilter, setOrganizationFilter] = useState("Any organization");
  const [organizations, setOrganizations] = useState([]);

  const fetchFeaturedDogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRandomAnimals(3); // Fetch 3 random dogs
      setFeaturedDogs(data);
    } catch (err) {
      console.error("Error fetching featured dogs:", err);
      setError("Could not load featured dogs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedDogs();
  }, []); // Fetch on initial mount

  // --- Fetch Organizations ---
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(["Any organization", ...orgs]);
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
      }
    };
    fetchOrgs();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Added padding */}
        {/* Hero Section */}
        <div className="text-center my-12 md:my-20"> {/* Adjusted vertical margin */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"> {/* Removed lg:text-6xl */}
            Find Your Perfect Rescue Companion
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto"> {/* Adjusted text color */}
            Browse available dogs from multiple rescue organizations, all in one place. Give a loving home to a dog in need.
          </p>
          <Link href="/dogs" passHref>
            <Button size="lg"> {/* Button is now inside Link */}
              Browse All Dogs
            </Button>
          </Link>
        </div>

        {/* Featured Dogs Section */}
        <div className="my-12 md:my-20"> {/* Added section spacing */}
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Featured Dogs Waiting for a Home
          </h2>

          {/* Loading State */}
          {loading && <Loading />}

          {/* Error State */}
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

          {/* Dog Cards Grid */}
          {!loading && !error && featuredDogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"> {/* Responsive grid */}
              {featuredDogs.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </div>
          )}

          {/* No Dogs State (Optional, if API might return empty) */}
          {!loading && !error && featuredDogs.length === 0 && (
             <p className="text-center text-gray-500">No featured dogs available at the moment.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}