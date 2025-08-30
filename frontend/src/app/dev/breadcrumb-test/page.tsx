"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  trackDogView,
  trackDogCardClick,
  trackDogImageView,
  trackFavoriteToggle,
  trackFavoritesPageView,
  trackSearch,
  trackFilterChange,
  trackSortChange,
  trackOrgPageView,
  trackExternalLinkClick,
  trackPaginationClick,
  addTestBreadcrumb,
} from "@/lib/monitoring/breadcrumbs";

interface BreadcrumbLog {
  timestamp: Date;
  message: string;
  data?: Record<string, any>;
}

export default function BreadcrumbTestPage() {
  const [breadcrumbLogs, setBreadcrumbLogs] = useState<BreadcrumbLog[]>([]);
  const [testError, setTestError] = useState<string>("");

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Development Only</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  const addLog = (message: string, data?: Record<string, any>) => {
    setBreadcrumbLogs((prev) => [
      {
        timestamp: new Date(),
        message,
        data,
      },
      ...prev.slice(0, 9), // Keep last 10 logs
    ]);
  };

  const testDogView = () => {
    trackDogView("test-dog-123", "Buddy", "test-org");
    addLog("Dog View: Buddy", { dogId: "test-dog-123", orgSlug: "test-org" });
  };

  const testDogCardClick = () => {
    trackDogCardClick("test-dog-456", "Max", 3, "search");
    addLog("Dog Card Click: Max at position 4", {
      dogId: "test-dog-456",
      position: 3,
      context: "search",
    });
  };

  const testDogImageView = () => {
    trackDogImageView("test-dog-789", 2, 5);
    addLog("Dog Image View: Image 3 of 5", {
      dogId: "test-dog-789",
      imageIndex: 2,
      totalImages: 5,
    });
  };

  const testFavoriteAdd = () => {
    trackFavoriteToggle("add", "test-dog-111", "Luna", "test-org");
    addLog("Favorite Added: Luna", { action: "add", dogId: "test-dog-111" });
  };

  const testFavoriteRemove = () => {
    trackFavoriteToggle("remove", "test-dog-222", "Charlie", "test-org");
    addLog("Favorite Removed: Charlie", {
      action: "remove",
      dogId: "test-dog-222",
    });
  };

  const testFavoritesPage = () => {
    trackFavoritesPageView(15);
    addLog("Favorites Page Viewed", { count: 15 });
  };

  const testSearch = () => {
    trackSearch("golden retriever", { breed: "retriever", age: "young" }, 23);
    addLog('Search: "golden retriever"', {
      query: "golden retriever",
      filters: { breed: "retriever", age: "young" },
      resultCount: 23,
    });
  };

  const testFilterChange = () => {
    trackFilterChange("breed", "labrador", 45);
    addLog("Filter Changed: breed → labrador", {
      filterType: "breed",
      value: "labrador",
      resultCount: 45,
    });
  };

  const testSortChange = () => {
    trackSortChange("newest");
    addLog("Sort Changed: newest", { sortBy: "newest" });
  };

  const testOrgPageView = () => {
    trackOrgPageView("pets-turkey", 127);
    addLog("Organization Page: pets-turkey", {
      orgSlug: "pets-turkey",
      dogCount: 127,
    });
  };

  const testExternalLink = () => {
    trackExternalLinkClick("adopt", "test-org", "test-dog-333");
    addLog("External Link: Adopt", {
      linkType: "adopt",
      orgSlug: "test-org",
      dogId: "test-dog-333",
    });
  };

  const testPagination = () => {
    trackPaginationClick(3, 10);
    addLog("Pagination: Page 3 of 10", { page: 3, totalPages: 10 });
  };

  const testCustomBreadcrumb = () => {
    addTestBreadcrumb("Custom test breadcrumb", {
      custom: "data",
      timestamp: Date.now(),
    });
    addLog("Custom Test Breadcrumb", { custom: "data" });
  };

  const throwTestError = () => {
    const errorMessage = testError || "Test error from breadcrumb test page";
    addLog(`Throwing Error: ${errorMessage}`, { error: true });

    // Give time for the log to render before throwing
    setTimeout(() => {
      throw new Error(errorMessage);
    }, 100);
  };

  const triggerAllBreadcrumbs = () => {
    testDogView();
    setTimeout(() => testDogCardClick(), 100);
    setTimeout(() => testDogImageView(), 200);
    setTimeout(() => testFavoriteAdd(), 300);
    setTimeout(() => testSearch(), 400);
    setTimeout(() => testFilterChange(), 500);
    setTimeout(() => testOrgPageView(), 600);
    setTimeout(() => testExternalLink(), 700);
    setTimeout(() => testPagination(), 800);
    addLog("Triggered all breadcrumbs sequentially", { count: 9 });
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Breadcrumb Testing Page</h1>
      <p className="text-gray-600 mb-8">
        Development mode only - Test breadcrumb tracking before errors occur
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Breadcrumb Triggers */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Breadcrumb Triggers</h2>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Dog Interactions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testDogView}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Dog View
              </button>
              <button
                onClick={testDogCardClick}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Dog Card Click
              </button>
              <button
                onClick={testDogImageView}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Image View
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Favorites</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testFavoriteAdd}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Favorite
              </button>
              <button
                onClick={testFavoriteRemove}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Remove Favorite
              </button>
              <button
                onClick={testFavoritesPage}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Favorites Page
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Search & Filter</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testSearch}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Search
              </button>
              <button
                onClick={testFilterChange}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Filter Change
              </button>
              <button
                onClick={testSortChange}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Sort Change
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Navigation</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testOrgPageView}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Org Page View
              </button>
              <button
                onClick={testExternalLink}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                External Link
              </button>
              <button
                onClick={testPagination}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Pagination
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Test Actions</h3>
            <button
              onClick={testCustomBreadcrumb}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Custom Breadcrumb
            </button>
            <button
              onClick={triggerAllBreadcrumbs}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
            >
              Trigger All Breadcrumbs
            </button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium text-gray-700">Throw Test Error</h3>
            <input
              type="text"
              value={testError}
              onChange={(e) => setTestError(e.target.value)}
              placeholder="Custom error message (optional)"
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={throwTestError}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🔥 Throw Error
            </button>
            <p className="text-xs text-gray-500">
              This will throw an error that Sentry will capture along with all
              breadcrumbs
            </p>
          </div>
        </div>

        {/* Breadcrumb Log */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Local Breadcrumb Log</h2>
          <div className="bg-gray-50 rounded-lg p-4 h-[600px] overflow-y-auto">
            {breadcrumbLogs.length === 0 ? (
              <p className="text-gray-500">
                No breadcrumbs logged yet. Click buttons to test.
              </p>
            ) : (
              <div className="space-y-2">
                {breadcrumbLogs.map((log, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{log.message}</span>
                      <span className="text-xs text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {log.data && (
                      <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Note: This local log is for testing only. Actual breadcrumbs are
            sent to Sentry and visible when errors occur.
          </p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">How to Test:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Click various breadcrumb buttons to simulate user actions</li>
          <li>Watch the local log to confirm breadcrumbs are being tracked</li>
          <li>
            Click &quot;Trigger All Breadcrumbs&quot; to simulate a user journey
          </li>
          <li>
            Click &quot;Throw Error&quot; to send an error to Sentry with all
            breadcrumbs
          </li>
          <li>Check Sentry dashboard to see the error with breadcrumb trail</li>
        </ol>
      </div>
    </div>
  );
}
