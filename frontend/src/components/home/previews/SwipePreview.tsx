// frontend/src/components/home/previews/SwipePreview.tsx

export default function SwipePreview() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Back Cards (stacked effect) */}
      <div className="absolute top-4 w-32 h-40 bg-blue-200 dark:bg-blue-900 rounded-xl opacity-30 -rotate-6" />
      <div className="absolute top-2 w-32 h-40 bg-green-200 dark:bg-green-900 rounded-xl opacity-50 rotate-3" />
      
      {/* Front Card */}
      <div className="relative z-10 w-32 h-40 bg-orange-100 dark:bg-orange-900 rounded-xl shadow-lg flex flex-col items-center justify-center p-3">
        <div className="text-5xl mb-2">🐕</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">Bella</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Golden Retriever</div>
      </div>
      
      {/* Swipe Buttons */}
      <div className="flex gap-4 mt-6">
        <button className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center text-2xl border-2 border-gray-200 dark:border-gray-600">
          👎
        </button>
        <button className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center text-2xl border-2 border-red-200 dark:border-red-600">
          ❤️
        </button>
      </div>
    </div>
  );
}
