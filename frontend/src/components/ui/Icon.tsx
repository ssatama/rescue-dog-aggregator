import React from "react";
import { cn } from "@/lib/utils";
import {
  // Navigation icons
  X,
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,

  // UI icons
  Filter,
  Search,
  Heart,
  Share2,
  Copy,
  CheckCircle,

  // Social media icons
  Facebook,
  Instagram,
  Globe,

  // Status/info icons
  MapPin,
  Calendar,
  PawPrint,
  Tag,
  Ruler,
  Home,
  SortDesc,
  LocateFixed,
  Phone,

  // System icons
  AlertTriangle,
  RefreshCw,
  Check,

  // Theme icons
  Sun,
  Moon,
} from "lucide-react";

// Icon mapping - central registry of all icons used in the application
const iconMap = {
  // Navigation
  x: X,
  menu: Menu,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,

  // UI
  filter: Filter,
  search: Search,
  heart: Heart,
  share: Share2,
  copy: Copy,
  "check-circle": CheckCircle,

  // Social media
  facebook: Facebook,
  instagram: Instagram,
  globe: Globe,

  // Status/info
  "map-pin": MapPin,
  calendar: Calendar,
  "paw-print": PawPrint,
  tag: Tag,
  ruler: Ruler,
  home: Home,
  "sort-desc": SortDesc,
  "locate-fixed": LocateFixed,
  phone: Phone,

  // System
  "alert-triangle": AlertTriangle,
  refresh: RefreshCw,
  check: Check,

  // Theme
  sun: Sun,
  moon: Moon,
} as const;

// Size configuration
const sizeClasses = {
  small: "w-4 h-4",
  default: "w-5 h-5",
  medium: "w-6 h-6",
  large: "w-8 h-8",
} as const;

// Color configuration
const colorClasses = {
  default: "text-gray-600",
  interactive: "text-gray-600 hover:text-orange-600 transition-colors",
  active: "text-orange-600",
  "on-dark": "text-white",
} as const;

// Type definitions
export type IconName = keyof typeof iconMap;
export type IconSize = keyof typeof sizeClasses;
export type IconColor = keyof typeof colorClasses;

export interface IconProps {
  /** Icon name from the iconMap */
  name: IconName;
  /** Icon size */
  size?: IconSize;
  /** Icon color theme */
  color?: IconColor;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label (removes aria-hidden) */
  "aria-label"?: string;
  /** For heart icon, whether to show filled state */
  filled?: boolean;
  /** Additional props passed to the icon component */
  [key: string]: any;
}

/**
 * Unified Icon component for consistent icon usage across the application
 */
export function Icon({
  name,
  size = "default",
  color = "default",
  className,
  "aria-label": ariaLabel,
  filled = false,
  ...props
}: IconProps) {
  // Get the icon component from the map
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    throw new Error(
      `Icon "${name}" not found in iconMap. Available icons: ${Object.keys(iconMap).join(", ")}`,
    );
  }

  // Get size classes with fallback
  const sizeClass = sizeClasses[size] || sizeClasses.default;

  // Get color classes with fallback
  const colorClass = colorClasses[color] || colorClasses.default;

  // Determine accessibility attributes
  const accessibilityProps = ariaLabel
    ? { "aria-label": ariaLabel, role: "img" as const }
    : { "aria-hidden": "true" as const, role: "img" as const };

  // Special handling for heart icon fill state
  const iconProps =
    name === "heart" && filled ? { fill: "currentColor", ...props } : props;

  return (
    <IconComponent
      className={cn(sizeClass, colorClass, className)}
      {...accessibilityProps}
      {...iconProps}
    />
  );
}

// Export icon names for TypeScript and development convenience
export const iconNames = Object.keys(iconMap) as IconName[];

// Export for external use
Icon.displayName = "Icon";
