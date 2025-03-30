"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/layout/Layout';

export default function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params.id;
  
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simple mock data
    const mockOrganization = {
      id: organizationId,
      name: "Pets in Turkey",
      location: "Izmir, Turkey",
      description: "A non-profit dog rescue organization in Turkey."
    };
    
    // Simple timeout to simulate API call
    setTimeout(() => {
      setOrganization(mockOrganization);
      setLoading(false);
    }, 500);
  }, [organizationId]);
  
  if (loading) {
    return (
      <Layout>
        <div className="p-4">Loading...</div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4">
        <Link href="/organizations" className="text-blue-500 mb-4 block">
          Back to Organizations
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h1 className="text-2xl font-bold mb-2">{organization.name}</h1>
          <p className="text-gray-600 mb-4">{organization.location}</p>
          <p>{organization.description}</p>
        </div>
        
        <h2 className="text-xl font-bold mb-4">Dogs from this Organization</h2>
        <p>This organization has several dogs available for adoption.</p>
      </div>
    </Layout>
  );
}