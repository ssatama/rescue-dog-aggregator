import React from 'react';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

// Icon mapping - central registry of all icons used in the application
const iconMap = {
  // Navigation
  'x': X,
  'menu': Menu,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  
  // UI
  'filter': Filter,
  'search': Search,
  'heart': Heart,
  'share': Share2,
  'copy': Copy,
  'check-circle': CheckCircle,
  
  // Social media
  'facebook': Facebook,
  'instagram': Instagram,
  'globe': Globe,
  
  // Status/info
  'map-pin': MapPin,
  'calendar': Calendar,
  'paw-print': PawPrint,
  'tag': Tag,
  'ruler': Ruler,
  'home': Home,
  'sort-desc': SortDesc,
  'locate-fixed': LocateFixed,
  'phone': Phone,
  
  // System
  'alert-triangle': AlertTriangle,
  'refresh': RefreshCw,
  'check': Check,
};

// Size configuration
const sizeClasses = {
  small: 'w-4 h-4',
  default: 'w-5 h-5',
  medium: 'w-6 h-6',
  large: 'w-8 h-8',
};

// Color configuration
const colorClasses = {
  default: 'text-gray-600',
  interactive: 'text-gray-600 hover:text-orange-600 transition-colors',
  active: 'text-orange-600',
  'on-dark': 'text-white',
};

/**
 * Unified Icon component for consistent icon usage across the application
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Icon name from the iconMap
 * @param {('small'|'default'|'medium'|'large')} props.size - Icon size
 * @param {('default'|'interactive'|'active'|'on-dark')} props.color - Icon color theme
 * @param {string} props.className - Additional CSS classes
 * @param {string} props['aria-label'] - Accessibility label (removes aria-hidden)
 * @param {boolean} props.filled - For heart icon, whether to show filled state
 * @param {...Object} props - Additional props passed to the icon component
 */
export function Icon({ 
  name, 
  size = 'default', 
  color = 'default', 
  className,
  'aria-label': ariaLabel,
  filled = false,
  ...props 
}) {
  // Get the icon component from the map
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    throw new Error(`Icon "${name}" not found in iconMap. Available icons: ${Object.keys(iconMap).join(', ')}`);
  }
  
  // Get size classes with fallback
  const sizeClass = sizeClasses[size] || sizeClasses.default;
  
  // Get color classes with fallback
  const colorClass = colorClasses[color] || colorClasses.default;
  
  // Determine accessibility attributes
  const accessibilityProps = ariaLabel 
    ? { 'aria-label': ariaLabel, role: 'img' }
    : { 'aria-hidden': 'true', role: 'img' };
  
  // Special handling for heart icon fill state
  const iconProps = name === 'heart' && filled 
    ? { fill: 'currentColor', ...props }
    : props;
  
  return (
    <IconComponent 
      className={cn(sizeClass, colorClass, className)}
      {...accessibilityProps}
      {...iconProps}
    />
  );
}

// Export icon names for TypeScript and development convenience
export const iconNames = Object.keys(iconMap);

// Export for external use
Icon.displayName = 'Icon';