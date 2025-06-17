import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import SocialMediaLinks from '../ui/SocialMediaLinks';
import LazyImage from '../ui/LazyImage';
import { handleImageError } from '../../utils/imageUtils';
import { 
  formatBasedIn, 
  formatServiceRegions, 
  formatShipsTo,
  getCountryFlag 
} from '../../utils/countryUtils';

export default function OrganizationCard({ organization }) {
  // Extract organization data with enhanced fields
  const name = organization?.name || "Sample Organization";
  const websiteUrl = organization?.website_url || "#";
  const logoUrl = organization?.logo_url || null;
  const socialMedia = organization?.social_media || {};
  const id = organization?.id || "0";
  
  // Enhanced data for the new card design
  const country = organization?.country;
  const city = organization?.city;
  const serviceRegions = organization?.service_regions || [];
  const shipsTo = organization?.ships_to || [];
  const totalDogs = organization?.total_dogs || 0;
  const newThisWeek = organization?.new_this_week || 0;
  const recentDogs = organization?.recent_dogs || [];

  // Helper function to generate organization initials
  const getInitials = (orgName) => {
    if (!orgName) return '?';
    const words = orgName.split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
  };

  return (
    <Card 
      className="overflow-hidden h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg border border-gray-200 bg-white cursor-pointer"
      onClick={() => window.location.href = `/organizations/${id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = `/organizations/${id}`;
        }
      }}
    >
      <CardHeader className="p-6 pb-4">
          {/* Logo and Organization Header */}
          <div className="flex items-center space-x-4">
            {/* 1. Organization Logo (64px with fallback to initials) */}
            <div className="flex-shrink-0">
              {logoUrl ? (
                <LazyImage 
                  src={logoUrl} 
                  alt={`${name} logo`} 
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  onError={(e) => handleImageError(e, logoUrl)}
                  placeholder={
                    <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center animate-pulse">
                      <span className="text-lg font-bold text-blue-600">
                        {getInitials(name)}
                      </span>
                    </div>
                  }
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center border border-gray-200">
                  <span className="text-lg font-bold text-blue-600">
                    {getInitials(name)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Organization Name and Base Location */}
            <div className="flex-grow min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{name}</h3>
              {city && country && (
                <p className="text-sm text-gray-600">
                  {city}, {country}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 pt-0 space-y-3">
          {/* 2. Three Location Info Lines */}
          <div className="space-y-2 text-sm">
            {/* Based in: [flag] [country] */}
            {country && (
              <div className="text-gray-700">
                <span className="font-medium">Based in:</span>{' '}
                <span className="hidden sm:inline">
                  {formatBasedIn(country, null, false)}
                </span>
                <span className="sm:hidden">
                  {formatBasedIn(country, null, true)}
                </span>
              </div>
            )}
            
            {/* Dogs in: [flags] [countries from service_regions array] */}
            {serviceRegions.length > 0 && (
              <div className="text-gray-700">
                <span className="font-medium">Dogs in:</span>{' '}
                <span className="hidden sm:inline">
                  {formatServiceRegions(serviceRegions, true, false)}
                </span>
                <span className="sm:hidden">
                  {formatServiceRegions(serviceRegions, false, true)}
                </span>
              </div>
            )}
            
            {/* Ships to: [first 3 flags] +X more */}
            {shipsTo.length > 0 && (
              <div className="text-gray-700">
                <span className="font-medium">Ships to:</span>{' '}
                <span className="hidden sm:inline">
                  {formatShipsTo(shipsTo, 3)}
                </span>
                <span className="sm:hidden">
                  {formatShipsTo(shipsTo, 2)}
                </span>
              </div>
            )}
          </div>

          {/* 3. Dog Count with "NEW this week" Badge */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {totalDogs}
              </span>
              <span className="text-sm text-gray-600">
                {totalDogs === 1 ? 'Dog' : 'Dogs'}
              </span>
              {newThisWeek > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  {newThisWeek} NEW
                </span>
              )}
            </div>
          </div>

          {/* 4. Preview of 3 Most Recent Dog Thumbnails */}
          {recentDogs.length > 0 && (
            <div className="pt-2">
              <div className="flex space-x-2 mb-2">
                {recentDogs.slice(0, 3).map((dog, index) => (
                  <div key={dog.id || index} className="flex-shrink-0">
                    <LazyImage 
                      src={dog.thumbnail_url || dog.primary_image_url} 
                      alt={dog.name || 'Dog preview'} 
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      onError={(e) => handleImageError(e, dog.thumbnail_url)}
                      placeholder={
                        <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
                      }
                    />
                  </div>
                ))}
              </div>
              
              {/* Preview text showing dog names */}
              <p className="text-xs text-gray-600">
                {recentDogs.slice(0, 3).map(dog => dog.name).filter(Boolean).join(', ')}
                {totalDogs > 3 && ` and ${totalDogs - 3} more looking for homes`}
              </p>
            </div>
          )}

          {/* 5. Social Media Links in Row */}
          {socialMedia && Object.keys(socialMedia).length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <SocialMediaLinks 
                socialMedia={socialMedia} 
                className="flex space-x-2 justify-start" 
                size="sm"
              />
            </div>
          )}
        </CardContent>

        {/* 6. Two CTAs: "Visit Website" and "View X Dogs →" */}
        <CardFooter className="p-6 pt-0">
          <div className="flex space-x-3 w-full">
            <Button 
              asChild 
              variant="outline" 
              size="sm" 
              className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <a 
                href={websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking button
              >
                Visit Website
              </a>
            </Button>
            
            <Button 
              size="sm" 
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              View {totalDogs} Dog{totalDogs !== 1 ? 's' : ''} →
            </Button>
          </div>
        </CardFooter>
      </Card>
  );
}