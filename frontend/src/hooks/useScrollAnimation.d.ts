import type React from "react";

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export function useScrollAnimation(
  options?: ScrollAnimationOptions,
): [React.RefObject<HTMLDivElement | null>, boolean];

export function useReducedMotion(): boolean;

interface ScrollAnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  animationType?: "fade-in" | "slide-up";
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export declare const ScrollAnimationWrapper: React.FC<ScrollAnimationWrapperProps>;

export default useScrollAnimation;
