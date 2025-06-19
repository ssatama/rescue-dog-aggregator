import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/**
 * Skeleton loading component that matches the exact structure and dimensions of OrganizationCard
 * Uses animate-pulse for smooth loading animation with gray-200 skeleton elements
 */
const OrganizationCardSkeleton = React.memo(function OrganizationCardSkeleton() {
  return (
    <Card 
      data-testid="organization-card-skeleton"
      className="overflow-hidden h-full border border-gray-200 bg-white animate-pulse"
      role="status"
      aria-label="Loading organization information"
    >
      <CardHeader data-testid="skeleton-header" className="p-6 pb-4">
        {/* Logo and Organization Header */}
        <div className="flex items-center space-x-4">
          {/* Organization Logo skeleton (64px) */}
          <div className="flex-shrink-0">
            <div 
              data-testid="skeleton-logo"
              className="w-16 h-16 rounded-lg bg-gray-200"
            />
          </div>
          
          {/* Organization Name and Base Location */}
          <div className="flex-grow min-w-0 space-y-2">
            <div 
              data-testid="skeleton-org-name"
              className="h-5 bg-gray-200 rounded w-3/4"
            />
            <div 
              data-testid="skeleton-org-location"
              className="h-4 bg-gray-200 rounded w-1/2"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent data-testid="skeleton-content" className="p-6 pt-0 space-y-3">
        {/* Three Location Info Lines */}
        <div data-testid="skeleton-location-info" className="space-y-2 text-sm">
          {/* Based in */}
          <div 
            data-testid="skeleton-based-in"
            className="flex items-center gap-2"
          >
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          
          {/* Dogs in */}
          <div 
            data-testid="skeleton-dogs-in"
            className="flex items-center gap-2"
          >
            <div className="h-4 bg-gray-200 rounded w-14" />
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-4 h-4 bg-gray-200 rounded" />
            </div>
          </div>
          
          {/* Ships to */}
          <div 
            data-testid="skeleton-ships-to"
            className="flex items-center gap-2"
          >
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-4 h-4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Dog Count with "NEW this week" Badge */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <div 
              data-testid="skeleton-dog-count"
              className="h-8 bg-gray-200 rounded w-12"
            />
            <div 
              data-testid="skeleton-dog-label"
              className="h-4 bg-gray-200 rounded w-8"
            />
            <div 
              data-testid="skeleton-new-badge"
              className="h-5 bg-gray-200 rounded w-16"
            />
          </div>
        </div>

        {/* Preview of 3 Most Recent Dog Thumbnails */}
        <div className="pt-2">
          <div className="flex space-x-2 mb-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex-shrink-0">
                <div 
                  data-testid="skeleton-dog-thumbnail"
                  className="w-12 h-12 rounded-lg bg-gray-200"
                />
              </div>
            ))}
          </div>
          
          {/* Preview text skeleton */}
          <div 
            data-testid="skeleton-preview-text"
            className="h-3 bg-gray-200 rounded w-full"
          />
        </div>

        {/* Social Media Links skeleton */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex space-x-2 justify-start">
            {[0, 1, 2].map((index) => (
              <div 
                key={index}
                data-testid="skeleton-social-icon"
                className="w-6 h-6 bg-gray-200 rounded"
              />
            ))}
          </div>
        </div>
      </CardContent>

      {/* Two CTAs skeleton */}
      <CardFooter data-testid="skeleton-footer" className="p-6 pt-0">
        <div data-testid="skeleton-button-container" className="flex space-x-3 w-full">
          <div 
            data-testid="skeleton-website-button"
            className="h-8 bg-gray-200 rounded flex-1"
          />
          <div 
            data-testid="skeleton-view-dogs-button"
            className="h-8 bg-gray-200 rounded flex-1"
          />
        </div>
      </CardFooter>
    </Card>
  );
});

export default OrganizationCardSkeleton;