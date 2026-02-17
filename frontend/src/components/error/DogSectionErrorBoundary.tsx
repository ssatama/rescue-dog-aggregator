import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type {
  DogSectionErrorBoundaryProps,
  DogSectionErrorBoundaryState,
} from "@/types/dogComponents";

class DogSectionErrorBoundary extends React.Component<
  DogSectionErrorBoundaryProps,
  DogSectionErrorBoundaryState
> {
  constructor(props: DogSectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<DogSectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("DogSection Error:", error, errorInfo);
    }

    if (typeof window !== "undefined" && window.reportError) {
      window.reportError(error);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <section className="my-12 md:my-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertTitle>Section Unavailable</AlertTitle>
              <AlertDescription>
                This section could not be loaded. Please try refreshing the
                page.
                <Button
                  variant="link"
                  size="sm"
                  onClick={this.handleRetry}
                  className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default DogSectionErrorBoundary;
