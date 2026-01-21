import { ReactElement } from "react";
import type { Dog } from "@/types/dog";

interface DogsGridProps extends React.HTMLAttributes<HTMLDivElement> {
  dogs?: Dog[];
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  emptyStateVariant?: string;
  onClearFilters?: () => void;
  onBrowseOrganizations?: () => void;
  loadingType?: "initial" | "filter" | "pagination";
  listContext?: string;
}

declare const DogsGrid: React.FC<DogsGridProps>;

export default DogsGrid;
