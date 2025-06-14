/**
 * Hero image component with blurred background fill for dog detail pages
 * Implements true blurred background as specified in the original plan
 */
import React, { useState } from 'react';
import { getDetailHeroImageWithPosition } from '../../utils/imageUtils';
import { handleImageError } from '../../utils/imageUtils';

export const HeroImageWithBlurredBackground = ({ 
  src, 
  alt, 
  className = '', 
  onError = () => {},
  useGradientFallback = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { src: optimizedSrc, position } = getDetailHeroImageWithPosition(src);

  // Generate blurred version for background
  const blurredBackgroundSrc = src ? 
    (src.includes('res.cloudinary.com') ? 
      src.replace('/upload/', '/upload/w_800,h_450,c_fill,q_auto,f_auto,e_blur:800/') : 
      src) : 
    null;

  const handleLoad = () => {
    setImageLoaded(true);
  };

  const handleImageErrorInternal = (e) => {
    setHasError(true);
    handleImageError(e, src);
    onError(e);
  };

  if (hasError || !src) {
    return (
      <div className={`w-full aspect-[16/9] bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No image available</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-[16/9] rounded-lg overflow-hidden ${className}`}>
      {/* Background layer - either blurred image or gradient */}
      {useGradientFallback ? (
        // Gradient background fallback
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
      ) : (
        // Blurred background layer
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${blurredBackgroundSrc})`,
            filter: 'blur(20px)',
            transform: 'scale(1.1)', // Slightly scale to hide blur edges
          }}
        />
      )}
      
      {/* Semi-transparent overlay for better contrast */}
      <div className="absolute inset-0 bg-black bg-opacity-20" />
      
      {/* Sharp foreground image */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img
          src={optimizedSrc}
          alt={alt}
          className={`max-w-full max-h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          style={{ objectPosition: position }}
          onLoad={handleLoad}
          onError={handleImageErrorInternal}
        />
      </div>
      
      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroImageWithBlurredBackground;