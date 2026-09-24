// frontend/src/components/home/PlatformCapabilities.tsx

import CapabilityCard from "./CapabilityCard";
import AdvancedSearchPreview from "./previews/AdvancedSearchPreview";
import PersonalityBarsPreview from "./previews/PersonalityBarsPreview";
import SwipePreview from "./previews/SwipePreview";

interface PlatformCapabilitiesProps {
  organizationCount?: number;
  countryCount?: number;
}

export default function PlatformCapabilities({ organizationCount = 0, countryCount = 0 }: PlatformCapabilitiesProps) {
  // Same live statistics as the rest of the homepage, so the badge can't go stale (#452)
  const searchBadge =
    organizationCount > 0 && countryCount > 0
      ? `${organizationCount} rescues · ${countryCount} countries`
      : "Rescues across Europe";

  return (
    <section
      className="bg-[#FFF8F0] dark:bg-gray-900 py-32"
      aria-labelledby="platform-capabilities-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h2
            id="platform-capabilities-heading"
            className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Three Ways to Find Your Dog
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the approach that fits your search style
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <CapabilityCard
            visual={<AdvancedSearchPreview />}
            headline="Advanced Search"
            description="Filter dogs by breed, age, size, gender, and location to find your perfect match"
            badge={searchBadge}
            ctaText="Start Searching →"
            ctaHref="/dogs"
            accentColor="blue"
          />

          <CapabilityCard
            visual={<PersonalityBarsPreview />}
            headline="Match by Personality"
            description="Every breed analyzed for traits like energy level, affection, and trainability"
            badge="Data from 2,500+ profiles"
            ctaText="Explore Breeds →"
            ctaHref="/breeds"
            accentColor="purple"
          />

          <CapabilityCard
            visual={<SwipePreview />}
            headline="Quick Discovery"
            description="Not sure what you want? Swipe through dogs filtered by your country and size preferences"
            badge="Updated twice weekly"
            ctaText="Start Swiping →"
            ctaHref="/swipe"
            accentColor="orange"
          />
        </div>
      </div>
    </section>
  );
}
