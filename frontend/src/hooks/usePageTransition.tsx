import type React from "react";
import { useState, useEffect } from "react";

interface PageTransitionReturn {
  isVisible: boolean;
  className: string;
}

export function usePageTransition(
  delay = 0,
  duration = 300,
): PageTransitionReturn {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const durationMap: Record<number, string> = {
    200: "duration-200",
    300: "duration-300",
    500: "duration-500",
  };
  const durationClass = durationMap[duration] || "duration-300";

  const className = `transition-opacity ${durationClass} ${isVisible ? "opacity-100" : "opacity-0"}`;

  return {
    isVisible,
    className,
  };
}

interface PageTransitionProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  [key: string]: unknown;
}

export function PageTransition({
  children,
  delay = 0,
  duration = 300,
  className = "",
  ...props
}: PageTransitionProps): React.ReactElement {
  const { className: transitionClass } = usePageTransition(delay, duration);

  return (
    <div className={`${transitionClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default usePageTransition;
