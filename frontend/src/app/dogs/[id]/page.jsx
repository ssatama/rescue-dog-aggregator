// src/app/dogs/[id]/page.jsx
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

  // Format age in a more readable way
  const formatAge = (dog) => {
    if (dog.age_min_months) {
      if (dog.age_min_months < 12) {
        return `${dog.age_min_months} month${dog.age_min_months === 1 ? '' : 's'} old`;
      } else {
        const years = Math.floor(dog.age_min_months / 12);
        const months = dog.age_min_months % 12;
        if (months === 0) {
          return `${years} year${years === 1 ? '' : 's'} old`;
        } else {
          return `${years} year${years === 1 ? '' : 's'}, ${months} month${months === 1 ? '' : 's'} old`;
        }
      }
    }
    return dog.age_text || 'Unknown age';
  };

  // Get size category color
  const getSizeColor = (size) => {
    if (!size) return 'bg-gray-100 text-gray-800';
    
    switch(size.toLowerCase()) {
      case 'tiny': return 'bg-indigo-100 text-indigo-800';
      case 'small': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'large': return 'bg-orange-100 text-orange-800';
      case 'xlarge':
      case 'extra large': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Dog status banner */}
          {dog.status && dog.status !== 'available' && (
            <div className={`w-full py-2 text-center text-white font-semibold 
              ${dog.status === 'adopted' ? 'bg-gray-600' : 'bg-yellow-500'}`}>
              {dog.status.charAt(0).toUpperCase() + dog.status.slice(1)}
            </div>
          )}
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image column */}
              <div className="md:w-1/2">
                {dog.primary_image_url ? (
                  <img 
                    src={dog.primary_image_url} 
                    alt={dog.name} 
                    className="w-full h-64 md:h-80 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 md:h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
                
                {/* Additional images */}
                {dog.images && dog.images.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {dog.images.slice(0, 4).map((image, index) => (
                      <img 
                        key={image.id || index} 
                        src={image.image_url} 
                        alt={`${dog.name} - photo ${index + 1}`}
                        className="w-full h-16 object-cover rounded-md"
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Details column */}
              <div className="md:w-1/2">
                <h1 className="text-3xl font-bold mb-2">{dog.name}</h1>
                
                {/* Breed information */}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-700">Breed</h2>
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-gray-800">
                      {dog.standardized_breed || dog.breed || 'Unknown'}
                    </span>
                    
                    {/* If we have both standardized and original breed, show original in muted text */}
                    {dog.standardized_breed && dog.breed && dog.standardized_breed !== dog.breed && (
                      <span className="text-sm text-gray-500 ml-2">
                        (originally listed as: {dog.breed})
                      </span>
                    )}
                  </div>
                  
                  {/* Breed group */}
                  {dog.breed_group && dog.breed_group !== 'Unknown' && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded mt-1">
                      {dog.breed_group} Group
                    </span>
                  )}
                </div>
                
                {/* Main attributes */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
                  {/* Age */}
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Age</h2>
                    <p className="text-gray-800">{formatAge(dog)}</p>
                  </div>
                  
                  {/* Sex */}
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Sex</h2>
                    <div className="flex items-center">
                      {dog.sex?.toLowerCase() === 'male' ? (
                        <>
                          <span className="text-blue-500 mr-1">♂</span>
                          <span>Male</span>
                        </>
                      ) : dog.sex?.toLowerCase() === 'female' ? (
                        <>
                          <span className="text-pink-500 mr-1">♀</span>
                          <span>Female</span>
                        </>
                      ) : (
                        <span>Unknown</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Size */}
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Size</h2>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-sm ${getSizeColor(dog.standardized_size || dog.size)}`}>
                        {dog.standardized_size || dog.size || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Weight (if available) */}
                  {dog.properties?.weight && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Weight</h2>
                      <p className="text-gray-800">{dog.properties.weight}</p>
                    </div>
                  )}
                  
                  {/* Neutered/Spayed status (if available) */}
                  {dog.properties?.neutered_spayed && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        {dog.sex?.toLowerCase() === 'female' ? 'Spayed' : 'Neutered'}
                      </h2>
                      <p className="text-gray-800">{dog.properties.neutered_spayed}</p>
                    </div>
                  )}
                </div>
                
                {/* Description */}
                {dog.properties?.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">About {dog.name}</h2>
                    <p className="text-gray-600">{dog.properties.description}</p>
                  </div>
                )}
                
                {/* Adoption button */}
                {dog.status === 'available' && (
                  <a 
                    href={dog.adoption_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded"
                  >
                    Adopt {dog.name}
                  </a>
                )}
                
                {/* Link to organization */}
                {dog.organization_id && (
                  <div className="mt-4 text-center">
                    <Link 
                      href={`/organizations/${dog.organization_id}`}
                      className="text-blue-500 hover:underline"
                    >
                      View Rescue Organization
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}