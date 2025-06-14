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
import OrganizationSection from '../../../components/organizations/OrganizationSection';
import { reportError } from '../../../utils/logger';
import { sanitizeText, sanitizeHtml } from '../../../utils/security';

export default function DogDetailClient({ params = {} }) {
  const urlParams = useParams();
  const dogId = params?.id || urlParams?.id;
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
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

  // Description processing utilities
  const getDescriptionText = (dog) => {
    return dog.properties?.description || '';
  };

  const getPlainTextLength = (htmlString) => {
    // Create a temporary element to strip HTML tags for character counting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const shouldShowReadMore = (description) => {
    if (!description) return false;
    const plainText = getPlainTextLength(description);
    return plainText.length > 200;
  };

  const getTruncatedDescription = (description) => {
    if (!description) return '';
    const plainText = getPlainTextLength(description);
    if (plainText.length <= 200) return description;
    
    // Find a good breaking point near 200 characters
    const truncated = plainText.substring(0, 200);
    const lastSpace = truncated.lastIndexOf(' ');
    const breakPoint = lastSpace > 150 ? lastSpace : 200;
    
    return plainText.substring(0, breakPoint) + '...';
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
                
                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="metadata-cards">
                  {/* Age Card - Always show, display "Age Unknown" if no age data */}
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🎂</div>
                    <p className="text-xs text-purple-600 font-medium mb-1">Age</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatAge(dog) || 'Age Unknown'}
                    </p>
                  </div>

                  {/* Sex Card - Always show, display sex or "Unknown" */}
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">
                      {dog.sex && dog.sex.toLowerCase() === 'male' ? '♂️' : 
                       dog.sex && dog.sex.toLowerCase() === 'female' ? '♀️' : '❓'}
                    </div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Gender</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {dog.sex && dog.sex.toLowerCase() !== 'unknown' ? dog.sex : 'Unknown'}
                    </p>
                  </div>

                  {/* Breed Card - Only show if breed is known and not "Unknown" */}
                  {(dog.standardized_breed || dog.breed) && 
                   !(dog.standardized_breed === 'Unknown' || dog.breed === 'Unknown' || 
                     dog.standardized_breed?.toLowerCase() === 'unknown' || dog.breed?.toLowerCase() === 'unknown') && (
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-2">🐕</div>
                      <p className="text-xs text-green-600 font-medium mb-1">Breed</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {dog.standardized_breed || dog.breed}
                      </p>
                    </div>
                  )}

                  {/* Size Card - Only show if size data exists */}
                  {(dog.standardized_size || dog.size) && (
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-2">📏</div>
                      <p className="text-xs text-orange-600 font-medium mb-1">Size</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {dog.standardized_size || dog.size}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Enhanced About Section - Always Show */}
                <div className="mb-8" data-testid="about-section">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">About {sanitizeText(dog.name)}</h2>
                  
                  {(() => {
                    const description = getDescriptionText(dog);
                    const hasDescription = description.trim().length > 0;
                    const showReadMore = shouldShowReadMore(description);
                    
                    if (!hasDescription) {
                      // Empty state with fallback message
                      return (
                        <div className="prose max-w-none">
                          <p className="text-base leading-relaxed text-gray-700 italic" data-testid="empty-description">
                            Contact the rescue to learn more about {sanitizeText(dog.name)}.
                          </p>
                        </div>
                      );
                    }
                    
                    // Description exists - show with read more functionality
                    const displayDescription = isDescriptionExpanded 
                      ? description 
                      : showReadMore 
                        ? getTruncatedDescription(description)
                        : description;
                    
                    return (
                      <div className="prose max-w-none">
                        <div 
                          className="text-base leading-relaxed text-gray-700 transition-all duration-300 ease-in-out"
                          data-testid="description-content"
                          dangerouslySetInnerHTML={{ 
                            __html: sanitizeHtml(isDescriptionExpanded ? description : displayDescription)
                          }}
                        />
                        
                        {showReadMore && (
                          <div className="mt-3">
                            <button
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1"
                              data-testid="read-more-button"
                            >
                              {isDescriptionExpanded ? 'Show less' : 'Read more'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Organization Section */}
                {dog.organization && (
                  <div className="mb-8">
                    <OrganizationSection 
                      organization={dog.organization} 
                      organizationId={dog.organization_id}
                    />
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