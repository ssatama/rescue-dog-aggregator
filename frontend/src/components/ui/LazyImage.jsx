"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  priority = false,
  fill = false,
  sizes,
  width,
  height,
  onLoad,
  placeholder = 'blur',
  blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { targetRef, hasIntersected } = useIntersectionObserver({
    rootMargin: '100px'
  });

  const shouldLoad = priority || hasIntersected;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div 
        ref={targetRef}
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        <span className="text-gray-400 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div ref={targetRef} className={`relative ${className}`}>
      {shouldLoad ? (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          sizes={sizes}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          priority={priority}
        />
      ) : (
        <div 
          className="bg-gray-200 animate-pulse"
          style={!fill ? { width, height } : { position: 'absolute', inset: 0 }}
        />
      )}
    </div>
  );
}