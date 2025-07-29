"use client";

import React from 'react';

interface ImagePlaceholderProps {
  className?: string;
  testId?: string;
}

/**
 * Image placeholder component for progressive loading
 */
const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  className = "", 
  testId = "image-placeholder" 
}) => {
  return (
    <div 
      data-testid={testId}
      className={`bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center ${className}`}
    >
      <svg 
        className="w-12 h-12 text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );
};

export default ImagePlaceholder;