import { ReactElement } from 'react';

interface DogsGridProps {
  dogs?: any[];
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  emptyStateVariant?: string;
  onClearFilters?: () => void;
  onBrowseOrganizations?: () => void;
  loadingType?: 'initial' | 'filter' | 'pagination';
  [key: string]: any;
}

declare const DogsGrid: React.FC<DogsGridProps>;

export default DogsGrid;