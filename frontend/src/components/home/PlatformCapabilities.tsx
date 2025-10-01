// frontend/src/components/home/PlatformCapabilities.tsx

import CapabilityCard from "./CapabilityCard";
import AdvancedSearchPreview from "./previews/AdvancedSearchPreview";
import PersonalityBarsPreview from "./previews/PersonalityBarsPreview";
import SwipePreview from "./previews/SwipePreview";

export default function PlatformCapabilities() {
  return (
    <section
      className="bg-[#FFF8F0] dark:bg-gray-900 py-24"
      aria-labelledby="platform-capabilities-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            id="platform-capabilities-heading"
            className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Three Ways to Find Your Dog
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the approach that fits your search style
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <CapabilityCard
            visual={<AdvancedSearchPreview />}
            headline="Advanced Search"
            description="Filter dogs by breed, age, size, gender, and location to find your perfect match"
            badge="50+ breeds · 13 rescues · 9 countries"
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