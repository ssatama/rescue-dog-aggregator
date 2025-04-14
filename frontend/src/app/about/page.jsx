import Layout from '../../components/layout/Layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // If needed for CTAs

export default function AboutPage() {
  return (
    <Layout>
      {/* Consistent container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            About Rescue Dog Aggregator
          </h1>
          <p className="text-xl text-gray-600">
            Connecting loving homes with rescue dogs in need.
          </p>
        </div>

        {/* Section: Our Mission */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Our Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            Our mission is to simplify the process of finding and adopting rescue dogs. We partner with various animal shelters and rescue organizations to bring their available dogs into one centralized platform.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            We believe every dog deserves a second chance in a loving forever home. By making it easier for potential adopters to discover dogs from different sources, we hope to increase adoption rates and support the incredible work of rescue organizations.
          </p>
        </section>

        {/* Section: How It Works */}
        <section className="mb-12 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl mb-2">🐾</div> {/* Placeholder Icon */}
              <h3 className="text-xl font-medium text-gray-900 mb-2">1. Browse Dogs</h3>
              <p className="text-gray-600">
                Use our search and filter tools to find dogs based on breed, age, size, location, and more.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">❤️</div> {/* Placeholder Icon */}
              <h3 className="text-xl font-medium text-gray-900 mb-2">2. View Details</h3>
              <p className="text-gray-600">
                Click on a dog's profile to see more photos, read their story, and learn about their personality.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">🏠</div> {/* Placeholder Icon */}
              <h3 className="text-xl font-medium text-gray-900 mb-2">3. Connect & Adopt</h3>
              <p className="text-gray-600">
                Use the provided links to connect directly with the rescue organization to start the adoption process.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Get Involved / Contact (Optional) */}
        <section className="text-center">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Get Involved</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6 max-w-2xl mx-auto">
            Are you a rescue organization interested in listing your dogs? Or do you have questions or feedback for us? We'd love to hear from you.
          </p>
          {/* Example using Button, linking to a potential contact page */}
          <Button asChild size="lg">
            <Link href="/contact">
              Contact Us
            </Link>
          </Button>
        </section>

      </div>
    </Layout>
  );
}