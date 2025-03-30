// src/app/dogs/page.js
import Layout from '@/components/layout/Layout';

export default function DogsPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Your Dog</h1>
        <p className="mt-4 text-gray-500">
          Browse all available rescue dogs. Use the filters to narrow your search.
        </p>
        
        {/* Placeholder for filter and dog grid components */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div 
              key={index} 
              className="rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white"
            >
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}