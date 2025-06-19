import React from 'react';
import { Button } from "@/components/ui/button";

/**
 * Context-aware empty state component with helpful messaging and actions
 * Supports multiple variants for different scenarios with appropriate icons and CTAs
 */
const EmptyState = React.memo(function EmptyState({
  variant = 'default',
  title,
  description,
  icon: CustomIcon,
  actionButton,
  onClearFilters,
  onBrowseOrganizations,
  onRefresh,
  className = ''
}) {
  // Variant configurations
  const variants = {
    noDogsFiltered: {
      title: 'No dogs match your filters',
      description: 'Try adjusting your search criteria or browse all available dogs. Sometimes the perfect match requires a bit more flexibility!',
      icon: FilterIcon,
      actionButton: onClearFilters ? {
        text: 'Clear All Filters',
        onClick: onClearFilters,
        variant: 'outline'
      } : null
    },
    noDogsOrganization: {
      title: 'No dogs available',
      description: 'This organization doesn\'t have any dogs listed for adoption at the moment. Check back soon or explore other rescue organizations.',
      icon: HeartIcon,
      actionButton: onBrowseOrganizations ? {
        text: 'Browse Other Organizations',
        onClick: onBrowseOrganizations,
        variant: 'default'
      } : null
    },
    noOrganizations: {
      title: 'No organizations found',
      description: 'We couldn\'t find any rescue organizations at the moment. This might be a temporary issue - please try refreshing the page.',
      icon: BuildingIcon,
      actionButton: onRefresh ? {
        text: 'Refresh Page',
        onClick: onRefresh,
        variant: 'default'
      } : null
    },
    default: {
      title: 'No items found',
      description: 'There are no items to display at the moment.',
      icon: InboxIcon,
      actionButton: null
    }
  };

  // Get configuration for current variant
  const config = variants[variant] || variants.default;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const IconComponent = CustomIcon || config.icon;
  const finalActionButton = actionButton || config.actionButton;

  return (
    <div
      data-testid="empty-state"
      className={`bg-gray-50 rounded-lg p-8 text-center border border-gray-200 ${className}`}
      role="status"
      aria-label={`Empty state: ${finalTitle}`}
    >
      {/* Icon */}
      {IconComponent && (
        <IconComponent 
          data-testid="empty-state-icon"
          className="h-12 w-12 mx-auto text-gray-400 mb-4" 
        />
      )}
      
      {/* Title */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {finalTitle}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 mb-4">
        {finalDescription}
      </p>
      
      {/* Action Button */}
      {finalActionButton && (
        <Button
          type="button"
          variant={finalActionButton.variant || 'default'}
          onClick={finalActionButton.onClick}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-4 py-2 rounded-md"
        >
          {finalActionButton.text}
        </Button>
      )}
    </div>
  );
});

// Icon components using Heroicons
const FilterIcon = ({ className, ...props }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" 
    />
  </svg>
);

const HeartIcon = ({ className, ...props }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
    />
  </svg>
);

const BuildingIcon = ({ className, ...props }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" 
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M4 22v-7" 
    />
  </svg>
);

const InboxIcon = ({ className, ...props }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h2.586a1 1 0 00.707-.293l-2.414-2.414A1 1 0 0013.586 13H4" 
    />
  </svg>
);

export default EmptyState;