import React from "react";

/**
 * Demonstration component showing the new unified skeleton animation system
 * Shows the difference between old pulsing animations and new shimmer effect
 */
export const SkeletonDemo: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-4">New Unified Skeleton System</h2>
        <p className="text-gray-600 mb-6">
          Subtle shimmer animation without the &ldquo;disco&rdquo; pulsing
          effect
        </p>

        <div className="skeleton-container p-6 rounded-lg border">
          <div className="space-y-4">
            <div className="skeleton-element h-6 rounded w-3/4" />
            <div className="skeleton-element h-4 rounded w-1/2" />
            <div className="flex space-x-3">
              <div className="skeleton-element w-12 h-12 rounded-lg" />
              <div className="skeleton-element w-12 h-12 rounded-lg" />
              <div className="skeleton-element w-12 h-12 rounded-lg" />
            </div>
            <div className="skeleton-element h-10 rounded w-full" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Component Examples</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Skeleton */}
          <div className="skeleton-container p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-4">
              <div className="skeleton-element w-16 h-16 rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="skeleton-element h-5 rounded w-3/4" />
                <div className="skeleton-element h-4 rounded w-1/2" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="skeleton-element h-4 rounded w-full" />
              <div className="skeleton-element h-4 rounded w-5/6" />
              <div className="skeleton-element h-4 rounded w-2/3" />
            </div>

            <div className="flex space-x-2 mt-4">
              <div className="skeleton-element h-8 rounded flex-1" />
              <div className="skeleton-element h-8 rounded flex-1" />
            </div>
          </div>

          {/* List Skeleton */}
          <div className="skeleton-container p-6 rounded-lg border">
            <div className="skeleton-element h-6 rounded w-1/2 mb-4" />

            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="skeleton-element w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-element h-4 rounded w-3/4" />
                    <div className="skeleton-element h-3 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Dark Mode Support</h3>
        <div className="dark bg-gray-900 p-6 rounded-lg">
          <div className="skeleton-container p-6 rounded-lg border border-gray-700">
            <div className="space-y-4">
              <div className="skeleton-element h-6 rounded w-3/4" />
              <div className="skeleton-element h-4 rounded w-1/2" />
              <div className="flex space-x-3">
                <div className="skeleton-element w-12 h-12 rounded-lg" />
                <div className="skeleton-element w-12 h-12 rounded-lg" />
                <div className="skeleton-element w-12 h-12 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Implementation</h3>
        <div className="bg-gray-100 p-4 rounded-lg">
          <pre className="text-sm">
            {`/* Container for skeleton cards */
<div className="skeleton-container">
  
  /* Individual skeleton elements */
  <div className="skeleton-element h-6 rounded w-3/4" />
  <div className="skeleton-element h-4 rounded w-1/2" />
  
</div>`}
          </pre>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Key Improvements:</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>✅ Subtle shimmer gradient instead of opacity pulse</li>
          <li>✅ Standardized 2s duration with ease-in-out timing</li>
          <li>✅ Automatic dark mode support</li>
          <li>✅ Respects prefers-reduced-motion settings</li>
          <li>✅ Hardware-accelerated animations</li>
          <li>✅ No more &ldquo;disco&rdquo; flashing effect</li>
        </ul>
      </div>
    </div>
  );
};

export default SkeletonDemo;
