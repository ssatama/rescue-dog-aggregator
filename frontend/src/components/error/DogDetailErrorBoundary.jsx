/**
 * Enhanced error boundary specifically for dog detail pages
 * Provides graceful error handling with retry options and user-friendly messages
 */
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { reportError } from "../../utils/logger";

class DogDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    reportError(error, {
      context: "DogDetailErrorBoundary",
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      dogSlug: this.props.dogSlug,
    });
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const canRetry = retryCount < 3;

      return (
        <div
          className="max-w-4xl mx-auto p-4 bg-gray-50 dark:bg-gray-900"
          data-testid="dog-detail-error-boundary"
        >
          <Alert
            variant="destructive"
            className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
          >
            <AlertTitle className="flex items-center text-red-800 dark:text-red-200">
              <svg
                className="w-5 h-5 mr-2 text-red-600 dark:text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Something went wrong
            </AlertTitle>
            <AlertDescription className="mt-2 text-red-700 dark:text-red-300">
              <p className="mb-4">
                We&apos;re having trouble loading this dog&apos;s information. This might
                be a temporary issue.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="flex items-center bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Try Again {retryCount > 0 && `(${retryCount}/3)`}
                  </Button>
                )}

                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  size="sm"
                  className="flex items-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Go Back
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex items-center bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:ring-offset-2"
                >
                  <Link href="/dogs">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Browse All Dogs
                  </Link>
                </Button>
              </div>

              {!canRetry && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  If this problem persists, please try refreshing the page or
                  contact support.
                </p>
              )}
            </AlertDescription>
          </Alert>

          {/* Helpful suggestions */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-lg p-4">
            <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
              While you&apos;re here:
            </h3>
            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
              <li>• Browse other available dogs</li>
              <li>• Search by breed or location</li>
              <li>• Learn about our rescue partners</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DogDetailErrorBoundary;
