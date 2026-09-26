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

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
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
        "Try removing a filter or two, or widening the age or size. New dogs are listed three times a week.",
      icon: FilterIcon,
      actionButton: onClearFilters
        ? {
            text: "Clear all filters",
            onClick: onClearFilters,
            variant: "default" as const,
          }
        : null,
    },
    noDogsOrganization: {
      title: "No dogs available right now",
      description:
        "This rescue has no dogs listed right now. Their list is updated three times a week.",
      icon: HeartIcon,
      actionButton: onBrowseOrganizations
        ? {
            text: "See other rescues",
            onClick: onBrowseOrganizations,
            variant: "default" as const,
          }
        : null,
    },
    noOrganizations: {
      title: "No rescues to show",
      description:
        "We couldn't load the rescues. This is usually temporary.",
      icon: BuildingIcon,
      actionButton: onRefresh
        ? {
            text: "Try again",
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
      className={`rounded-xl border border-line bg-surface p-8 text-center ${className}`}
      role="status"
      aria-label={`Empty state: ${finalTitle}`}
    >
      {/* Icon */}
      {IconComponent && (
        <div className="mb-4">
          <IconComponent
            data-testid="empty-state-icon"
            className="mx-auto h-10 w-10 text-subtle"
          />
        </div>
      )}

      {/* Title */}
      <h2 className="mb-2 font-display text-xl font-bold text-ink">
        {finalTitle}
      </h2>

      {/* Description */}
      <p className="mx-auto mb-6 max-w-md leading-relaxed text-subtle">
        {finalDescription}
      </p>

      {/* Action Button */}
      {finalActionButton && (
        <div>
          <Button
            type="button"
            variant={finalActionButton.variant || "default"}
            onClick={finalActionButton.onClick}
            data-testid="clear-filters-button"
            className="h-11 rounded-lg bg-orange-700 px-5 font-semibold text-white hover:bg-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
