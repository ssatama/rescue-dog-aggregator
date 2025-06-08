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
import { getDogThumbnail, handleImageError } from '../../utils/imageUtils';
import { sanitizeText } from '../../utils/security';


const DogCard = React.memo(function DogCard({ dog }) {
  // Basic validation or default values with sanitization
  const name = sanitizeText(dog?.name || "Unknown Dog");
  
  // Handle breed display - hide if unknown
  const rawBreed = dog?.standardized_breed || dog?.breed;
  const isUnknownBreed = !rawBreed || rawBreed === 'Unknown' || rawBreed.toLowerCase() === 'unknown';
  const breed = isUnknownBreed ? null : sanitizeText(rawBreed);
  
  const breedGroup = sanitizeText(dog?.breed_group);
  const originalImageUrl = dog?.primary_image_url;
  const optimizedImageUrl = getDogThumbnail(originalImageUrl);
  const location = dog?.organization?.city ?
    (dog.organization.country ? sanitizeText(`${dog.organization.city}, ${dog.organization.country}`) : sanitizeText(dog.organization.city)) :
    "Unknown Location";
  const id = dog?.id || "0";
  const status = sanitizeText(dog?.status || 'unknown');
  const orgSocialMedia = dog?.organization?.social_media;

  return (
    <Card className="overflow-hidden flex flex-col h-full group transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="p-0 relative">
        <Link 
          href={`/dogs/${id}`} 
          className="block relative" 
          aria-label={`View details for ${name.replace(/&[^;]+;/g, '')}`}
        >
          {/* Optimized Lazy Image */}
          <LazyImage
            src={optimizedImageUrl}
            alt={name.replace(/&[^;]+;/g, '')}
            className="w-full h-64 object-cover"
            onError={(e) => handleImageError(e, originalImageUrl)}
          />
          {/* Status Badge (optional) */}
          {status !== 'available' && (
             <Badge
               variant={status === 'adopted' ? "secondary" : "default"}
               className="absolute top-2 right-2"
             >
               {status.charAt(0).toUpperCase() + status.slice(1)}
             </Badge>
           )}
        </Link>
      </CardHeader>

      <CardContent className="p-4 flex flex-col flex-grow">
        <CardTitle className="text-lg font-bold mb-1 truncate group-hover:text-blue-600">
          <Link href={`/dogs/${id}`} className="hover:underline">
            <h3>{name}</h3>
          </Link>
        </CardTitle>
        {breed && (
          <p className="text-sm text-gray-600 mb-1 truncate">{breed}</p>
        )}
        {breedGroup && breedGroup !== 'Unknown' && (
          <Badge variant="outline" className="text-xs mb-2 w-fit">
            {breedGroup} Group
          </Badge>
        )}
        <p className="text-xs text-gray-500 flex-grow">
          {location !== "Unknown Location" ? location : <>&nbsp;</>}
        </p>

        {/* Organization Social Media */}
        {orgSocialMedia && Object.keys(orgSocialMedia).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Follow rescue org:</p>
            <SocialMediaLinks socialMedia={orgSocialMedia} className="justify-start" />
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
         <Link href={`/dogs/${id}`} passHref className="w-full">
           <Button
             size="sm"
             variant="outline"
             className="w-full"
           >
             Adopt {name}
           </Button>
         </Link>
      </CardFooter>
    </Card>
  );
});

export default DogCard;