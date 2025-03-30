// src/app/about/page.js
import Layout from '@/components/layout/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">About Rescue Dog Aggregator</h1>
        <div className="mt-6 space-y-6 text-gray-600">
          <p>
            Rescue Dog Aggregator is an open-source web platform that brings together
            rescue dogs from multiple organizations worldwide.
          </p>
          <p>
            Our mission is to increase visibility for rescue dogs and help them find
            homes faster, while supporting the original rescue organizations.
          </p>
          <p>
            This project started as a way to honor the rescue journey of Harley,
            a Golden Retriever rescued from Izmir, Turkey through "Pets in Turkey".
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8">Our Goals</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Create a single, well-designed destination for people to find rescue dogs</li>
            <li>Standardize information in a consistent, searchable format</li>
            <li>Present dogs in a user-friendly interface that enhances discovery</li>
            <li>Support multiple languages to bridge barriers</li>
            <li>Link back to original rescue organizations for adoption</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}