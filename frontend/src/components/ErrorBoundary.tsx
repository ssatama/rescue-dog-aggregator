"use client";

import React, { Component, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  isChunkLoadError,
  clearCacheAndReload,
} from "@/lib/chunkLoadError";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkLoadError(error);
    return { hasError: true, error, isChunkError: chunkError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.state.isChunkError) {
      clearCacheAndReload();
      return;
    }

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
      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-blue-50 rounded-lg">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              Updating...
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Loading the latest version of the site.
            </p>
          </div>
        );
      }

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
            onClick={() => this.setState({ hasError: false, isChunkError: false })}
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
