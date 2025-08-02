import React from "react";
import { Button } from "@/components/ui/button";

export type EmptyStateVariant =
  | "noDogsFiltered"
  | "noDogsOrganization"
  | "noOrganizations"
  | "default";

interface ActionButton {
  text: string;
  onClick: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

interface IconProps {
  className?: string;
  [key: string]: any;
}

export interface EmptyStateProps {
  /** Visual variant of the empty state */
  variant?: EmptyStateVariant;
  /** Custom title (overrides variant default) */
  title?: string;
  /** Custom description (overrides variant default) */
  description?: string;
  /** Custom icon component (overrides variant default) */
  icon?: React.ComponentType<IconProps>;
  /** Custom action button (overrides variant default) */
  actionButton?: ActionButton;
  /** Clear filters callback for noDogsFiltered variant */
  onClearFilters?: () => void;
  /** Browse organizations callback for noDogsOrganization variant */
  onBrowseOrganizations?: () => void;
  /** Refresh callback for noOrganizations variant */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Context-aware empty state component with helpful messaging and actions
 * Supports multiple variants for different scenarios with appropriate icons and CTAs
 */
const EmptyState = React.memo<EmptyStateProps>(function EmptyState({
  variant = "default",
  title,
  description,
  icon: CustomIcon,
  actionButton,
  onClearFilters,
  onBrowseOrganizations,
  onRefresh,
  className = "",
}) {
  // Variant configurations
  const variants = {
    noDogsFiltered: {
      title: "No dogs match your filters",
      description:
        "Don't worry! Try adjusting your search criteria - maybe expand the age range, try a different size, or clear some filters. Every dog deserves a loving home! 🐕",
      icon: FilterIcon,
      actionButton: onClearFilters
        ? {
            text: "Clear All Filters & Start Fresh",
            onClick: onClearFilters,
            variant: "default" as const,
          }
        : null,
    },
    noDogsOrganization: {
      title: "No dogs available right now",
      description:
        "This organization doesn't have any dogs listed for adoption at the moment. But don't lose hope! Check back soon or explore other amazing rescue organizations doing wonderful work. 💝",
      icon: HeartIcon,
      actionButton: onBrowseOrganizations
        ? {
            text: "Explore Other Rescues",
            onClick: onBrowseOrganizations,
            variant: "default" as const,
          }
        : null,
    },
    noOrganizations: {
      title: "No organizations found",
      description:
        "We couldn't find any rescue organizations at the moment. This might be a temporary issue - please try refreshing the page.",
      icon: BuildingIcon,
      actionButton: onRefresh
        ? {
            text: "Refresh Page",
            onClick: onRefresh,
            variant: "default" as const,
          }
        : null,
    },
    default: {
      title: "No items found",
      description: "There are no items to display at the moment.",
      icon: InboxIcon,
      actionButton: null,
    },
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
      className={`bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-xl p-8 text-center border border-orange-200/50 dark:border-orange-800/30 shadow-sm animate-fade-in ${className}`}
      role="status"
      aria-label={`Empty state: ${finalTitle}`}
    >
      {/* Icon */}
      {IconComponent && (
        <div className="mb-6">
          <IconComponent
            data-testid="empty-state-icon"
            className="h-16 w-16 mx-auto text-orange-400 dark:text-orange-300 mb-2 animate-pulse-dot"
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-3 animate-fade-in-up">
        {finalTitle}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed animate-fade-in-up animate-stagger-1">
        {finalDescription}
      </p>

      {/* Action Button */}
      {finalActionButton && (
        <div className="animate-fade-in-up animate-stagger-2">
          <Button
            type="button"
            variant={finalActionButton.variant || "default"}
            onClick={finalActionButton.onClick}
            data-testid="clear-filters-button"
            className="animate-button-hover focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 px-6 py-3 rounded-lg text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {finalActionButton.text}
          </Button>
        </div>
      )}
    </div>
  );
});

// Icon components using Heroicons
const FilterIcon: React.FC<IconProps> = ({ className, ...props }) => (
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

const HeartIcon: React.FC<IconProps> = ({ className, ...props }) => (
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

const BuildingIcon: React.FC<IconProps> = ({ className, ...props }) => (
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

const InboxIcon: React.FC<IconProps> = ({ className, ...props }) => (
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
