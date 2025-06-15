"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import MobileStickyBar from '../../../components/ui/MobileStickyBar';
import FavoriteButton from '../../../components/ui/FavoriteButton';
import { ToastProvider } from '../../../components/ui/Toast';
import RelatedDogsSection from '../../../components/dogs/RelatedDogsSection';
import { reportError } from '../../../utils/logger';
import { sanitizeText, sanitizeHtml } from '../../../utils/security';
import DogDetailSkeleton from '../../../components/ui/DogDetailSkeleton';
import DogDetailErrorBoundary from '../../../components/error/DogDetailErrorBoundary';
import { ScrollAnimationWrapper } from '../../../hooks/useScrollAnimation';

export default function DogDetailClient({ params = {} }) {
  const urlParams = useParams();
  const dogId = params?.id || urlParams?.id;
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Memoized fetchDogData for performance
  const fetchDogData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getAnimalById(dogId);
      setDog(data);
    } catch (err) {
      reportError("Error fetching dog data", { error: err.message, dogId });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [dogId]);
  
  useEffect(() => {
    fetchDogData();
  }, [fetchDogData]);

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

  // Memoized description processing utilities for performance
  const descriptionText = useMemo(() => {
    return dog?.properties?.description || '';
  }, [dog?.properties?.description]);

  const getPlainTextLength = useCallback((htmlString) => {
    if (typeof window === 'undefined') return htmlString;
    // Create a temporary element to strip HTML tags for character counting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  const shouldShowReadMore = useMemo(() => {
    if (!descriptionText) return false;
    const plainText = getPlainTextLength(descriptionText);
    return plainText.length > 200;
  }, [descriptionText, getPlainTextLength]);

  const truncatedDescription = useMemo(() => {
    if (!descriptionText) return '';
    const plainText = getPlainTextLength(descriptionText);
    if (plainText.length <= 200) return descriptionText;
    
    // Find a good breaking point near 200 characters
    const truncated = plainText.substring(0, 200);
    const lastSpace = truncated.lastIndexOf(' ');
    const breakPoint = lastSpace > 150 ? lastSpace : 200;
    
    return plainText.substring(0, breakPoint) + '...';
  }, [descriptionText, getPlainTextLength]);

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    fetchDogData();
  }, [fetchDogData]);

  if (loading) {
    return (
      <Layout>
        <DogDetailSkeleton />
      </Layout>
    );
  }

  if (error || !dog) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <Alert variant="destructive">
            <AlertTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Dog Not Found
            </AlertTitle>
            <AlertDescription>
              <p className="mb-4">Sorry, we couldn't find the dog you're looking for.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Try Again
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dogs">Return to dogs listing</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <ToastProvider>
      <DogDetailErrorBoundary dogId={dogId}>
        <Layout>
          <div className="max-w-4xl mx-auto p-4">
            {/* Breadcrumb Navigation */}
            <ScrollAnimationWrapper>
              <nav aria-label="Breadcrumb" className="mb-8">
                <ol className="flex items-center space-x-2 text-sm text-gray-600">
                  <li>
                    <Link href="/" className="hover:text-gray-700 transition-colors duration-200">
                      Home
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <span className="mx-2">/</span>
                    <Link href="/dogs" className="hover:text-gray-700 transition-colors duration-200">
                      Find Dogs
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 font-medium">{sanitizeText(dog?.name || 'Loading...')}</span>
                  </li>
                </ol>
              </nav>
            </ScrollAnimationWrapper>

            <ScrollAnimationWrapper delay={100}>
              <Link href="/dogs" passHref>
                <Button variant="link" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-8 p-0 h-auto transition-colors duration-300">
                  ← Back to all dogs
                </Button>
              </Link>
            </ScrollAnimationWrapper>
        
            <ScrollAnimationWrapper delay={200} className="bg-white rounded-lg shadow-md overflow-hidden">
              {dog.status && dog.status !== 'available' && (
                <div className={`w-full py-2 text-center text-white font-semibold transition-all duration-300 ${dog.status === 'adopted' ? 'bg-gray-600' : 'bg-yellow-500'}`}>
                  {dog.status.charAt(0).toUpperCase() + dog.status.slice(1)}
                </div>
              )}
              
              <div className="p-6">
                <div className="flex flex-col gap-8">
                  {/* Hero Image Section - Full Width */}
                  <ScrollAnimationWrapper delay={300}>
                    <div className="w-full" data-testid="hero-image-container">
                      <HeroImageWithBlurredBackground
                        src={dog.primary_image_url}
                        alt={dog.name}
                        onError={(e) => handleImageError(e, dog.primary_image_url)}
                      />
                    </div>
                  </ScrollAnimationWrapper>
              
                  {/* Content Section - Below Hero */}
                  <div className="w-full">
                    {/* Header with name, tagline and action icons */}
                    <ScrollAnimationWrapper delay={400}>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h1 className="text-3xl sm:text-4xl font-bold mb-2 transition-colors duration-300">{sanitizeText(dog.name)}</h1>
                          <p className="text-xl text-gray-600">Looking for a loving home</p>
                        </div>
                        
                        {/* Action bar with heart and share icons */}
                        <div className="flex items-center space-x-1" data-testid="action-bar">
                          {/* Favorite Button */}
                          <FavoriteButton dog={dog} variant="header" className="rounded-full transition-transform duration-200 hover:scale-105" />
                          
                          {/* Share Button */}
                          <ShareButton
                            url={typeof window !== 'undefined' ? window.location.href : ''}
                            title={`Meet ${dog.name} - Available for Adoption`}
                            text={`${dog.name} is a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.`}
                            variant="ghost"
                            size="sm"
                            className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                          />
                        </div>
                      </div>
                    </ScrollAnimationWrapper>
                
                    {/* Only show breed section if we have a known breed */}
                    {(() => {
                      const breed = dog.standardized_breed || dog.breed;
                      const isUnknownBreed = !breed || breed === 'Unknown' || breed.toLowerCase() === 'unknown';
                      
                      if (isUnknownBreed) {
                        return null; // Hide the entire breed section for unknown breeds
                      }
                      
                      return (
                        <ScrollAnimationWrapper delay={500}>
                          <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Breed</h2>
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-base leading-relaxed text-gray-800">{sanitizeText(breed)}</span>
                              {dog.standardized_breed && dog.breed && dog.standardized_breed !== dog.breed && (
                                <span className="text-sm text-gray-500 ml-2">(originally listed as: {sanitizeText(dog.breed)})</span>
                              )}
                            </div>
                            {dog.breed_group && dog.breed_group !== 'Unknown' && (
                              <Badge variant="secondary" className="mt-2 transition-colors duration-200">{sanitizeText(dog.breed_group)} Group</Badge>
                            )}
                          </div>
                        </ScrollAnimationWrapper>
                      );
                    })()}
                
                    {/* Quick Info Cards */}
                    <ScrollAnimationWrapper delay={600}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="metadata-cards">
                        {/* Age Card - Always show, display "Age Unknown" if no age data */}
                        <div className="bg-purple-50 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md">
                          <div className="text-2xl mb-2">🎂</div>
                          <p className="text-xs text-purple-600 font-medium mb-1">Age</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatAge(dog) || 'Age Unknown'}
                          </p>
                        </div>

                        {/* Sex Card - Always show, display sex or "Unknown" */}
                        <div className="bg-blue-50 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md">
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
                          <div className="bg-green-50 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md">
                            <div className="text-2xl mb-2">🐕</div>
                            <p className="text-xs text-green-600 font-medium mb-1">Breed</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {dog.standardized_breed || dog.breed}
                            </p>
                          </div>
                        )}

                        {/* Size Card - Only show if size data exists */}
                        {(dog.standardized_size || dog.size) && (
                          <div className="bg-orange-50 rounded-lg p-4 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-md">
                            <div className="text-2xl mb-2">📏</div>
                            <p className="text-xs text-orange-600 font-medium mb-1">Size</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {dog.standardized_size || dog.size}
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollAnimationWrapper>
                
                    {/* Enhanced About Section - Always Show */}
                    <ScrollAnimationWrapper delay={700}>
                      <div className="mb-8" data-testid="about-section">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">About {sanitizeText(dog.name)}</h2>
                        
                        {(() => {
                          const hasDescription = descriptionText.trim().length > 0;
                          
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
                            ? descriptionText 
                            : shouldShowReadMore 
                              ? truncatedDescription
                              : descriptionText;
                          
                          return (
                            <div className="prose max-w-none">
                              <div 
                                className="text-base leading-relaxed text-gray-700 transition-all duration-300 ease-in-out"
                                data-testid="description-content"
                                dangerouslySetInnerHTML={{ 
                                  __html: sanitizeHtml(isDescriptionExpanded ? descriptionText : displayDescription)
                                }}
                              />
                              
                              {shouldShowReadMore && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 hover:bg-blue-50"
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
                    </ScrollAnimationWrapper>
                
                    {/* Organization Section */}
                    {dog.organization && (
                      <ScrollAnimationWrapper delay={800}>
                        <div className="mb-8">
                          <OrganizationSection 
                            organization={dog.organization} 
                            organizationId={dog.organization_id}
                          />
                        </div>
                      </ScrollAnimationWrapper>
                    )}
                    
                    {/* Related Dogs Section with Lazy Loading */}
                    {dog.organization_id && (
                      <ScrollAnimationWrapper delay={900} threshold={0.1}>
                        <RelatedDogsSection 
                          organizationId={dog.organization_id}
                          currentDogId={dog.id}
                          organization={dog.organization}
                        />
                      </ScrollAnimationWrapper>
                    )}
                    
                    {/* CTA Section */}
                    {dog.status === 'available' && (
                      <ScrollAnimationWrapper delay={1000}>
                        <div className="mb-8">
                          <div className="flex justify-center">
                            <Button asChild className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-[400px] bg-blue-600 hover:bg-blue-700 text-white text-lg py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg transform hover:scale-105">
                              <a href={dog.adoption_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                <svg 
                                  className="w-5 h-5 mr-3 transition-transform duration-200" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                Start Adoption Process
                              </a>
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 text-center mt-3 transition-colors duration-200">You'll be redirected to the rescue organization's website</p>
                        </div>
                      </ScrollAnimationWrapper>
                    )}
                  </div>
                </div>
              </div>
            </ScrollAnimationWrapper>
          </div>
          
          {/* Mobile Sticky Bar */}
          <MobileStickyBar dog={dog} />
        </Layout>
      </DogDetailErrorBoundary>
    </ToastProvider>
  );
}