// frontend/src/components/home/FinalCTA.tsx

import Link from "next/link";

interface FinalCTAProps {
  totalCount?: number;
}

export default function FinalCTA({ totalCount = 3186 }: FinalCTAProps) {
  const ctaCards = [
    {
      title: "Browse All Dogs",
      subtitle: `${totalCount.toLocaleString()} available`,
      description: "Advanced filters by breed, age, size, gender, and location",
      href: "/dogs",
    },
    {
      title: "Explore Breeds",
      subtitle: "50+ analyzed",
      description: "Personality insights and traits for every breed",
      href: "/breeds",
    },
    {
      title: "Start Swiping",
      subtitle: "Quick matches",
      description: "Discover dogs filtered by your preferences",
      href: "/swipe",
    },
  ];

  return (
    <section
      className="bg-orange-600 dark:bg-orange-700 py-24"
      aria-labelledby="final-cta-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <h2
          id="final-cta-heading"
          className="text-4xl lg:text-5xl font-bold text-white text-center mb-16"
        >
          Ready to Find Your Dog?
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 justify-items-center max-w-4xl mx-auto">
          {ctaCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="block group w-full xl:w-[280px]"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mb-4">
                  {card.subtitle}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
