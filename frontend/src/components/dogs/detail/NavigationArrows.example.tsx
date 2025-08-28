/**
 * Usage Example for NavigationArrows Component
 *
 * This file demonstrates how to use the NavigationArrows component
 * in different scenarios. This is for documentation purposes only.
 */
import React, { useState } from "react";
import NavigationArrows from "./NavigationArrows";

// Mock data for demonstration
const mockDogs = [
  { id: 1, name: "Buddy" },
  { id: 2, name: "Luna" },
  { id: 3, name: "Max" },
  { id: 4, name: "Bella" },
  { id: 5, name: "Charlie" },
];

export function NavigationArrowsExamples() {
  const [currentIndex, setCurrentIndex] = useState(2); // Start in middle
  const [isLoading, setIsLoading] = useState(false);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsLoading(true);
      // Simulate navigation delay
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setIsLoading(false);
      }, 300);
    }
  };

  const handleNext = () => {
    if (currentIndex < mockDogs.length - 1) {
      setIsLoading(true);
      // Simulate navigation delay
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsLoading(false);
      }, 300);
    }
  };

  const currentDog = mockDogs[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mockDogs.length - 1;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Example 1: Standard Usage */}
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Standard Dog Navigation</h3>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">{currentDog.name}</h2>
          <p className="text-gray-600">
            Dog {currentIndex + 1} of {mockDogs.length}
          </p>
          {isLoading && (
            <p className="text-sm text-gray-500 mt-2">Loading...</p>
          )}
        </div>

        {/* Navigation arrows overlay */}
        <NavigationArrows
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isLoading={isLoading}
        />
      </div>

      {/* Example 2: Only Previous Available */}
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Only Previous Available</h3>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Last Dog</h2>
          <p className="text-gray-600">Only previous navigation available</p>
        </div>

        <NavigationArrows
          onPrev={() => console.log("Go to previous dog")}
          onNext={() => console.log("Next not available")}
          hasPrev={true}
          hasNext={false}
        />
      </div>

      {/* Example 3: Only Next Available */}
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Only Next Available</h3>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">First Dog</h2>
          <p className="text-gray-600">Only next navigation available</p>
        </div>

        <NavigationArrows
          onPrev={() => console.log("Previous not available")}
          onNext={() => console.log("Go to next dog")}
          hasPrev={false}
          hasNext={true}
        />
      </div>

      {/* Example 4: No Navigation (component should not render) */}
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">No Navigation Available</h3>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Single Dog</h2>
          <p className="text-gray-600">No navigation arrows shown</p>
        </div>

        <NavigationArrows
          onPrev={() => console.log("Previous not available")}
          onNext={() => console.log("Next not available")}
          hasPrev={false}
          hasNext={false}
        />
      </div>

      {/* Instructions */}
      <div className="max-w-md mx-auto mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium mb-2">Desktop Only Component</h4>
        <p className="text-sm text-gray-700">
          Navigation arrows are hidden on mobile screens (width &lt; 768px).
          View on desktop to see the arrows.
        </p>
      </div>
    </div>
  );
}

// Usage in a dog detail page:
//
// import { NavigationArrows } from '../components/dogs/detail';
//
// function DogDetailPage({ dog, prevDogId, nextDogId, isLoading }) {
//   const router = useRouter();
//
//   const handlePrev = () => {
//     if (prevDogId) {
//       router.push(`/dogs/${prevDogId}`);
//     }
//   };
//
//   const handleNext = () => {
//     if (nextDogId) {
//       router.push(`/dogs/${nextDogId}`);
//     }
//   };
//
//   return (
//     <div>
//       <NavigationArrows
//         onPrev={handlePrev}
//         onNext={handleNext}
//         hasPrev={!!prevDogId}
//         hasNext={!!nextDogId}
//         isLoading={isLoading}
//       />
//
//       {/* Dog content */}
//       <div>{dog.name}</div>
//     </div>
//   );
// }
