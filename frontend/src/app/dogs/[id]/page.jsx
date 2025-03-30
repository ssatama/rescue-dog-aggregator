"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import Loading from '../../../components/ui/Loading';
import { getDogById } from '../../../services/dogsService';

export default function DogDetailPage() {
  const params = useParams();
  const dogId = params.id;
  
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchDogData = async () => {
      try {
        setLoading(true);
        const data = await getDogById(dogId);
        console.log("Dog data:", data); // For debugging
        setDog(data);
      } catch (err) {
        console.error("Error fetching dog data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDogData();
  }, [dogId]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error || !dog) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-red-700">Dog Not Found</h2>
            <p>Sorry, we couldn't find the dog you're looking for.</p>
            <Link href="/dogs" className="mt-4 inline-block text-blue-500 hover:underline">
              Return to dogs listing
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <Link 
          href="/dogs" 
          className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-6"
        >
          ← Back to all dogs
        </Link>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-4">{dog.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {dog.primary_image_url ? (
                <img 
                  src={dog.primary_image_url} 
                  alt={dog.name} 
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-lg mb-2">
                <span className="font-semibold">Breed:</span> {dog.breed || 'Unknown'}
              </p>
              <p className="text-lg mb-2">
                <span className="font-semibold">Age:</span> {dog.age_text || 'Unknown'}
              </p>
              <p className="text-lg mb-2">
                <span className="font-semibold">Sex:</span> {dog.sex || 'Unknown'}
              </p>
              <p className="text-lg mb-2">
                <span className="font-semibold">Size:</span> {dog.size || 'Unknown'}
              </p>
              
              <div className="mt-6">
                <a 
                  href={dog.adoption_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Adopt {dog.name}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}