import { getAllGuides, getGuideDogs } from "@/lib/guides";
import { GuideCard } from "@/components/guides/GuideCard";
import { BreadcrumbSchema } from "@/components/seo";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { Metadata } from "next";

// The cards show real listed dogs, which change daily
export const revalidate = 86400;

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
    "Guides to adopting a rescue dog from Europe: first-time owner preparation, costs and budgets, and the rules and logistics of bringing a dog home.",
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
  const cards = await Promise.all(
    guides.map(async ({ slug, frontmatter }) => ({ slug, frontmatter, dogs: await getGuideDogs(frontmatter) })),
  );

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

      <div className="mx-auto max-w-7xl py-6 lg:py-8">
        {/* BreadcrumbSchema above is this page's BreadcrumbList */}
        <Breadcrumbs items={[{ name: "Home", url: "/" }, { name: "Guides" }]} schema={false} />

        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Adoption guides</h1>
        <p className="mt-2 max-w-2xl text-base text-subtle">
          Comprehensive guides to help you navigate rescue dog adoption from European organizations. From first-time
          owner preparation to understanding costs and cross-border logistics.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {cards.map((guide) => (
            <li key={guide.slug}>
              <GuideCard guide={guide} />
            </li>
          ))}
        </ul>

        <div className="mt-12 max-w-3xl space-y-3 text-sm text-subtle">
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
