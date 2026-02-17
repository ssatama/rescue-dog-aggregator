import type { ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface ExpandableTextProps {
  text: string;
  lines?: number;
  className?: string;
}

export interface ContactButtonProps {
  email?: string;
  buttonText?: string;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}
