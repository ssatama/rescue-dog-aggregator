"use client";

import { Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AgeQuickNav from "@/components/age/AgeQuickNav";
import type { SeniorDogsClientProps } from "@/types/pageComponents";
import DogsPageClientSimplified from "../DogsPageClientSimplified";

export default function SeniorDogsClient({
  ageCategory,
  initialDogs,
  metadata,
  totalCount,
}: SeniorDogsClientProps) {
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Senior Dogs" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section
        className={`relative bg-gradient-to-br ${ageCategory.gradient} ${ageCategory.darkGradient} py-8 md:py-12 px-4 overflow-hidden`}
      >
        {/* Decorative pattern - softer, more refined dots */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        </div>

        {/* Heart decoration - warm and gentle */}
        <div className="absolute top-4 right-4 md:top-8 md:right-12 opacity-15">
          <Heart className="h-24 w-24 md:h-32 md:w-32 text-white fill-white/30" />
        </div>
        <div className="absolute bottom-6 left-8 opacity-10 hidden md:block">
          <Heart className="h-12 w-12 text-white fill-white/20" />
        </div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl md:text-5xl">{ageCategory.emoji}</span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-md">
                Senior Rescue Dogs
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-sm">
              {ageCategory.tagline} &mdash;{" "}
              <span className="font-semibold">
                {totalCount.toLocaleString()}
              </span>{" "}
              gentle souls waiting for their forever homes
            </p>

            {/* Age info pill with benefits */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/95">
                <Heart className="h-4 w-4" />
                <span>{ageCategory.ageRange}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90">
                <span>Often house-trained</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90">
                <span>Calm temperament</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AgeQuickNav currentSlug="senior" />

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
