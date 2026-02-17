import type { ReactNode } from "react";
import type { Dog } from "./dog";
import type { EmptyStateVariant } from "../components/ui/EmptyState";

export type ListContext = "home" | "search" | "org-page" | "favorites" | "breed-page";
export type LoadingType = "initial" | "filter" | "pagination";
export type DogStatus = "available" | "unknown" | "adopted" | "reserved";

export interface DogCardOptimizedProps {
  dog: Dog;
  priority?: boolean;
  compact?: boolean;
  embedded?: boolean;
  isVirtualized?: boolean;
  position?: number;
  listContext?: ListContext;
  disableContainment?: boolean;
}

export interface DogCardSkeletonOptimizedProps {
  compact?: boolean;
  priority?: boolean;
}

export interface DogDescriptionProps {
  description?: string;
  dogName?: string;
  organizationName?: string;
  className?: string;
}

export interface DogStatusBadgeProps {
  status?: DogStatus;
  className?: string;
}

export interface AdoptedCelebrationProps {
  dogName?: string;
}

export interface DogsGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  dogs?: Dog[];
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  emptyStateVariant?: EmptyStateVariant;
  onClearFilters?: () => void;
  onBrowseOrganizations?: () => void;
  loadingType?: LoadingType;
  listContext?: ListContext;
}

export interface RelatedDogsCardProps {
  dog: Dog;
}

export interface RelatedDogsSectionProps {
  organizationId: number | string;
  currentDogId: number | string;
  organization?: {
    id?: number;
    name?: string;
  };
}

export interface DogCardErrorBoundaryProps {
  dogId?: number | string;
  children: ReactNode;
}

export interface DogCardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface DogDetailErrorBoundaryProps {
  dogSlug?: string;
  children: ReactNode;
}

export interface DogDetailErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export interface DogSectionErrorBoundaryProps {
  children: ReactNode;
}

export interface DogSectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
