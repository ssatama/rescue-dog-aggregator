/**
 * Comprehensive loading skeleton for dog detail pages
 * Provides smooth, polished loading states with proper animations
 */
import React from "react";
import SkeletonPulse from "./SkeletonPulse";

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = "100%",
  height = "h-4",
  className = "",
}) => (
  <SkeletonPulse
    standalone={false}
    className={`${height} ${className}`}
    style={{ width }}
  />
);

interface SkeletonCardProps {
  children: React.ReactNode;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  children,
  className = "",
}) => (
  <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>{children}</div>
);

export const DogDetailSkeleton: React.FC = () => {
  return (
    <div
      className="max-w-4xl mx-auto p-4 animate-in fade-in duration-300"
      data-testid="dog-detail-skeleton"
      role="status"
      aria-label="Loading dog details"
    >
      <span className="sr-only">Loading dog details, please wait...</span>
      {/* Breadcrumb Skeleton */}
      <div className="mb-8">
        <div className="flex items-center space-x-2">
          <SkeletonLine width="60px" height="h-4" />
          <span className="text-gray-300">/</span>
          <SkeletonLine width="80px" height="h-4" />
          <span className="text-gray-300">/</span>
          <SkeletonLine width="120px" height="h-4" />
        </div>
      </div>

      {/* Back Button Skeleton */}
      <div className="mb-8">
        <SkeletonLine width="140px" height="h-5" />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-8">
            {/* Hero Image Skeleton */}
            <div className="w-full">
              <HeroImageSkeleton />
            </div>

            {/* Content Section */}
            <div className="w-full">
              {/* Header Skeleton */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <SkeletonLine width="60%" height="h-10" className="mb-2" />
                  <SkeletonLine width="40%" height="h-6" />
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <SkeletonPulse
                    standalone={false}
                    className="w-10 h-10 rounded-full"
                  />
                  <SkeletonPulse
                    standalone={false}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
              </div>

              {/* Breed Section Skeleton */}
              <div className="mb-8">
                <SkeletonLine width="80px" height="h-7" className="mb-3" />
                <SkeletonLine width="200px" height="h-5" />
              </div>

              {/* Info Cards Skeleton */}
              <InfoCardsSkeleton />

              {/* About Section Skeleton */}
              <AboutSectionSkeleton />

              {/* Organization Section Skeleton */}
              <OrganizationSkeleton />

              {/* Related Dogs Section Skeleton */}
              <RelatedDogsSkeleton />

              {/* CTA Section Skeleton */}
              <CTASkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hero Image Skeleton with progressive loading effect
export const HeroImageSkeleton: React.FC = () => (
  <div
    className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-200"
    data-testid="hero-image-skeleton"
  >
    {/* Animated shimmer effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
    </div>

    {/* Camera icon placeholder */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  </div>
);

// Info Cards Skeleton Grid
export const InfoCardsSkeleton: React.FC = () => (
  <div
    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
    data-testid="info-cards-skeleton"
  >
    {[1, 2, 3, 4].map((index) => (
      <SkeletonCard key={index} className="text-center">
        <SkeletonPulse
          standalone={false}
          className="w-8 h-8 mx-auto mb-2 rounded"
        />
        <SkeletonLine width="60%" height="h-3" className="mb-1 mx-auto" />
        <SkeletonLine width="80%" height="h-4" className="mx-auto" />
      </SkeletonCard>
    ))}
  </div>
);

// About Section Skeleton
export const AboutSectionSkeleton: React.FC = () => (
  <div className="mb-8" data-testid="about-section-skeleton">
    <SkeletonLine width="200px" height="h-7" className="mb-4" />
    <div className="space-y-3">
      <SkeletonLine width="100%" height="h-4" />
      <SkeletonLine width="95%" height="h-4" />
      <SkeletonLine width="88%" height="h-4" />
      <SkeletonLine width="75%" height="h-4" />
    </div>
  </div>
);

// Organization Section Skeleton
export const OrganizationSkeleton: React.FC = () => (
  <div className="mb-8" data-testid="organization-skeleton">
    <SkeletonCard className="p-6">
      <div className="flex items-start space-x-4">
        <SkeletonPulse standalone={false} className="w-6 h-6 rounded" />
        <div className="flex-1">
          <SkeletonLine width="200px" height="h-6" className="mb-2" />
          <SkeletonLine width="150px" height="h-4" className="mb-4" />
          <div className="flex space-x-2">
            <SkeletonPulse standalone={false} className="w-24 h-8 rounded" />
            <SkeletonPulse standalone={false} className="w-32 h-8 rounded" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  </div>
);

// Related Dogs Section Skeleton
export const RelatedDogsSkeleton: React.FC = () => (
  <div className="mb-8" data-testid="related-dogs-skeleton">
    <SkeletonLine width="300px" height="h-7" className="mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <SkeletonPulse standalone={false} className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-2">
            <SkeletonLine width="80%" height="h-5" />
            <SkeletonLine width="60%" height="h-4" />
            <SkeletonLine width="50%" height="h-4" />
          </div>
        </div>
      ))}
    </div>
    <div className="text-center">
      <SkeletonLine width="180px" height="h-4" className="mx-auto" />
    </div>
  </div>
);

// CTA Section Skeleton
export const CTASkeleton: React.FC = () => (
  <div className="mb-8" data-testid="cta-skeleton">
    <div className="flex justify-center">
      <SkeletonPulse
        standalone={false}
        className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-[400px] h-14 rounded-lg"
      />
    </div>
    <div className="text-center mt-3">
      <SkeletonLine width="300px" height="h-4" className="mx-auto" />
    </div>
  </div>
);

export default DogDetailSkeleton;
