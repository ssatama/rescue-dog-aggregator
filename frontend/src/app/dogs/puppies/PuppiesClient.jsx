"use client";

import { Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AgeQuickNav from "@/components/age/AgeQuickNav";
import DogsPageClientSimplified from "../DogsPageClientSimplified";

export default function PuppiesClient({
  ageCategory,
  initialDogs,
  metadata,
  totalCount,
}) {
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Puppies" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section
        className={`relative bg-gradient-to-br ${ageCategory.gradient} dark:${ageCategory.darkGradient} py-8 md:py-12 px-4 overflow-hidden`}
      >
        {/* Decorative pattern - playful dots */}
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white_2px,transparent_2px)] bg-[length:32px_32px]" />
        </div>

        {/* Animated sparkles decoration */}
        <div className="absolute top-4 right-4 md:top-8 md:right-12 opacity-15">
          <Sparkles className="h-24 w-24 md:h-32 md:w-32 text-white animate-pulse" />
        </div>
        <div className="absolute bottom-4 left-8 opacity-10 hidden md:block">
          <Sparkles className="h-16 w-16 text-white" />
        </div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl md:text-5xl">{ageCategory.emoji}</span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-md">
                Rescue Puppies
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-sm">
              {ageCategory.tagline} &mdash;{" "}
              <span className="font-semibold">
                {totalCount.toLocaleString()}
              </span>{" "}
              puppies waiting for their forever homes
            </p>

            {/* Age info pill */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/95">
              <Sparkles className="h-4 w-4" />
              <span>{ageCategory.ageRange}</span>
            </div>
          </div>
        </div>
      </section>

      <AgeQuickNav currentSlug="puppies" />

      <DogsPageClientSimplified
        initialDogs={initialDogs}
        metadata={metadata}
        initialParams={{ age_category: ageCategory.apiValue }}
        hideHero={true}
        hideBreadcrumbs={true}
        wrapWithLayout={false}
      />
    </Layout>
  );
}
