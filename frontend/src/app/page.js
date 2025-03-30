import Layout from '../components/layout/Layout';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="text-center my-12 md:my-24">
          <h1 className="text-4xl md:text-6xl font-bold text-red-500 mb-6">
            Rescue Dog Aggregator
          </h1>
          <p className="text-xl md:text-2xl text-blue-500 mb-8 max-w-3xl mx-auto">
            Find your perfect rescue dog from multiple organizations, all in one place.
          </p>
          <Link 
            href="/dogs" 
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Browse Dogs
          </Link>
        </div>
      </div>
    </Layout>
  );
}