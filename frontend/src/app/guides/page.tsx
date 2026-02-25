import { getAllGuides } from "@/lib/guides";
import { GuideCard } from "@/components/guides/GuideCard";
import { BreadcrumbSchema } from "@/components/seo";
import Layout from "@/components/layout/Layout";
import Link from "next/link";
import type { Metadata } from "next";

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Adoption Guides",
  description:
    "Comprehensive guides to help you navigate rescue dog adoption from European organizations.",
  url: "https://www.rescuedogs.me/guides",
};

export const metadata: Metadata = {
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
};

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Guides" },
        ]}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {guides.map((guide, index) => (
            <GuideCard key={guide.slug} guide={guide} priority={index < 4} />
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-sm text-gray-500 dark:text-gray-400 space-y-3">
          <p>
            Whether you are considering adopting a rescue dog for the first time
            or adding another companion to your family, these guides walk you
            through every step of the process, from initial research to your
            first months together.
          </p>
          <p>
            Millions of dogs across Southern and Eastern Europe face life in
            overcrowded shelters or on the streets. Our guides explain why
            international rescue adoption works, what it involves, and how to
            approach it responsibly. Each guide draws on real data from the
            rescue organizations listed on our platform.
          </p>
          <p>
            You will find practical guidance on assessing your readiness as an
            owner, navigating cross-border adoption logistics including Pet
            Travel Scheme requirements and health certifications, budgeting for
            adoption fees and ongoing veterinary care, and preparing your home
            for a new arrival. These resources are designed for prospective
            adopters in the UK and across Europe, covering the specific
            regulations, timelines, and costs involved in rescuing a dog from
            abroad.
          </p>
        </div>
      </div>
    </Layout>
  );
}
