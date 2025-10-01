// frontend/src/components/home/previews/SwipePreview.tsx

"use client";

export default function SwipePreview() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pt-4">
      {/* Back Cards (stacked effect with better depth) */}
      <div
        className="absolute top-8 w-36 h-44 bg-blue-200 dark:bg-blue-900 rounded-2xl opacity-20 -rotate-6 shadow-lg transform scale-95"
        aria-hidden="true"
      />
      <div
        className="absolute top-6 w-36 h-44 bg-green-200 dark:bg-green-900 rounded-2xl opacity-40 rotate-3 shadow-lg transform scale-[0.97]"
        aria-hidden="true"
      />

      {/* Front Card with tilt rotation */}
      <div className="relative z-10 w-36 h-44 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-4 transform rotate-2 border-2 border-orange-200 dark:border-orange-700">
        <div className="text-6xl mb-2" aria-hidden="true">
          🐕
        </div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">
          Bella
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Golden Retriever
        </div>
      </div>

      {/* Swipe gesture hints with arrows */}
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 animate-pulse"
        aria-hidden="true"
      >
        <span className="text-2xl">←</span>
      </div>
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 animate-pulse"
        aria-hidden="true"
      >
        <span className="text-2xl">→</span>
      </div>

      {/* Swipe Buttons */}
      <div className="flex gap-6 mt-8 relative z-20">
        <button
          aria-label="Pass on dog"
          disabled
          className="w-14 h-14 bg-white dark:bg-gray-700 rounded-full shadow-xl flex items-center justify-center text-2xl border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
        >
          <span aria-hidden="true">👎</span>
        </button>
        <button
          aria-label="Like dog"
          disabled
          className="w-14 h-14 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-full shadow-xl flex items-center justify-center text-2xl border-2 border-red-200 dark:border-red-600 hover:scale-110 transition-transform"
        >
          <span aria-hidden="true">❤️</span>
        </button>
      </div>
    </div>
  );
}
