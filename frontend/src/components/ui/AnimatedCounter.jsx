// frontend/src/components/ui/AnimatedCounter.jsx

"use client";

import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCounter component that animates from 0 to the target value when scrolled into view
 * @param {number} value - Target value to animate to
 * @param {number} duration - Animation duration in milliseconds (default: 2000)
 * @param {string} label - Accessibility label for screen readers
 * @param {string} className - Additional CSS classes
 */
export default function AnimatedCounter({ 
  value = 0, 
  duration = 2000, 
  label = '', 
  className = '' 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Easing function for smooth animation
  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Start animation
  const startAnimation = () => {
    if (hasAnimated || prefersReducedMotion) {
      setDisplayValue(Math.max(0, Math.round(value)));
      setHasAnimated(true);
      return;
    }

    const startTime = Date.now();
    const startValue = displayValue;
    const targetValue = Math.max(0, Math.round(value));
    const totalChange = targetValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing function
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.round(startValue + (totalChange * easedProgress));
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        if (typeof window !== 'undefined') {
          animationFrameRef.current = window.requestAnimationFrame(animate);
        } else if (typeof global !== 'undefined' && global.requestAnimationFrame) {
          animationFrameRef.current = global.requestAnimationFrame(animate);
        }
      } else {
        setHasAnimated(true);
      }
    };

    if (typeof window !== 'undefined') {
      animationFrameRef.current = window.requestAnimationFrame(animate);
    } else if (typeof global !== 'undefined' && global.requestAnimationFrame) {
      animationFrameRef.current = global.requestAnimationFrame(animate);
    }
  };

  // Setup Intersection Observer
  useEffect(() => {
    const currentRef = elementRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        if (typeof window !== 'undefined') {
          window.cancelAnimationFrame(animationFrameRef.current);
        } else if (typeof global !== 'undefined' && global.cancelAnimationFrame) {
          global.cancelAnimationFrame(animationFrameRef.current);
        }
      }
    };
  }, []);

  // Reset animation when value changes
  useEffect(() => {
    if (hasAnimated && value !== displayValue) {
      setHasAnimated(false);
      setDisplayValue(0);
    }
  }, [value]);

  const ariaLabel = label ? `${label}: ${displayValue}` : displayValue.toString();

  return (
    <span
      ref={elementRef}
      data-testid="animated-counter"
      className={className}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {displayValue.toLocaleString()}
    </span>
  );
}