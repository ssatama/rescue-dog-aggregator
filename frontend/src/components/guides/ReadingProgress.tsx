'use client';

import { useState, useEffect } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const totalScroll = documentHeight - windowHeight;
      const currentProgress = (scrollTop / totalScroll) * 100;

      setProgress(Math.min(Math.max(currentProgress, 0), 100));
    };

    // Debounce for performance (100ms)
    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll);
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-800 z-50">
      <div
        className="h-full bg-orange-500 transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: progress > 0 ? '0 0 8px rgba(251, 146, 60, 0.5)' : 'none'
        }}
      />
    </div>
  );
}
