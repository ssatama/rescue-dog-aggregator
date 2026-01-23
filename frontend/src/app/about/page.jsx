import Layout from "../../components/layout/Layout";
import Link from "next/link";
import ContactButton from "../../components/ui/ContactButton";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema, PersonSchema } from "../../components/seo";
import HarleyStory from "../../components/about/HarleyStory";
import StatsDisplay from "../../components/about/StatsDisplay";
import EuropeMap from "../../components/about/EuropeMap";
import ContactSection from "../../components/about/ContactSection";

// Metadata export for SEO
export const metadata = {
  title: "About Us | European Rescue Dog Platform - Rescue Dogs",
  description:
    "Learn about our mission to connect loving homes with rescue dogs in need. Discover how we work with rescue organizations to simplify the dog adoption process.",
  alternates: {
    canonical: "https://www.rescuedogs.me/about",
  },
  openGraph: {
    title: "About Rescue Dog Aggregator",
    description:
      "Learn about our mission to connect loving homes with rescue dogs in need. Discover how we work with rescue organizations to simplify the dog adoption process.",
    type: "website",
    siteName: "Rescue Dog Aggregator",
  },
  twitter: {
    card: "summary",
    title: "About Rescue Dog Aggregator",
    description:
      "Learn about our mission to connect loving homes with rescue dogs in need.",
  },
};

export default function AboutPage() {
  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "About" }];

  return (
    <Layout>
      <BreadcrumbSchema items={breadcrumbItems} />
      <PersonSchema
        name="Sampo Satama"
        jobTitle="Founder"
        organization={{ name: "RescueDogs.me", url: "https://www.rescuedogs.me" }}
        sameAs={[
          "https://www.linkedin.com/in/sampo-satama-data-scientist/",
          "https://github.com/ssatama",
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-title text-gray-900 dark:text-gray-100 mb-3">
            About Rescue Dog Aggregator
          </h1>
          <p className="text-body text-gray-600 dark:text-gray-400">
            Connecting loving homes with rescue dogs in need.
          </p>
        </div>

        {/* All sections with consistent vertical rhythm */}
        <div className="space-y-12 sm:space-y-16 md:space-y-24 lg:space-y-32 py-8 sm:py-12 md:py-16 lg:py-24">
          {/* NEW: Harley Story */}
          <HarleyStory />

          {/* NEW: Stats Display */}
          <StatsDisplay />

          {/* NEW: Europe Map */}
          <EuropeMap />

          {/* Section: Our Mission (EXPANDED) */}
          <section>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6">
              Our Mission
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
              Our mission is to connect loving homes in the UK and across Europe
              with rescue dogs in need. We bring rescue dogs from trusted rescue
              organizations from Spain to Romania, Malta to Montenegro, bringing
              thousands of dogs into one beautifully designed platform. Rescue
              organizations are not technology experts - they are experts at
              rescuing dogs in need. By bridging the gap between high-demand
              adoption markets and regions with shelter overpopulation, we help
              more dogs find their forever homes while supporting the incredible
              work of rescue organizations across Europe and UK.
            </p>
          </section>

          {/* Section: How It Works */}
          <section className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 md:p-10 rounded-lg">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl mb-2">🐾</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-2">
                  1. Browse Dogs
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  Use our search and filter tools to find dogs based on breed,
                  age, size, location, and more.
                </p>
              </div>
              <div>
                <div className="text-4xl mb-2">❤️</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-2">
                  2. View Details
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  Click on a dog&apos;s profile to see more photos, read their story,
                  and learn about their personality.
                </p>
              </div>
              <div>
                <div className="text-4xl mb-2">🏠</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-2">
                  3. Connect & Adopt
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  Use the provided links to connect directly with the rescue
                  organization to start the adoption process.
                </p>
              </div>
            </div>
          </section>

          {/* NEW: Contact Section (REPLACES Get Involved) */}
          <ContactSection />
        </div>
      </div>
    </Layout>
  );
}
