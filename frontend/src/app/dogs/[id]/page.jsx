// src/app/dogs/[id]/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import Loading from '../../../components/ui/Loading';
import { Button } from "@/components/ui/button"; // <<< Import Button
import { getAnimalById } from '../../../services/animalsService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // <<< Import Alert components
import { Badge } from "@/components/ui/badge"; // <<< Import Badge component

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
        const data = await getAnimalById(dogId);
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
    // *** Return null instead of 'Unknown age' if age_text is also missing ***
    return dog.age_text || null;
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
          <Alert variant="destructive">
            <AlertTitle>Dog Not Found</AlertTitle>
            <AlertDescription>
              Sorry, we couldn't find the dog you're looking for.
              {/* Keep the return link inside */}
              <Link href="/dogs" passHref>
                <Button variant="link" className="mt-4 text-red-700 hover:text-red-800 p-0 h-auto block"> {/* Adjusted color for destructive alert */}
                  Return to dogs listing
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <Link href="/dogs" passHref>
          <Button variant="link" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-6 p-0 h-auto">
            ← Back to all dogs
          </Button>
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
                    <Badge variant="secondary" className="mt-1"> {/* Use secondary variant */}
                      {dog.breed_group} Group
                    </Badge>
                  )}
                </div>
                
                {/* Main attributes */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
                  {/* Age - *** Conditionally render the entire div *** */}
                  {formatAge(dog) && ( // Check if formatAge returns a value
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Age</h2>
                      <p className="text-gray-800">{formatAge(dog)}</p>
                    </div>
                  )}

                  {/* Sex - Conditionally render the entire div if sex is unknown */}
                  {dog.sex && dog.sex.toLowerCase() !== 'unknown' ? ( // Check if sex is known
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Sex</h2>
                      <div className="flex items-center">
                        {dog.sex.toLowerCase() === 'male' ? (
                          <>
                            <span className="text-blue-500 mr-1">♂</span>
                            <span>Male</span>
                          </>
                        ) : ( // Assumes female if not male and not unknown
                          <>
                            <span className="text-pink-500 mr-1">♀</span>
                            <span>Female</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null /* Render nothing if sex is unknown */}

                  {/* Size - Already conditionally rendered */}
                  {(dog.standardized_size || dog.size) && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Size</h2>
                      <Badge variant="secondary">
                        {dog.standardized_size || dog.size}
                      </Badge>
                    </div>
                  )}

                  {/* Weight - Already conditionally rendered */}
                  {dog.properties?.weight && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Weight</h2>
                      <p className="text-gray-800">{dog.properties.weight}</p>
                    </div>
                  )}

                  {/* Neutered/Spayed - Already conditionally rendered */}
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
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <a
                      href={dog.adoption_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Adopt {dog.name}
                    </a>
                  </Button>
                )}

                {/* Link to organization */}
                {dog.organization_id && (
                  <div className="mt-4 text-center">
                    <Link
                      href={`/organizations/${dog.organization_id}`}
                      passHref
                    >
                      <Button variant="link" className="text-blue-500 hover:text-blue-700 p-0 h-auto">
                        View Rescue Organization
                      </Button>
                    </Link>
                  </div>
                )}
              </div> {/* End Details column */}
            </div> {/* End flex container */}
          </div> {/* End padding div */}
        </div> {/* End card div */}
      </div> {/* End max-width container */}
    </Layout>
  );
}