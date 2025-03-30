// src/app/organizations/page.jsx
"use client";

import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import OrganizationCard from '../../components/organizations/OrganizationCard';

export default function OrganizationsPage() {
  // Mock data for organizations - will come from your API later
  const [organizations] = useState([
    {
      id: 1,
      name: "Pets in Turkey",
      location: "Izmir, Turkey",
      description: "A Swiss registered non-profit dog rescue organization in Izmir, Turkey.",
      websiteUrl: "https://www.petsinturkey.org",
      logoUrl: null
    },
    {
      id: 2,
      name: "Berlin Animal Shelter",
      location: "Berlin, Germany",
      description: "The largest animal shelter in Europe, providing refuge for thousands of animals every year.",
      websiteUrl: "https://example.com/berlin-shelter",
      logoUrl: null
    },
    {
      id: 3,
      name: "Golden Hearts Rescue",
      location: "Munich, Germany",
      description: "Specializing in Golden Retrievers and other retrievers in need of loving homes.",
      websiteUrl: "https://example.com/golden-hearts",
      logoUrl: null
    },
    {
      id: 4,
      name: "Paws & Claws Sanctuary",
      location: "Hamburg, Germany",
      description: "A no-kill shelter dedicated to finding permanent homes for all animals in our care.",
      websiteUrl: "https://example.com/paws-claws",
      logoUrl: null
    }
  ]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Rescue Organizations</h1>
        <p className="text-lg text-gray-600 mb-8">
          These organizations work tirelessly to rescue and rehome dogs. By adopting through them, 
          you're supporting their mission to save more animals.
        </p>
        
        {/* Organizations grid using the OrganizationCard component */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      </div>
    </Layout>
  );
}