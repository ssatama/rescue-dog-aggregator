import React from "react";
import { Card } from "@/components/ui/card";

const DogCardSkeletonOptimized = React.memo(function DogCardSkeletonOptimized({ 
  compact = false,
  priority = false 
}) {
  const baseClasses = "animate-pulse bg-muted/50 skeleton-element";
  
  if (compact) {
    return (
      <Card 
        className="rounded-lg bg-card text-card-foreground shadow-sm dark:shadow-lg dark:shadow-purple-500/5 hover:shadow-md transition-shadow duration-200 will-change-transform overflow-hidden flex flex-row md:flex-col h-auto md:h-full"
        data-testid="dog-card-skeleton"
        role="status"
        aria-label="Loading dog information"
      >
        <div className="w-32 md:w-full flex-shrink-0">
          <div className={`aspect-[4/3] ${baseClasses}`} />
        </div>
        <div className="flex-1 p-3 md:p-4 space-y-2">
          <div className={`h-5 w-3/4 rounded ${baseClasses}`} />
          <div className={`h-4 w-1/2 rounded ${baseClasses}`} />
          <div className="flex gap-2 mt-3">
            <div className={`h-6 w-16 rounded-full ${baseClasses}`} />
            <div className={`h-6 w-20 rounded-full ${baseClasses}`} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="rounded-lg bg-card text-card-foreground shadow-sm dark:shadow-lg dark:shadow-purple-500/5 hover:shadow-md transition-shadow duration-200 will-change-transform overflow-hidden h-full"
      data-testid="dog-card-skeleton"
      role="status"
      aria-label="Loading dog information"
    >
      <div className={`aspect-[4/3] relative ${baseClasses}`}>
        {priority && (
          <div className="absolute top-2 left-2 h-6 w-12 rounded-full bg-muted/70" />
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className={`h-6 w-3/4 rounded ${baseClasses}`} />
        <div className="space-y-2">
          <div className={`h-4 w-1/2 rounded ${baseClasses}`} />
          <div className={`h-4 w-2/3 rounded ${baseClasses}`} />
        </div>
        <div className="flex gap-2 mt-4">
          <div className={`h-6 w-16 rounded-full ${baseClasses}`} />
          <div className={`h-6 w-20 rounded-full ${baseClasses}`} />
        </div>
        <div className={`h-4 w-full rounded ${baseClasses} mt-3`} />
        <div className={`h-10 w-full rounded ${baseClasses} mt-4`} />
      </div>
    </Card>
  );
});

export default DogCardSkeletonOptimized;