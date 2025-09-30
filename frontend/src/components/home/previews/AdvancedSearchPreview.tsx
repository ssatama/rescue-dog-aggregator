// frontend/src/components/home/previews/AdvancedSearchPreview.tsx

export default function AdvancedSearchPreview() {
  return (
    <div className="w-full space-y-3 scale-90">
      {/* Breed Search */}
      <div className="relative">
        <label htmlFor="preview-breed-search" className="sr-only">Search breeds</label>
        <input
          id="preview-breed-search"
          type="text"
          placeholder="Search breeds..."
          disabled
          aria-label="Search breeds (preview)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
        />
      </div>
      
      {/* Size Filters */}
      <div className="flex gap-2" role="group" aria-label="Size filter options">
        {['Small', 'Medium', 'Large'].map((size) => (
          <span
            key={size}
            className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full"
          >
            {size}
          </span>
        ))}
      </div>
      
      {/* Location */}
      <div className="relative">
        <label htmlFor="preview-location" className="sr-only">Location</label>
        <span className="absolute left-3 top-2 text-gray-400" aria-hidden="true">📍</span>
        <input
          id="preview-location"
          type="text"
          placeholder="Location"
          disabled
          aria-label="Location filter (preview)"
          className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
        />
      </div>
      
      {/* Age Filters */}
      <div className="flex gap-2" role="group" aria-label="Age filter options">
        {['Puppy', 'Young', 'Adult'].map((age) => (
          <span
            key={age}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full"
          >
            {age}
          </span>
        ))}
      </div>
    </div>
  );
}