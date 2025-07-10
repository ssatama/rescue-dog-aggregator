import React from 'react';
import { cn } from '@/lib/utils';
import SkeletonPulse from './SkeletonPulse';

/**
 * ContentSkeleton - Text content loading skeleton with varied line widths
 * 
 * Simulates text content loading with multiple lines of varied widths to create
 * a realistic placeholder for paragraphs, lists, and other text-based content.
 * Uses the SkeletonPulse base component for consistent styling.
 * 
 * @param {number} lines - Number of skeleton lines to render (default: 3)
 * @param {string} lineHeight - CSS class for line height (default: 'h-4')
 * @param {string} className - Additional CSS classes for container
 * @param {string} aria-label - Custom aria-label for accessibility
 * @param {object} props - Additional props forwarded to container
 */
const ContentSkeleton = React.memo(function ContentSkeleton({
  lines = 3,
  lineHeight = 'h-4',
  className = '',
  'aria-label': ariaLabel = 'Loading content',
  ...props
}) {
  // Width patterns for varied text simulation
  const widthPatterns = ['w-3/4', 'w-1/2', 'w-5/6', 'w-full', 'w-2/3', 'w-4/5'];
  
  // Generate lines with varied widths
  const generateLines = () => {
    const skeletonLines = [];
    
    for (let i = 0; i < lines; i++) {
      // Cycle through width patterns with some variation
      const widthClass = widthPatterns[i % widthPatterns.length];
      
      skeletonLines.push(
        <SkeletonPulse
          key={i}
          standalone={false}
          className={cn(lineHeight, widthClass)}
        />
      );
    }
    
    return skeletonLines;
  };

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
      className={cn("space-y-3", className)}
      {...props}
    >
      {generateLines()}
    </div>
  );
});

ContentSkeleton.displayName = 'ContentSkeleton';

export default ContentSkeleton;