// frontend/src/components/home/previews/AdvancedSearchPreview.tsx

export default function AdvancedSearchPreview() {
  return (
    <div className="relative w-full space-y-3">
      {/* Breed Search with icon */}
      <div className="relative">
        <label htmlFor="preview-breed-search" className="sr-only">
          Search breeds
        </label>
        <span
          className="absolute left-3 top-2.5 text-blue-500 dark:text-blue-400"
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          id="preview-breed-search"
          type="text"
          placeholder="Search breeds..."
          disabled
          aria-label="Search breeds (preview)"
          className="w-full pl-9 pr-3 py-2 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-sm font-medium text-gray-400 dark:text-gray-500"
        />
      </div>

      {/* Size Filters - color-coded blue */}
      <div className="flex gap-2" role="group" aria-label="Size filter options">
        {["Small", "Medium", "Large"].map((size) => (
          <span
            key={size}
            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-700"
          >
            {size}
          </span>
        ))}
      </div>

      {/* Location with pin icon */}
      <div className="relative">
        <label htmlFor="preview-location" className="sr-only">
          Location
        </label>
        <span
          className="absolute left-3 top-2.5 text-blue-500 dark:text-blue-400"
          aria-hidden="true"
        >
          📍
        </span>
        <input
          id="preview-location"
          type="text"
          placeholder="Location"
          disabled
          aria-label="Location filter (preview)"
          className="w-full pl-9 pr-3 py-2 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-sm font-medium text-gray-400 dark:text-gray-500"
        />
      </div>

      {/* Age Filters - color-coded green */}
      <div className="flex gap-2" role="group" aria-label="Age filter options">
        {["Puppy", "Young", "Adult"].map((age) => (
          <span
            key={age}
            className="px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full border border-green-200 dark:border-green-700"
          >
            {age}
          </span>
        ))}
      </div>

      {/* Fade gradient at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-700/80 dark:to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
