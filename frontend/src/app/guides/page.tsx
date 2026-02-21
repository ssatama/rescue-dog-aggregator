import { getAllGuides } from "@/lib/guides";
import { GuideCard } from "@/components/guides/GuideCard";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Adoption Guides",
    description:
      "Comprehensive guides to help you navigate rescue dog adoption from European organizations.",
    url: "https://www.rescuedogs.me/guides",
  };

  return {
    title: "Adoption Guides | Rescue Dog Aggregator",
    description:
      "Comprehensive guides to help you navigate rescue dog adoption from European organizations. From first-time owner preparation to understanding costs and cross-border logistics.",
    alternates: {
      canonical: "https://www.rescuedogs.me/guides",
    },
    openGraph: {
      title: "Adoption Guides",
      description:
        "Comprehensive guides to rescue dog adoption from European organizations.",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Adoption Guides",
      description:
        "Comprehensive guides to rescue dog adoption from European organizations.",
    },
    other: {
      "application/ld+json": JSON.stringify(collectionSchema),
    },
  };
}

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://www.rescuedogs.me" },
          { name: "Guides" },
        ]}
      />
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="text-orange-500 hover:text-orange-600 hover:underline transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <span className="mx-2 text-gray-400">/</span>
            </li>
            <li>
              <span
                className="text-gray-900 dark:text-white font-medium"
                aria-current="page"
              >
                Guides
              </span>
            </li>
          </ol>
        </nav>

        <h1 className="text-4xl font-bold mb-4">Adoption Guides</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-3xl">
          Comprehensive guides to help you navigate rescue dog adoption from
          European organizations. From first-time owner preparation to
          understanding costs and cross-border logistics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {guides.map((guide, index) => (
            <GuideCard key={guide.slug} guide={guide} priority={index < 4} />
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
