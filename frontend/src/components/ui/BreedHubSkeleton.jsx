export default function BreedHubSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-8">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Hero section skeleton */}
        <div className="text-center mb-12 mt-8">
          <div className="h-12 w-96 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-gray-200 rounded mx-auto mb-6 animate-pulse" />
          <div className="h-5 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>

        {/* Filter chips skeleton */}
        <div className="flex justify-center gap-3 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Breed type cards skeleton */}
        <div className="mb-16">
          <div className="h-8 w-32 bg-gray-200 rounded mx-auto mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Popular breeds skeleton */}
        <div className="mb-16">
          <div className="h-8 w-36 bg-gray-200 rounded mx-auto mb-6 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="h-4 w-20 bg-gray-200 rounded mb-1 animate-pulse" />
                <div className="h-8 w-12 bg-gray-200 rounded mb-1 animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Breed groups skeleton */}
        <div className="mb-16">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-6 rounded-lg bg-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 w-20 bg-gray-200 rounded mb-1 animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 rounded mb-1 animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA section skeleton */}
        <div className="mt-16">
          <div className="p-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg">
            <div className="h-8 w-64 bg-gray-300 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-80 bg-gray-300 rounded mx-auto mb-6 animate-pulse" />
            <div className="flex gap-4 justify-center">
              <div className="h-12 w-32 bg-gray-300 rounded animate-pulse" />
              <div className="h-12 w-32 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}