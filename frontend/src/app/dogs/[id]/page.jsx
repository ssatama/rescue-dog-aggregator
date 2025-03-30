"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';

export default function DogDetailPage() {
  const params = useParams();
  const dogId = params.id;
  
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      try {
        // This would be an API call in a production app
        // await fetch(`/api/dogs/${dogId}`)
        
        // Mock data
        const mockDog = {
          id: dogId,
          name: "Buddy",
          breed: "Golden Retriever",
          age_text: "2 years",
          sex: "Male",
          size: "Large",
          primary_image_url: null,
          adoption_url: "https://example.com/adopt/buddy",
          organization: "Pets in Turkey",
          location: "Izmir, Turkey",
          description: "Buddy is a friendly and energetic Golden Retriever who loves to play fetch and go for long walks. He's great with children and other dogs, and would make a perfect family pet. He's fully vaccinated, neutered, and ready to find his forever home.",
          additional_images: [null, null], // Placeholder for images
          properties: {
            neutered_spayed: "Yes",
            house_trained: "Yes",
            good_with_kids: "Yes",
            good_with_dogs: "Yes",
            good_with_cats: "Unknown",
            special_needs: "No"
          }
        };
        
        // Simulate delay
        setTimeout(() => {
          setDog(mockDog);
          setLoading(false);
        }, 800);
        
      } catch (err) {
        console.error("Error fetching dog data:", err);
        setError(true);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dogId]);

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading dog information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !dog) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Dog Not Found</h1>
            <p className="text-gray-700 mb-6">
              Sorry, we couldn't find the dog you're looking for. The dog may have been adopted or removed from our database.
            </p>
            <Link 
              href="/dogs" 
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Return to Dogs Catalog
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        {/* Back button with icon */}
        <Link 
          href="/dogs" 
          className="inline-flex items-center text-blue-500 hover:text-blue-700 transition-colors mb-6 group"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all dogs
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image gallery */}
          <div>
            <div className="bg-gray-200 h-80 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
              {dog.primary_image_url ? (
                <img 
                  src={dog.primary_image_url} 
                  alt={dog.name} 
                  className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-gray-400">No image available</div>
              )}
            </div>
            
            {/* Thumbnail images */}
            {dog.additional_images && dog.additional_images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {dog.additional_images.map((img, idx) => (
                  <div key={idx} className="bg-gray-200 h-20 rounded-lg flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img 
                        src={img} 
                        alt={`${dog.name} ${idx + 1}`} 
                        className="w-full h-full object-cover rounded-lg hover:scale-110 transition-transform duration-300 cursor-pointer"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">No image</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Dog details */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{dog.name}</h1>
            <p className="text-lg text-gray-600 mb-4">
              {dog.breed} • {dog.age_text} • {dog.sex}
            </p>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">From {dog.organization}</p>
              <p className="text-sm text-gray-500">{dog.location}</p>
            </div>
            
            {/* About section */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">About {dog.name}</h2>
              <p className="text-gray-700">{dog.description}</p>
            </div>
            
            {/* Characteristics */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Characteristics</h2>
              <div className="grid grid-cols-2 gap-y-2">
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Size:</span>
                  <span className="font-medium">{dog.size}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Neutered/Spayed:</span>
                  <span className="font-medium">{dog.properties.neutered_spayed}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">House Trained:</span>
                  <span className="font-medium">{dog.properties.house_trained}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Good with Kids:</span>
                  <span className="font-medium">{dog.properties.good_with_kids}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Good with Dogs:</span>
                  <span className="font-medium">{dog.properties.good_with_dogs}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Good with Cats:</span>
                  <span className="font-medium">{dog.properties.good_with_cats}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">Special Needs:</span>
                  <span className="font-medium">{dog.properties.special_needs}</span>
                </div>
              </div>
            </div>
            
            {/* Adoption button */}
            <a 
              href={dog.adoption_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Adopt {dog.name}
            </a>
            
            <p className="text-sm text-gray-500 mt-2 text-center">
              You will be taken to {dog.organization} website to complete the adoption process.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}