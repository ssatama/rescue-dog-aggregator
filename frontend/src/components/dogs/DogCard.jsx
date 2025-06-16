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
import SocialMediaLinks from '../ui/SocialMediaLinks';
import LazyImage from '../ui/LazyImage';
import { getCatalogCardImageWithPosition, handleImageError } from '../../utils/imageUtils';
import { sanitizeText } from '../../utils/security';
import { useFadeInAnimation, useHoverAnimation } from '../../utils/animations';


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

  // Basic validation or default values with sanitization
  const name = sanitizeText(dog?.name || "Unknown Dog");
  
  // Handle breed display - hide if unknown
  const rawBreed = dog?.standardized_breed || dog?.breed;
  const isUnknownBreed = !rawBreed || rawBreed === 'Unknown' || rawBreed.toLowerCase() === 'unknown';
  const breed = isUnknownBreed ? null : sanitizeText(rawBreed);
  
  const breedGroup = sanitizeText(dog?.breed_group);
  const originalImageUrl = dog?.primary_image_url;
  const { src: optimizedImageUrl, position: objectPosition } = getCatalogCardImageWithPosition(originalImageUrl);
  
  // Debug logging removed for production builds
  const location = dog?.organization?.city ?
    (dog.organization.country ? sanitizeText(`${dog.organization.city}, ${dog.organization.country}`) : sanitizeText(dog.organization.city)) :
    "Unknown Location";
  const id = dog?.id || "0";
  const status = sanitizeText(dog?.status || 'unknown');
  const orgSocialMedia = dog?.organization?.social_media;

  // NEW: Check if dog is recent (added within last 7 days)
  const isRecent = () => {
    if (!dog?.created_at) return false;
    try {
      const createdDate = new Date(dog.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdDate > sevenDaysAgo;
    } catch {
      return false; // Invalid date
    }
  };

  const showNewBadge = isRecent();
  const organizationName = dog?.organization?.name;

  return (
    <Card 
      ref={cardRef}
      data-testid="dog-card"
      className={`overflow-hidden flex flex-col h-full shadow-blue-sm hover:shadow-blue-lg transition-all duration-300 ease-in-out ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-5'
      }`}
      {...hoverProps}
    >
      <CardHeader className="p-0 relative">
        <Link 
          href={`/dogs/${id}`} 
          className="block relative" 
          aria-label={`View details for ${name.replace(/&[^;]+;/g, '')}`}
        >
          {/* Optimized Lazy Image with 4:3 aspect ratio and progressive loading */}
          <LazyImage
            src={optimizedImageUrl}
            alt={name.replace(/&[^;]+;/g, '')}
            className="w-full aspect-[4/3] object-cover"
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

          {/* Organization Badge */}
          {organizationName && (
            <Badge
              data-testid="organization-badge"
              aria-label={`Organization: ${organizationName}`}
              variant="outline"
              className="absolute bottom-2 right-2 z-10 bg-white text-gray-800 border-gray-200 text-xs truncate max-w-[120px]"
            >
              {sanitizeText(organizationName)}
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
        </Link>
      </CardHeader>

      <CardContent className="p-4 flex flex-col flex-grow">
        <CardTitle className="mb-1 truncate group-hover:text-blue-600">
          <Link href={`/dogs/${id}`} className="hover:underline">
            <h3 data-testid="dog-name" className="truncate">{name}</h3>
          </Link>
        </CardTitle>
        {breed && (
          <p data-testid="dog-breed" className="text-small text-gray-600 mb-1 truncate">{breed}</p>
        )}
        {breedGroup && breedGroup !== 'Unknown' && (
          <Badge variant="outline" className="text-tiny mb-2 w-fit">
            {breedGroup} Group
          </Badge>
        )}
        <p className="text-tiny text-gray-500 flex-grow">
          {location !== "Unknown Location" ? location : <>&nbsp;</>}
        </p>

        {/* Organization Social Media */}
        {orgSocialMedia && Object.keys(orgSocialMedia).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-tiny text-gray-500 mb-1">Follow rescue org:</p>
            <SocialMediaLinks socialMedia={orgSocialMedia} className="justify-start" />
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
         <Link href={`/dogs/${id}`} className="w-full">
           <Button
             size="sm"
             variant="outline"
             className="w-full"
             style={{ minWidth: '48px', minHeight: '48px' }}
           >
             Adopt {name}
           </Button>
         </Link>
      </CardFooter>
    </Card>
  );
});

export default DogCard;