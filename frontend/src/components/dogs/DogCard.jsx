import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LazyImage from '../ui/LazyImage';
import { getCatalogCardImageWithPosition, handleImageError } from '../../utils/imageUtils';
import { sanitizeText } from '../../utils/security';
import { useFadeInAnimation, useHoverAnimation } from '../../utils/animations';
import { formatShipsToList } from '../../utils/countries';
import {
  formatAge,
  getAgeCategory,
  formatBreed,
  formatGender,
  isRecentDog,
  getOrganizationName,
  getShipsToCountries
} from '../../utils/dogHelpers';


const DogCard = React.memo(function DogCard({ dog, priority = false, animationDelay = 0 }) {
  // Animation hooks
  const { ref: cardRef, isVisible } = useFadeInAnimation({ 
    delay: animationDelay,
    threshold: 0.2 
  });
  const { hoverProps } = useHoverAnimation({
    scale: 1.02,
    translateY: -4,
    duration: 300
  });

  // Enhanced data processing using helper functions
  const name = sanitizeText(dog?.name || "Unknown Dog");
  const breed = formatBreed(dog);
  const breedGroup = sanitizeText(dog?.breed_group);
  const originalImageUrl = dog?.primary_image_url;
  const { src: optimizedImageUrl, position: objectPosition } = getCatalogCardImageWithPosition(originalImageUrl);
  
  const id = dog?.id || "0";
  const status = sanitizeText(dog?.status || 'unknown');
  
  // Enhanced data using helper functions
  const formattedAge = formatAge(dog);
  const ageCategory = getAgeCategory(dog);
  const gender = formatGender(dog);
  const organizationName = getOrganizationName(dog);
  const shipsToCountries = getShipsToCountries(dog);
  const showNewBadge = isRecentDog(dog);

  return (
    <Card 
      ref={cardRef}
      data-testid="dog-card"
      className={`bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full animate-card-hover group will-change-transform ${
        isVisible ? 'animate-page-enter' : 'opacity-0 translate-y-5'
      }`}
      {...hoverProps}
    >
      <CardHeader className="p-0">
        <Link 
          href={`/dogs/${id}`} 
          className="block" 
          aria-label={`View details for ${name.replace(/&[^;]+;/g, '')}`}
        >
          {/* 4:3 aspect ratio image container */}
          <div data-testid="image-container" className="aspect-[4/3] relative overflow-hidden bg-gray-200">
            <LazyImage
              src={optimizedImageUrl}
              alt={name.replace(/&[^;]+;/g, '')}
              className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
              style={{ objectPosition }}
              enableProgressiveLoading={true}
              priority={priority}
              onError={(e) => handleImageError(e, originalImageUrl)}
            />
            
            
            {/* NEW Badge for recent dogs */}
            {showNewBadge && (
              <Badge
                data-testid="new-badge"
                aria-label="Recently added dog"
                className="absolute top-2 left-2 z-10 bg-green-500 text-white border-0 text-xs font-bold px-2 py-1"
              >
                NEW
              </Badge>
            )}

            {/* Status Badge (optional) */}
            {status !== 'available' && (
               <Badge
                 variant={status === 'adopted' ? "secondary" : "default"}
                 className="absolute top-2 right-2 z-10"
               >
                 {status.charAt(0).toUpperCase() + status.slice(1)}
               </Badge>
             )}
          </div>
        </Link>
      </CardHeader>

      <CardContent data-testid="card-content" className="p-5 flex flex-col flex-grow space-y-3">
        {/* Enhanced prominent name display */}
        <CardTitle className="mb-0">
          <Link href={`/dogs/${id}`} className="hover:underline transition-all duration-300">
            <h3 data-testid="dog-name" className="text-xl font-bold truncate group-hover:text-blue-600 mb-2">{name}</h3>
          </Link>
        </CardTitle>

        {/* Age and Gender row with icons */}
        <div data-testid="age-gender-row" className="flex items-center gap-3 text-sm text-gray-600">
          {ageCategory !== 'Unknown' && (
            <div className="flex items-center gap-1">
              <span data-testid="age-icon" className="text-lg">🎂</span>
              <span data-testid="age-category" className="font-medium text-blue-600">{ageCategory}</span>
              <span className="text-gray-400">•</span>
              <span data-testid="formatted-age" className="text-gray-600">{formattedAge}</span>
            </div>
          )}
          {gender.text !== 'Unknown' && (
            <div data-testid="gender-display" className="flex items-center gap-1">
              <span data-testid="gender-icon">{gender.icon}</span>
              <span>{gender.text}</span>
            </div>
          )}
        </div>

        {/* Breed information */}
        {breed && (
          <p data-testid="dog-breed" className="text-sm text-gray-600 truncate">{breed}</p>
        )}
        {breedGroup && breedGroup !== 'Unknown' && (
          <Badge variant="outline" className="text-xs mb-1 w-fit">
            {breedGroup} Group
          </Badge>
        )}

        {/* Location (Organization as proxy) with icon */}
        <div data-testid="location-row" className="flex items-center gap-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span data-testid="location-display" className="truncate">{organizationName}</span>
        </div>

        {/* Ships to countries as flag emojis */}
        {shipsToCountries.length > 0 && (
          <div data-testid="ships-to-display" className="flex items-start gap-2 text-xs">
            <span className="text-gray-500 mt-1 whitespace-nowrap">Ships to:</span>
            <div data-testid="ships-to-flags" className="flex-1 min-w-0">
              {formatShipsToList(shipsToCountries, 3)}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter data-testid="card-footer" className="p-5 pt-0">
         <Link href={`/dogs/${id}`} className="w-full">
           <Button
             type="button"
             size="sm"
             className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
             style={{ minWidth: '48px', minHeight: '48px' }}
           >
             Meet {name} →
           </Button>
         </Link>
      </CardFooter>
    </Card>
  );
});

export default DogCard;