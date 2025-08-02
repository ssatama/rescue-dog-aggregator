// Simple test page to check image loading
"use client";

import { useState } from "react";
import HeroImageWithBlurredBackground from "../../components/ui/HeroImageWithBlurredBackground";
import LazyImage from "../../components/ui/LazyImage";
import {
  getDetailHeroImageWithPosition,
  getCatalogCardImage,
  handleImageError,
} from "../../utils/imageUtils";

export default function TestImages() {
  const [logs, setLogs] = useState([]);
  const [imageErrors, setImageErrors] = useState([]);

  const addLog = (message) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
    process.env.NODE_ENV === "development" && console.log(message);
  };

  const handleImageErrorWithLog = (e, originalUrl) => {
    const error = `Image failed to load: ${e.target.src}`;
    setImageErrors((prev) => [...prev, error]);
    addLog(error);
    handleImageError(e, originalUrl);
  };

  // Test different image scenarios
  const testImages = [
    {
      name: "Valid External URL",
      url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=600&fit=crop",
      type: "external",
    },
    {
      name: "Cloudinary URL (if available)",
      url: "https://res.cloudinary.com/dy8y3booq/image/upload/v1234567/sample.jpg",
      type: "cloudinary",
    },
    {
      name: "Local Placeholder",
      url: "/placeholder_dog.svg",
      type: "local",
    },
    {
      name: "Invalid URL",
      url: "https://example.com/nonexistent.jpg",
      type: "invalid",
    },
    {
      name: "Null URL",
      url: null,
      type: "null",
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Image Loading Test Page</h1>

      {/* Environment Info */}
      <div className="bg-gray-100 p-4 rounded mb-8">
        <h2 className="text-xl font-semibold mb-2">Environment</h2>
        <p>
          NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:{" "}
          {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "Not set"}
        </p>
        <p>
          NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || "Not set"}
        </p>
        <p>NODE_ENV: {process.env.NODE_ENV}</p>
      </div>

      {/* Image Utility Tests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Image Utility Output</h2>
        {testImages.map((test, index) => {
          const heroResult = test.url
            ? getDetailHeroImageWithPosition(test.url)
            : { src: "/placeholder_dog.svg", position: "center center" };
          const catalogResult = test.url
            ? getCatalogCardImage(test.url)
            : "/placeholder_dog.svg";

          return (
            <div key={index} className="bg-white border rounded p-4 mb-4">
              <h3 className="font-medium">{test.name}</h3>
              <p className="text-sm text-gray-600">
                Original: {test.url || "null"}
              </p>
              <p className="text-sm text-gray-600">
                Hero optimized: {heroResult.src}
              </p>
              <p className="text-sm text-gray-600">
                Catalog optimized: {catalogResult}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actual Image Rendering Tests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Actual Image Rendering</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testImages.map((test, index) => (
            <div key={index} className="border rounded p-4">
              <h3 className="font-medium mb-2">{test.name}</h3>

              {/* Hero Image Component */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">
                  Hero Image Component:
                </h4>
                <HeroImageWithBlurredBackground
                  src={test.url}
                  alt={`Test ${test.name}`}
                  onError={(e) => handleImageErrorWithLog(e, test.url)}
                  className="w-full max-w-sm"
                />
              </div>

              {/* Regular img tag for comparison */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Regular img tag:</h4>
                <img
                  src={test.url || "/placeholder_dog.svg"}
                  alt={`Test ${test.name} regular`}
                  onError={(e) => handleImageErrorWithLog(e, test.url)}
                  onLoad={() => addLog(`Regular img loaded: ${test.name}`)}
                  className="w-full max-w-sm h-48 object-cover border"
                  style={{ backgroundColor: "#f0f0f0" }}
                />
              </div>

              {/* LazyImage Component */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  LazyImage Component:
                </h4>
                <LazyImage
                  src={test.url}
                  alt={`Test ${test.name} lazy`}
                  onError={(e) => handleImageErrorWithLog(e, test.url)}
                  onLoad={() => addLog(`LazyImage loaded: ${test.name}`)}
                  className="w-full max-w-sm h-48 object-cover border"
                  enableProgressiveLoading={true}
                  priority={index === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Network Test</h2>
        <button
          onClick={async () => {
            try {
              addLog("Testing fetch to external image...");
              const response = await fetch(
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&h=100&fit=crop",
              );
              addLog(
                `Fetch response: ${response.status} ${response.statusText}`,
              );
            } catch (error) {
              addLog(`Fetch error: ${error.message}`);
            }
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          Test Network Fetch
        </button>
      </div>

      {/* Logs */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
          {logs.length === 0 && <p>No logs yet...</p>}
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      </div>

      {/* Image Errors */}
      {imageErrors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-red-600">
            Image Errors
          </h2>
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            {imageErrors.map((error, index) => (
              <p key={index} className="text-red-700">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
