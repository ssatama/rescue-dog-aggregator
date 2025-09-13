"use client";

import React, { Component, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with component stack
    Sentry.withScope((scope) => {
      scope.setContext("component", {
        componentStack: errorInfo.componentStack,
        props: this.props,
      });
      scope.setLevel("error");
      Sentry.captureException(error);
    });

    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback p-4 m-4 border border-red-500 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-700">
            Something went wrong
          </h2>
          {this.props.showError && this.state.error && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-red-600">
                Error details
              </summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-white rounded">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
