// src/app/organizations/page.js
import Layout from '@/components/layout/Layout';

export default function OrganizationsPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Rescue Organizations</h1>
        <p className="mt-4 text-gray-500">
          These are the wonderful organizations we work with to find homes for rescue dogs.
        </p>
        
        {/* Placeholder for organizations list */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div 
              key={index} 
              className="rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white p-6"
            >
              <div className="h-12 bg-gray-200 rounded-full w-12 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}