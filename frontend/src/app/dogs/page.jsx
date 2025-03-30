// src/app/dogs/page.jsx
"use client";

import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';
import Loading from '../../components/ui/Loading';
import { getDogs } from '../../services/dogsService';

export default function DogsPage() {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Function to fetch dogs
    const fetchDogs = async () => {
      try {
        setLoading(true);
        const data = await getDogs();
        setDogs(data);
        console.log("Dogs data:", data); // For debugging
      } catch (err) {
        console.error('Error fetching dogs:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDogs();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Rescue Dog</h1>
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>There was an error loading dogs. Please try again later.</p>
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <Loading />
        ) : dogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p>No dogs found.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}