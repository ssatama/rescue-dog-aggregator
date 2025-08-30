"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { addTestBreadcrumb } from "@/lib/monitoring/breadcrumbs";

export default function SentryTestPage() {
  const [errorMessage, setErrorMessage] = useState(
    "Test error from Sentry test page",
  );
  const [breadcrumbsAdded, setBreadcrumbsAdded] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Add initial breadcrumb when page loads
    addTestBreadcrumb("Sentry test page loaded");
    setBreadcrumbsAdded(1);
    setIsReady(true);
  }, []);

  const addBreadcrumb = () => {
    const count = breadcrumbsAdded + 1;
    addTestBreadcrumb(`Manual breadcrumb #${count}`, {
      timestamp: new Date().toISOString(),
      userAction: "button_click",
    });
    setBreadcrumbsAdded(count);
  };

  const addMultipleBreadcrumbs = () => {
    for (let i = 1; i <= 5; i++) {
      addTestBreadcrumb(`Batch breadcrumb ${i}/5`, {
        batch: true,
        index: i,
        timestamp: new Date().toISOString(),
      });
    }
    setBreadcrumbsAdded(breadcrumbsAdded + 5);
  };

  const simulateUserJourney = () => {
    // Simulate a typical user journey
    addTestBreadcrumb("User journey started");

    setTimeout(() => {
      addTestBreadcrumb("Viewed homepage", { page: "home" });
    }, 100);

    setTimeout(() => {
      addTestBreadcrumb("Searched for dogs", { query: "golden retriever" });
    }, 200);

    setTimeout(() => {
      addTestBreadcrumb("Applied filter", { filter: "age", value: "young" });
    }, 300);

    setTimeout(() => {
      addTestBreadcrumb("Clicked on dog card", { dogId: "test-123" });
    }, 400);

    setTimeout(() => {
      addTestBreadcrumb("Added to favorites", { dogId: "test-123" });
    }, 500);

    setTimeout(() => {
      addTestBreadcrumb("Clicked adopt button", { action: "external_link" });
    }, 600);

    setBreadcrumbsAdded(breadcrumbsAdded + 7);
  };

  const throwError = () => {
    // Add a final breadcrumb before throwing
    addTestBreadcrumb("About to throw error", {
      errorMessage,
      breadcrumbsBeforeError: breadcrumbsAdded + 1,
    });

    // Throw the error
    throw new Error(errorMessage);
  };

  const throwAsyncError = async () => {
    // Add breadcrumb for async operation
    addTestBreadcrumb("Starting async operation", { type: "async" });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    addTestBreadcrumb("Async operation completed, throwing error", {
      errorMessage,
      breadcrumbsBeforeError: breadcrumbsAdded + 2,
    });

    throw new Error(`Async: ${errorMessage}`);
  };

  const causeNetworkError = async () => {
    addTestBreadcrumb("Attempting network request to invalid endpoint");

    try {
      const response = await fetch("/api/this-endpoint-does-not-exist");
      if (!response.ok) {
        throw new Error(
          `Network error: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      addTestBreadcrumb("Network error caught", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  if (!isReady) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Sentry Error Testing Page</h1>
      <p className="text-gray-600 mb-8">
        Test Sentry error tracking with breadcrumb context
      </p>

      {/* Breadcrumb Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h2 className="font-semibold text-blue-900 mb-2">Breadcrumb Status</h2>
        <p className="text-blue-800">
          Breadcrumbs added in this session:{" "}
          <span className="font-bold">{breadcrumbsAdded}</span>
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Max breadcrumbs retained: 50 (configured in Sentry)
        </p>
        <p className="text-xs text-blue-500 mt-2">
          Breadcrumbs are only visible in Sentry when an error occurs
        </p>
      </div>

      <div className="space-y-6">
        {/* Breadcrumb Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Add Breadcrumbs</h2>
          <p className="text-sm text-gray-600">
            Add breadcrumbs to provide context before throwing an error
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={addBreadcrumb}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Single Breadcrumb
            </button>

            <button
              onClick={addMultipleBreadcrumbs}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Add 5 Breadcrumbs
            </button>

            <button
              onClick={simulateUserJourney}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Simulate User Journey (7 breadcrumbs)
            </button>
          </div>
        </div>

        {/* Error Configuration */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configure Error</h2>

          <input
            type="text"
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            placeholder="Enter custom error message"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Error Triggers */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Throw Errors</h2>
          <p className="text-sm text-gray-600">
            These will send errors to Sentry with all accumulated breadcrumbs
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={throwError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🔥 Throw Synchronous Error
            </button>

            <button
              onClick={throwAsyncError}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              ⏱️ Throw Async Error (1s delay)
            </button>

            <button
              onClick={causeNetworkError}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              🌐 Cause Network Error
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>
            Add some breadcrumbs using the buttons above to simulate user
            activity
          </li>
          <li>Optionally customize the error message</li>
          <li>Throw an error to send it to Sentry</li>
          <li>
            Check your Sentry dashboard to see the error with breadcrumb trail
          </li>
          <li>
            Breadcrumbs will show the user&apos;s journey leading up to the
            error
          </li>
        </ol>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Breadcrumbs provide context without creating
            separate events. They&apos;re only sent to Sentry when an actual
            error occurs, making them cost-effective for tracking user behavior.
          </p>
        </div>
      </div>

      {/* Link to breadcrumb test page */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 text-center">
          <a
            href="/dev/breadcrumb-test"
            className="text-blue-600 hover:underline"
          >
            → Visit comprehensive breadcrumb test page (dev only)
          </a>
        </div>
      )}
    </div>
  );
}
