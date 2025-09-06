import React from "react";
import Layout from "@/components/layout/Layout";

export default function BreedDetailSkeleton() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>

          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-3">
              <div className="h-12 flex-1 bg-gray-200 rounded animate-pulse" />
              <div className="h-12 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-20 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto p-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-16 bg-gray-200 rounded animate-pulse flex-shrink-0"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
