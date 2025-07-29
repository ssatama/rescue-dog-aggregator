import React, { memo } from 'react';
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
  formatShipsToList,
  getCountryFlag 
} from '../../utils/countries';

const OrganizationCard = memo(function OrganizationCard({ organization, size = 'large' }) {
  // Extract organization data with enhanced fields
  const name = organization?.name || "Sample Organization";
  const websiteUrl = organization?.website_url || "#";
  const logoUrl = organization?.logo_url || null;
  const socialMedia = organization?.social_media || {};
  const id = organization?.id || "0";
  const slug = organization?.slug || `unknown-org-${id}`;
  
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

  // Size-based styling configurations
  const sizeStyles = {
    small: {
      logo: 'w-12 h-12', // 48px
      initialsText: 'text-base',
      name: 'text-base',
      location: 'text-xs',
      dogCount: 'text-xl',
      locationInfo: 'text-xs',
      spacing: 'space-y-2',
      padding: 'p-3 sm:p-3',
      contentPadding: 'p-3 sm:p-3 pt-0',
      footerPadding: 'p-5 md:p-6',
      dogThumbnail: 'w-10 h-10',
      buttonHeight: 'min-h-[44px] md:min-h-[48px]',
      socialSize: 'xs'
    },
    medium: {
      logo: 'w-14 h-14', // 56px
      initialsText: 'text-lg',
      name: 'text-lg',
      location: 'text-sm',
      dogCount: 'text-2xl',
      locationInfo: 'text-sm',
      spacing: 'space-y-2',
      padding: 'p-4 sm:p-4',
      contentPadding: 'p-4 sm:p-4 pt-0',
      footerPadding: 'p-5 md:p-6',
      dogThumbnail: 'w-11 h-11',
      buttonHeight: 'min-h-[44px] md:min-h-[48px]',
      socialSize: 'sm'
    },
    large: {
      logo: 'w-16 h-16', // 64px
      initialsText: 'text-lg',
      name: 'text-lg',
      location: 'text-sm',
      dogCount: 'text-2xl',
      locationInfo: 'text-sm',
      spacing: 'space-y-2 sm:space-y-3',
      padding: 'p-4 sm:p-6 pb-3 sm:pb-4',
      contentPadding: 'p-4 sm:p-6 pt-0',
      footerPadding: 'p-4 sm:p-6',
      dogThumbnail: 'w-12 h-12',
      buttonHeight: 'min-h-[44px] md:min-h-[52px]',
      socialSize: 'sm'
    }
  };

  const styles = sizeStyles[size] || sizeStyles.large;

  return (
    <Card 
      className="flex flex-col overflow-hidden cursor-pointer transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
      onClick={() => window.location.href = `/organizations/${slug}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = `/organizations/${slug}`;
        }
      }}
      data-testid="organization-card"
    >
      <CardHeader className={styles.padding}>
          {/* Logo and Organization Header */}
          <div className="flex items-center space-x-4">
            {/* 1. Organization Logo (64px with fallback to initials) */}
            <div className="flex-shrink-0">
              {logoUrl ? (
                <LazyImage 
                  src={logoUrl} 
                  alt={`${name} logo`} 
                  className={`${styles.logo} rounded-lg object-cover`}
                  sizes="(max-width: 640px) 64px, (max-width: 1024px) 56px, 64px"
                  onError={(e) => handleImageError(e, logoUrl)}
                  placeholder={
                    <div className={`${styles.logo} rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center animate-pulse`}>
                      <span className={`${styles.initialsText} font-bold text-orange-600`}>
                        {getInitials(name)}
                      </span>
                    </div>
                  }
                />
              ) : (
                <div className={`${styles.logo} rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center`}>
                  <span className={`${styles.initialsText} font-bold text-orange-600`}>
                    {getInitials(name)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Organization Name and Base Location */}
            <div className="flex-grow min-w-0">
              <h3 className={`text-card-title text-foreground mb-1 truncate`} data-testid="org-name">{name}</h3>
              {city && country && (
                <p className={`${styles.location} text-muted-foreground`} data-testid="org-location">
                  {city}, {country}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`${styles.contentPadding} ${styles.spacing}`}>
          {/* 2. Three Location Info Lines */}
          <div className={`space-y-2 ${styles.locationInfo}`}>
            {/* Based in: [flag] [country] */}
            {country && (
              <div className="text-foreground" data-testid="organization-location">
                <span className="font-medium">Based in:</span>{' '}
                <span className="hidden sm:inline">
                  {formatBasedIn(country, city, false)}
                </span>
                <span className="sm:hidden">
                  {formatBasedIn(country, city, true)}
                </span>
              </div>
            )}
            
            {/* Dogs in: [flags] [countries from service_regions array] */}
            {serviceRegions.length > 0 && (
              <div className="text-foreground">
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
              <div className="text-foreground">
                <span className="font-medium">Adoptable to:</span>{' '}
                <span className="hidden sm:inline">
                  {formatShipsToList(shipsTo, 3)}
                </span>
                <span className="sm:hidden">
                  {formatShipsToList(shipsTo, 2)}
                </span>
              </div>
            )}
          </div>

          {/* 3. Dog Count with "NEW this week" Badge */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <span className={`${styles.dogCount} font-bold text-foreground`} data-testid="org-dog-count">
                {totalDogs}
              </span>
              <span className="text-sm text-muted-foreground">
                {totalDogs === 1 ? 'Dog' : 'Dogs'}
              </span>
              {newThisWeek > 0 && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-medium">
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
                      className={`${styles.dogThumbnail} rounded-lg object-cover`}
                      sizes="(max-width: 640px) 40px, (max-width: 1024px) 44px, 48px"
                      onError={(e) => handleImageError(e, dog.thumbnail_url)}
                      placeholder={
                        <div className={`${styles.dogThumbnail} rounded-lg bg-muted animate-pulse`} />
                      }
                    />
                  </div>
                ))}
              </div>
              
              {/* Preview text showing dog names */}
              <p className="text-xs text-muted-foreground">
                {recentDogs.slice(0, 3).map(dog => dog.name).filter(Boolean).join(', ')}
                {totalDogs > 3 && ` and ${totalDogs - 3} more looking for homes`}
              </p>
            </div>
          )}

          {/* 5. Social Media Links in Row */}
          {socialMedia && Object.keys(socialMedia).length > 0 && (
            <div className="pt-3 border-t border-border">
              <SocialMediaLinks 
                socialMedia={socialMedia} 
                className="flex space-x-2 justify-start" 
                size={styles.socialSize}
              />
            </div>
          )}
        </CardContent>

        {/* 6. Two CTAs: "Visit Website" and "View X Dogs →" */}
        <CardFooter className={`${styles.footerPadding} mt-auto`}>
          <div className="flex space-x-3 md:space-x-6 w-full">
            <Button 
              asChild 
              variant="outline" 
              size="sm" 
              className={`flex-1 text-foreground border-border hover:bg-muted animate-button-hover ${styles.buttonHeight}`}
            >
              <a 
                href={websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 rounded"
                onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking button
              >
                Visit Website
              </a>
            </Button>
            
            <Button 
              size="sm" 
              className={`flex-1 bg-orange-600 hover:bg-orange-700 text-white animate-button-hover ${styles.buttonHeight} text-center`}
            >
              {size === 'small' ? (
                <span>Meet {totalDogs}</span>
              ) : (
                <>
                  <span>View </span>
                  <span>{totalDogs} Dog{totalDogs !== 1 ? 's' : ''}</span>
                  <span> →</span>
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if these props change
  return (
    prevProps.size === nextProps.size &&
    prevProps.organization?.id === nextProps.organization?.id &&
    prevProps.organization?.name === nextProps.organization?.name &&
    prevProps.organization?.total_dogs === nextProps.organization?.total_dogs &&
    prevProps.organization?.new_this_week === nextProps.organization?.new_this_week
  );
});

OrganizationCard.displayName = 'OrganizationCard';

export default OrganizationCard;