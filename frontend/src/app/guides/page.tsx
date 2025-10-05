import { getAllGuides } from "@/lib/guides";
import { GuideCard } from "@/components/guides/GuideCard";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adoption Guides | Rescue Dog Aggregator",
  description: "Comprehensive guides to adopting rescue dogs from Europe",
};

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <>
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

        <h1 className="text-4xl font-bold mb-8">Adoption Guides</h1>

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
