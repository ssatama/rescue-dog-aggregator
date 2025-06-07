"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';
import Loading from '../../../components/ui/Loading';
import { Button } from "@/components/ui/button";
import { getAnimalById } from '../../../services/animalsService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ShareButton from '../../../components/ui/ShareButton';
import SocialMediaLinks from '../../../components/ui/SocialMediaLinks';
import { getDogDetailImage, getDogSmallThumbnail, handleImageError } from '../../../utils/imageUtils';
import { reportError } from '../../../utils/logger';
import { sanitizeText, sanitizeHtml } from '../../../utils/security';

export default function DogDetailClient({ params }) {
  const urlParams = useParams();
  const dogId = params?.id || urlParams?.id;
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchDogData = async () => {
      try {
        setLoading(true);
        const data = await getAnimalById(dogId);
        setDog(data);
      } catch (err) {
        reportError("Error fetching dog data", { error: err.message, dogId });
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDogData();
  }, [dogId]);

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
              <Link href="/dogs" passHref>
                <Button variant="link" className="mt-4 text-red-700 hover:text-red-800 p-0 h-auto block">
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
          {dog.status && dog.status !== 'available' && (
            <div className={`w-full py-2 text-center text-white font-semibold ${dog.status === 'adopted' ? 'bg-gray-600' : 'bg-yellow-500'}`}>
              {dog.status.charAt(0).toUpperCase() + dog.status.slice(1)}
            </div>
          )}
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                {dog.primary_image_url ? (
                  <img 
                    src={getDogDetailImage(dog.primary_image_url)} 
                    alt={dog.name} 
                    className="w-full h-64 md:h-80 object-contain rounded-lg"
                    onError={(e) => handleImageError(e, dog.primary_image_url)}
                  />
                ) : (
                  <div className="w-full h-64 md:h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
                
                {dog.images && dog.images.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {dog.images.slice(0, 4).map((image, index) => (
                      <img 
                        key={image.id || index} 
                        src={getDogSmallThumbnail(image.image_url)} 
                        alt={`${dog.name} - photo ${index + 1}`} 
                        className="w-full h-16 object-contain rounded-md"
                        onError={(e) => handleImageError(e, image.image_url)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="md:w-1/2">
                <h1 className="text-3xl font-bold mb-2">{sanitizeText(dog.name)}</h1>
                
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-700">Breed</h2>
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-gray-800">{sanitizeText(dog.standardized_breed || dog.breed || 'Unknown')}</span>
                    {dog.standardized_breed && dog.breed && dog.standardized_breed !== dog.breed && (
                      <span className="text-sm text-gray-500 ml-2">(originally listed as: {sanitizeText(dog.breed)})</span>
                    )}
                  </div>
                  {dog.breed_group && dog.breed_group !== 'Unknown' && (
                    <Badge variant="secondary" className="mt-1">{sanitizeText(dog.breed_group)} Group</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
                  {formatAge(dog) && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Age</h2>
                      <p className="text-gray-800">{formatAge(dog)}</p>
                    </div>
                  )}

                  {dog.sex && dog.sex.toLowerCase() !== 'unknown' && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Sex</h2>
                      <div className="flex items-center">
                        {dog.sex.toLowerCase() === 'male' ? (
                          <><span className="text-blue-500 mr-1">♂</span><span>Male</span></>
                        ) : (
                          <><span className="text-pink-500 mr-1">♀</span><span>Female</span></>
                        )}
                      </div>
                    </div>
                  )}

                  {(dog.standardized_size || dog.size) && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Size</h2>
                      <Badge variant="secondary">{dog.standardized_size || dog.size}</Badge>
                    </div>
                  )}

                  {dog.properties?.weight && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Weight</h2>
                      <p className="text-gray-800">{dog.properties.weight}</p>
                    </div>
                  )}

                  {dog.properties?.neutered_spayed && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">
                        {dog.sex?.toLowerCase() === 'female' ? 'Spayed' : 'Neutered'}
                      </h2>
                      <p className="text-gray-800">{dog.properties.neutered_spayed}</p>
                    </div>
                  )}
                </div>
                
                {dog.properties?.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">About {sanitizeText(dog.name)}</h2>
                    <div 
                      className="text-gray-600"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(dog.properties.description) }}
                    />
                  </div>
                )}
                
                {/* Organization Info Section */}
                {dog.organization && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Rescue Organization
                    </h3>
                    <p className="text-gray-700 mb-2">{dog.organization.name}</p>
                    
                    {/* Organization Social Media */}
                    {dog.organization.social_media && Object.keys(dog.organization.social_media).length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">Follow this rescue:</p>
                        <SocialMediaLinks 
                          socialMedia={dog.organization.social_media} 
                          className="justify-start" 
                        />
                      </div>
                    )}
                    
                    <Link href={`/organizations/${dog.organization_id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Organization Profile
                      </Button>
                    </Link>
                  </div>
                )}
                
                {dog.status === 'available' && (
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <a href={dog.adoption_url} target="_blank" rel="noopener noreferrer">
                      Adopt {dog.name}
                    </a>
                  </Button>
                )}

                <div className="mt-3">
                  <ShareButton
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={`Meet ${dog.name} - Available for Adoption`}
                    text={`${dog.name} is a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.`}
                    variant="secondary"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}