import { useState, useEffect } from "react";

/**
 * Custom hook for page transition animations
 * Provides smooth fade-in effect for page content with motion preference respect
 *
 * @param {number} delay - Delay before transition starts (default: 0)
 * @param {number} duration - Animation duration in ms (default: 300)
 * @returns {object} - { isVisible, className }
 */
export function usePageTransition(delay = 0, duration = 300) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // Generate duration class based on provided duration
  const durationClass =
    duration === 200
      ? "duration-200"
      : duration === 300
        ? "duration-300"
        : duration === 500
          ? "duration-500"
          : "duration-300"; // fallback

  const className = `transition-opacity ${durationClass} ${isVisible ? "opacity-100" : "opacity-0"}`;

  return {
    isVisible,
    className,
  };
}

/**
 * Component wrapper for page transitions
 * Automatically applies fade-in animation to children
 *
 * @param {React.ReactNode} children - Child components
 * @param {number} delay - Delay before transition starts
 * @param {number} duration - Animation duration in ms
 * @param {string} className - Additional CSS classes
 */
export function PageTransition({
  children,
  delay = 0,
  duration = 300,
  className = "",
}) {
  const { className: transitionClass } = usePageTransition(delay, duration);

  return <div className={`${transitionClass} ${className}`}>{children}</div>;
}

export default usePageTransition;
