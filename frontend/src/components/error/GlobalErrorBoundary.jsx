import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Report to error tracking service in production
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      // You can integrate with Sentry, LogRocket, etc. here
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // Placeholder for error reporting service integration
    console.error("Reporting error:", {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, title, description } = this.props;

      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{title || "Something went wrong"}</AlertTitle>
              <AlertDescription className="mt-2">
                {description ||
                  "An unexpected error occurred while loading this content."}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 mt-4">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline" size="sm">
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {this.state.errorId && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <GlobalErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </GlobalErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for programmatic error handling
export function useErrorHandler() {
  return (error, errorInfo = {}) => {
    // This will trigger the error boundary
    throw new Error(error);
  };
}

export default GlobalErrorBoundary;
