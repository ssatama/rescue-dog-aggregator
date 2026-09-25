import type { ReactNode } from "react";
import type { Dog, DogStatus } from "./dog";
import type { EmptyStateVariant } from "../components/ui/EmptyState";
import type { ErrorBoundaryState } from "./uiComponents";

export type { ErrorBoundaryProps, ErrorBoundaryState, ExpandableTextProps } from "./uiComponents";
export type { DogStatus };
export type ListContext = "home" | "search" | "org-page" | "favorites" | "breed-page" | "similar";
export type LoadingType = "initial" | "filter" | "pagination";

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

export interface SimilarDogsSectionProps {
  dog: Dog;
  /** Server-fetched similar dogs; when given, no client fetch happens */
  initialDogs?: Dog[];
}

export interface DogCardErrorBoundaryProps {
  dogId?: number | string;
  children: ReactNode;
}

export type DogCardErrorBoundaryState = ErrorBoundaryState;

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
