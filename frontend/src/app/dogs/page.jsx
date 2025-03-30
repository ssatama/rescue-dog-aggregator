// src/app/dogs/page.jsx
"use client";

import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import DogCard from '../../components/dogs/DogCard';

export default function DogsPage() {
  // Mock data for now - this will come from your API later
  const [dogs] = useState([
    { id: 1, name: "Buddy", breed: "Golden Retriever", age_text: "2 years", sex: "Male" },
    { id: 2, name: "Luna", breed: "German Shepherd", age_text: "1 year", sex: "Female" },
    { id: 3, name: "Max", breed: "Labrador", age_text: "3 years", sex: "Male" },
    { id: 4, name: "Bella", breed: "Beagle", age_text: "4 years", sex: "Female" },
    { id: 5, name: "Charlie", breed: "Poodle", age_text: "2 years", sex: "Male" },
    { id: 6, name: "Lucy", breed: "Border Collie", age_text: "5 years", sex: "Female" },
    { id: 7, name: "Cooper", breed: "Husky", age_text: "3 years", sex: "Male" },
    { id: 8, name: "Daisy", breed: "Corgi", age_text: "1 year", sex: "Female" },
  ]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Rescue Dog</h1>
        <p className="text-lg text-gray-600 mb-8">
          Browse available rescue dogs from multiple organizations. Use the filters to find your perfect match.
        </p>
        
        {/* Filters section */}
        <div className="bg-gray-100 p-4 rounded-lg mb-8">
          <h2 className="font-semibold mb-2">Filters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Breed</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Any breed</option>
                <option>Golden Retriever</option>
                <option>Labrador</option>
                <option>German Shepherd</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sex</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Any</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Size</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Any size</option>
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Any age</option>
                <option>Puppy</option>
                <option>Young</option>
                <option>Adult</option>
                <option>Senior</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Dogs grid using the DogCard component */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {dogs.map((dog) => (
            <DogCard key={dog.id} dog={dog} />
          ))}
        </div>
      </div>
    </Layout>
  );
}