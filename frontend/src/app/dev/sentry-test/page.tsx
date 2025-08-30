"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  trackDogView,
  trackDogCardClick,
  trackFavoriteToggle,
  trackSearch,
  trackCompareSelection,
  trackCompareInitiation,
  trackShare,
  trackFavoritesShare,
  trackPageLoadPerformance,
  trackHeaderNavigation,
  trackCatalogPageLoad,
  addTestBreadcrumb,
} from "@/lib/monitoring/breadcrumbs";

interface BreadcrumbItem {
  timestamp: string;
  category?: string;
  message?: string;
  level?: string;
  type?: string;
  data?: any;
}

interface EnvironmentInfo {
  environment: string;
  release: string;
  dsn: string;
  sampleRate: number;
  replaySampleRate: number;
  debug: boolean;
}

export default function SentryTestPage() {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [userContext, setUserContext] = useState<any>(null);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);

  useEffect(() => {
    // Capture Sentry configuration
    const client = Sentry.getClient();
    const options = client?.getOptions() as any;
    
    if (options) {
      setEnvInfo({
        environment: options.environment || "unknown",
        release: options.release || "unknown",
        dsn: options.dsn ? "***" + options.dsn.slice(-8) : "not set",
        sampleRate: options.tracesSampleRate || 0,
        replaySampleRate: options.replaysSessionSampleRate || 0,
        debug: options.debug || false,
      });
    }

    // Get current scope data
    const scope = Sentry.getCurrentScope();
    const scopeData = scope as any;
    
    // Try to get user context
    if (scopeData._user) {
      setUserContext(scopeData._user);
    }
    
    // Try to get tags
    if (scopeData._tags) {
      setTags(scopeData._tags);
    }

    // Track page load
    const startTime = performance.now();
    trackPageLoadPerformance("sentry-test", performance.now() - startTime);
    
    // Add initial breadcrumb
    addTestBreadcrumb("Sentry test page loaded");
  }, []);

  // Track breadcrumbs manually when we add them
  const trackBreadcrumb = (message: string, data?: any) => {
    setBreadcrumbs(prev => [{
      timestamp: new Date().toISOString(),
      message,
      category: "user",
      level: "info",
      data
    }, ...prev].slice(0, 20));
  };

  const simulateUserJourney = async () => {
    setBreadcrumbs([]);
    
    // Simulate a complete user journey
    const steps = [
      () => {
        trackHeaderNavigation("catalog");
        trackBreadcrumb("Navigate to catalog");
        return "Navigate to catalog";
      },
      () => {
        trackCatalogPageLoad(250, false);
        trackBreadcrumb("Load catalog with 250 dogs", { count: 250 });
        return "Load catalog with 250 dogs";
      },
      () => {
        trackSearch("golden retriever", { breed: "retriever" }, 23);
        trackBreadcrumb("Search for golden retriever", { query: "golden retriever", results: 23 });
        return "Search for golden retriever";
      },
      () => {
        trackDogCardClick("dog-123", "Buddy", 0, "search");
        trackBreadcrumb("Click on Buddy's card", { dogId: "dog-123" });
        return "Click on Buddy's card";
      },
      () => {
        trackDogView("dog-123", "Buddy", "pets-turkey");
        trackBreadcrumb("View Buddy's details", { dogId: "dog-123", org: "pets-turkey" });
        return "View Buddy's details";
      },
      () => {
        trackFavoriteToggle("add", "dog-123", "Buddy", "pets-turkey");
        trackBreadcrumb("Add Buddy to favorites", { action: "add", dogId: "dog-123" });
        return "Add Buddy to favorites";
      },
      () => {
        trackCompareSelection("select", "dog-123", "Buddy", 1);
        trackBreadcrumb("Select Buddy for comparison", { dogId: "dog-123" });
        return "Select Buddy for comparison";
      },
      () => {
        trackCompareSelection("select", "dog-456", "Max", 2);
        trackBreadcrumb("Select Max for comparison", { dogId: "dog-456" });
        return "Select Max for comparison";
      },
      () => {
        trackCompareInitiation(["dog-123", "dog-456"], ["Buddy", "Max"]);
        trackBreadcrumb("Start comparison", { dogs: ["Buddy", "Max"] });
        return "Start comparison";
      },
      () => {
        trackShare("dog", "copy-link", "dog-123", "Buddy");
        trackBreadcrumb("Share Buddy's profile", { method: "copy-link" });
        return "Share Buddy's profile";
      },
      () => {
        trackFavoritesShare("generate-link", 5);
        trackBreadcrumb("Share favorites list", { count: 5 });
        return "Share favorites list";
      },
    ];

    for (const step of steps) {
      const message = step();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const throwError = (type: "standard" | "unhandled" | "promise") => {
    const message = errorMessage || `Test ${type} error with breadcrumb trail`;
    
    switch (type) {
      case "standard":
        throw new Error(message);
      case "unhandled":
        setTimeout(() => {
          throw new Error(message);
        }, 100);
        break;
      case "promise":
        Promise.reject(new Error(message));
        break;
    }
  };

  const sendMessage = () => {
    Sentry.captureMessage("Test message with breadcrumbs", "info");
  };

  const setUser = () => {
    Sentry.setUser({
      id: "test-user-123",
      email: "test@example.com",
      username: "testuser",
    });
    window.location.reload();
  };

  const clearUser = () => {
    Sentry.setUser(null);
    window.location.reload();
  };

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Development Only</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Sentry Test & Debug Page</h1>
      <p className="text-gray-600 mb-8">
        Test Sentry integration, view breadcrumb trail, and verify environment configuration
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
          {envInfo ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium">Environment:</dt>
                <dd className={`font-mono ${
                  envInfo.environment === "production" ? "text-red-600" : "text-green-600"
                }`}>
                  {envInfo.environment}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Release:</dt>
                <dd className="font-mono text-xs">{envInfo.release.slice(0, 12)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">DSN:</dt>
                <dd className="font-mono text-xs">{envInfo.dsn}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Trace Rate:</dt>
                <dd className="font-mono">{(envInfo.sampleRate * 100).toFixed(0)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Replay Rate:</dt>
                <dd className="font-mono">{(envInfo.replaySampleRate * 100).toFixed(0)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Debug Mode:</dt>
                <dd className="font-mono">{envInfo.debug ? "ON" : "OFF"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium mb-2">User Context</h3>
            {userContext ? (
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(userContext, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500 text-sm">No user set</p>
            )}
            <div className="mt-2 space-x-2">
              <button
                onClick={setUser}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
              >
                Set User
              </button>
              <button
                onClick={clearUser}
                className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
              >
                Clear User
              </button>
            </div>
          </div>

          {Object.keys(tags).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium mb-2">Tags</h3>
              <dl className="space-y-1 text-xs">
                {Object.entries(tags).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="font-medium">{key}:</dt>
                    <dd className="font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">User Journey Simulation</h3>
              <button
                onClick={simulateUserJourney}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Simulate Complete User Journey
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Simulates browsing, searching, viewing, and sharing
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Send to Sentry</h3>
              <div className="space-y-2">
                <button
                  onClick={sendMessage}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Send Message
                </button>
                <input
                  type="text"
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="Custom error message"
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => throwError("standard")}
                    className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Error
                  </button>
                  <button
                    onClick={() => throwError("unhandled")}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Unhandled
                  </button>
                  <button
                    onClick={() => throwError("promise")}
                    className="px-3 py-2 bg-red-700 text-white text-sm rounded hover:bg-red-800"
                  >
                    Promise
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Quick Breadcrumbs</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => trackDogView("test-1", "Buddy", "org-1")}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded"
                >
                  Dog View
                </button>
                <button
                  onClick={() => trackFavoriteToggle("add", "test-2", "Max", "org-2")}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded"
                >
                  Add Favorite
                </button>
                <button
                  onClick={() => trackSearch("test", {}, 10)}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded"
                >
                  Search
                </button>
                <button
                  onClick={() => trackShare("dog", "copy-link", "test-3")}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Trail */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Breadcrumb Trail ({breadcrumbs.length})
            </h2>
            <button
              onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showBreadcrumbs ? "Hide" : "Show"}
            </button>
          </div>
          
          {showBreadcrumbs && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {breadcrumbs.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No breadcrumbs yet. Perform actions to see them here.
                </p>
              ) : (
                breadcrumbs.map((crumb, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-blue-400 pl-3 py-2 bg-gray-50 rounded-r"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {crumb.category && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {crumb.category}
                            </span>
                          )}
                          {crumb.level && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              crumb.level === "error" ? "bg-red-100 text-red-700" :
                              crumb.level === "warning" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {crumb.level}
                            </span>
                          )}
                        </div>
                        {crumb.message && (
                          <p className="text-sm font-medium mt-1">{crumb.message}</p>
                        )}
                        {crumb.data && (
                          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                            {JSON.stringify(crumb.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {new Date(crumb.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setBreadcrumbs([])}
              className="w-full px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Clear Local Display
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Note: This only clears the display. Breadcrumbs are still being sent to Sentry.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Testing Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">1. Environment Verification</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Check environment shows &quot;development&quot; locally</li>
              <li>Verify sample rates are appropriate</li>
              <li>Confirm DSN is configured</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Breadcrumb Testing</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Click &quot;Simulate User Journey&quot; to create breadcrumbs</li>
              <li>Throw an error to send breadcrumbs to Sentry</li>
              <li>Check Sentry dashboard for the complete trail</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Production Preparation</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Test with VERCEL_ENV=production locally</li>
              <li>Verify reduced sample rates in production mode</li>
              <li>Confirm sensitive data is scrubbed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. MCP Verification</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Send test errors with different severities</li>
              <li>Query errors via Sentry MCP tools</li>
              <li>Verify breadcrumbs are searchable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}