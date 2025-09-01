import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

interface Props {
  children: ReactNode;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class SwipeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    Sentry.withScope((scope) => {
      scope.setContext("swipe_error", {
        component: "SwipeErrorBoundary",
        errorCount: this.state.errorCount + 1,
        resetKeys: this.props.resetKeys,
      });
      scope.setTag("feature", "swipe");
      scope.setTag("error.boundary", "SwipeErrorBoundary");
      Sentry.captureException(error);
    });

    if (process.env.NODE_ENV === "development") {
      console.error("SwipeErrorBoundary caught an error:", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (
      hasError &&
      prevProps.resetKeys !== resetKeys &&
      resetKeys &&
      prevProps.resetKeys &&
      JSON.stringify(prevProps.resetKeys) !== JSON.stringify(resetKeys)
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="text-6xl mb-4">🐕‍🦺</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600">
                We&apos;re having trouble with the swipe feature right now.
                Don&apos;t worry, all the dogs are still safe!
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  Error details:
                </p>
                <p className="text-xs text-red-600 font-mono">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.resetErrorBoundary}
                className="px-6 py-3 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-colors"
              >
                Go to Browse
              </Link>
            </div>

            {this.state.errorCount > 2 && (
              <p className="mt-4 text-sm text-gray-500">
                If this keeps happening, please try refreshing the page or come
                back later.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SwipeErrorBoundary;
