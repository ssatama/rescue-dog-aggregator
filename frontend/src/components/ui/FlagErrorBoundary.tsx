import React from "react";

interface FlagErrorBoundaryProps {
  children: React.ReactNode;
  countryCode?: string;
  countryName?: string;
}

interface FlagErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary specifically for flag loading failures
 * Provides fallback UI when flag service is unavailable
 */
class FlagErrorBoundary extends React.Component<
  FlagErrorBoundaryProps,
  FlagErrorBoundaryState
> {
  constructor(props: FlagErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FlagErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log flag loading errors for monitoring in development only
    if (process.env.NODE_ENV !== "production")
      console.warn("Flag loading error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Fallback to text-based country display
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-xs text-gray-500 px-1 py-0.5 rounded bg-gray-100">
            {this.props.countryCode || "??"}
          </span>
          {this.props.countryName && (
            <span className="text-sm">{this.props.countryName}</span>
          )}
        </span>
      );
    }

    return this.props.children;
  }
}

export default FlagErrorBoundary;
