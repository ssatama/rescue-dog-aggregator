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
import { getDetailHeroImageWithPosition, getThumbnailImage, handleImageError } from '../../../utils/imageUtils';
import HeroImageWithBlurredBackground from '../../../components/ui/HeroImageWithBlurredBackground';
import { reportError } from '../../../utils/logger';
import { sanitizeText, sanitizeHtml } from '../../../utils/security';

export default function DogDetailClient({ params = {} }) {
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
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2">/</span>
              <Link href="/dogs" className="hover:text-gray-700">
                Find Dogs
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">{dog?.name || 'Loading...'}</span>
            </li>
          </ol>
        </nav>

        <Link href="/dogs" passHref>
          <Button variant="link" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-8 p-0 h-auto">
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
            <div className="flex flex-col gap-8">
              {/* Hero Image Section - Full Width */}
              <div className="w-full" data-testid="hero-image-container">
                <HeroImageWithBlurredBackground
                  src={dog.primary_image_url}
                  alt={dog.name}
                  onError={(e) => handleImageError(e, dog.primary_image_url)}
                />
              </div>
              
              {/* Content Section - Below Hero */}
              <div className="w-full">
                {/* Header with name, tagline and action icons */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">{sanitizeText(dog.name)}</h1>
                    <p className="text-xl text-gray-600">Looking for a loving home</p>
                  </div>
                  
                  {/* Action bar with heart and share icons */}
                  <div className="flex items-center space-x-2" data-testid="action-bar">
                    {/* Heart/Favorite icon */}
                    <button 
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      data-testid="heart-icon"
                      aria-label="Add to favorites"
                    >
                      <svg 
                        className="w-6 h-6 text-gray-600 hover:text-red-500 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                    </button>
                    
                    {/* Share icon */}
                    <ShareButton
                      url={typeof window !== 'undefined' ? window.location.href : ''}
                      title={`Meet ${dog.name} - Available for Adoption`}
                      text={`${dog.name} is a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.`}
                      variant="ghost"
                      size="sm"
                      className="p-2 rounded-full hover:bg-gray-100"
                    />
                  </div>
                </div>
                
                {/* Only show breed section if we have a known breed */}
                {(() => {
                  const breed = dog.standardized_breed || dog.breed;
                  const isUnknownBreed = !breed || breed === 'Unknown' || breed.toLowerCase() === 'unknown';
                  
                  if (isUnknownBreed) {
                    return null; // Hide the entire breed section for unknown breeds
                  }
                  
                  return (
                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold text-gray-800 mb-3">Breed</h2>
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-base leading-relaxed text-gray-800">{sanitizeText(breed)}</span>
                        {dog.standardized_breed && dog.breed && dog.standardized_breed !== dog.breed && (
                          <span className="text-sm text-gray-500 ml-2">(originally listed as: {sanitizeText(dog.breed)})</span>
                        )}
                      </div>
                      {dog.breed_group && dog.breed_group !== 'Unknown' && (
                        <Badge variant="secondary" className="mt-2">{sanitizeText(dog.breed_group)} Group</Badge>
                      )}
                    </div>
                  );
                })()}
                
                {/* Metadata Cards with Icons */}
                <div className="grid grid-cols-2 gap-3 mb-8" data-testid="metadata-cards">
                  {formatAge(dog) && (
                    <div className="bg-purple-50 rounded-lg p-3 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 font-medium">Age</p>
                        <p className="text-sm font-semibold text-gray-800">{formatAge(dog)}</p>
                      </div>
                    </div>
                  )}

                  {dog.sex && dog.sex.toLowerCase() !== 'unknown' && (
                    <div className={`rounded-lg p-3 flex items-center space-x-2 ${
                      dog.sex.toLowerCase() === 'male' ? 'bg-blue-50' : 'bg-pink-50'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        dog.sex.toLowerCase() === 'male' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}>
                        <span className={`text-lg font-bold ${
                          dog.sex.toLowerCase() === 'male' ? 'text-blue-600' : 'text-pink-600'
                        }`}>
                          {dog.sex.toLowerCase() === 'male' ? '♂' : '♀'}
                        </span>
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${
                          dog.sex.toLowerCase() === 'male' ? 'text-blue-600' : 'text-pink-600'
                        }`}>Gender</p>
                        <p className="text-sm font-semibold text-gray-800">{dog.sex}</p>
                      </div>
                    </div>
                  )}

                  {(dog.standardized_breed || dog.breed) && !(dog.standardized_breed === 'Unknown' || dog.breed === 'Unknown') && (
                    <div className="bg-green-50 rounded-lg p-3 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">Breed</p>
                        <p className="text-sm font-semibold text-gray-800">{dog.standardized_breed || dog.breed}</p>
                      </div>
                    </div>
                  )}

                  {(dog.standardized_size || dog.size) && (
                    <div className="bg-orange-50 rounded-lg p-3 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 font-medium">Size</p>
                        <p className="text-sm font-semibold text-gray-800">{dog.standardized_size || dog.size}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {dog.properties?.description && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">About {sanitizeText(dog.name)}</h2>
                    <div 
                      className="text-base leading-relaxed text-gray-700"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(dog.properties.description) }}
                    />
                  </div>
                )}
                
                {/* Organization Info Section */}
                {dog.organization && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      Rescue Organization
                    </h3>
                    <p className="text-base leading-relaxed text-gray-700 mb-4">{dog.organization.name}</p>
                    
                    {/* Organization Social Media */}
                    {dog.organization.social_media && Object.keys(dog.organization.social_media).length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-3">Follow this rescue:</p>
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
                
                {/* CTA Section */}
                {dog.status === 'available' && (
                  <div className="mb-8">
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
                      <a href={dog.adoption_url} target="_blank" rel="noopener noreferrer">
                        Adopt {dog.name}
                      </a>
                    </Button>
                    <p className="text-sm text-gray-500 text-center mt-2">You'll be redirected to the rescue organization's website</p>
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