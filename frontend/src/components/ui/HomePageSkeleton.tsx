import React from "react";
import { cn } from "@/lib/utils";

interface HomePageSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function HeroSkeleton() {
  return (
    <div data-testid="hero-skeleton" className="py-12 md:py-20">
      <div className="max-w-4xl mx-auto text-center px-4">
        <div className="h-12 md:h-16 w-3/4 mx-auto bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="h-6 md:h-8 w-2/3 mx-auto bg-gray-200 rounded animate-pulse mb-8" />
        <div className="flex justify-center gap-8 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2 mx-auto" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <div className="h-12 w-36 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-12 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PlatformCapabilitiesSkeleton() {
  return (
    <div data-testid="capabilities-skeleton" className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-8 w-64 mx-auto bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse mb-4" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedDogsSkeleton() {
  return (
    <div data-testid="featured-skeleton" className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-8 w-48 mx-auto bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
              <div className="p-4">
                <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHomeSkeleton() {
  return (
    <div className="px-4 py-6">
      <div className="h-10 w-3/4 bg-gray-200 rounded-lg animate-pulse mb-4" />
      <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="flex gap-4 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-100 p-4 rounded-xl">
            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="aspect-video bg-gray-200 animate-pulse" />
            <div className="p-3">
              <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePageSkeleton({
  className,
  ...props
}: HomePageSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading home page"
      aria-busy="true"
      className={cn("min-h-screen bg-background", className)}
      {...props}
    >
      <div data-testid="mobile-skeleton" className="sm:hidden">
        <MobileHomeSkeleton />
      </div>

      <div data-testid="desktop-skeleton" className="hidden sm:block">
        <HeroSkeleton />
        <PlatformCapabilitiesSkeleton />
        <FeaturedDogsSkeleton />
      </div>
    </div>
  );
}
