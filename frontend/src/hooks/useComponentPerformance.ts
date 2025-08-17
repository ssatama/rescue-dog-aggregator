import { useEffect, useRef } from 'react';
import { measureComponentPerformance } from '@/utils/performanceMonitor';

export function useComponentPerformance(componentName: string) {
  const measureRef = useRef<ReturnType<typeof measureComponentPerformance> | undefined>(undefined);
  const hasStarted = useRef(false);

  useEffect(() => {
    // Start measurement on mount
    if (!hasStarted.current) {
      measureRef.current = measureComponentPerformance(componentName);
      measureRef.current.start();
      hasStarted.current = true;
    }

    // End measurement after render
    const timer = setTimeout(() => {
      if (measureRef.current) {
        measureRef.current.end();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [componentName]);
}