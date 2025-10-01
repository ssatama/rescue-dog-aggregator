// frontend/src/components/home/CapabilityCard.tsx

import Link from "next/link";

interface CapabilityCardProps {
  visual: React.ReactNode;
  headline: string;
  description: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
  accentColor?: "blue" | "purple" | "orange";
}

export default function CapabilityCard({
  visual,
  headline,
  description,
  badge,
  ctaText,
  ctaHref,
  accentColor = "orange",
}: CapabilityCardProps) {
  // Define accent colors for border and glow
  const accentStyles = {
    blue: {
      border: "border-l-blue-500 dark:border-l-blue-400",
      hoverBorder:
        "group-hover:border-l-blue-600 dark:group-hover:border-l-blue-300",
      shadow: "shadow-blue-500/20",
      hoverShadow: "group-hover:shadow-blue-500/40",
    },
    purple: {
      border: "border-l-purple-500 dark:border-l-purple-400",
      hoverBorder:
        "group-hover:border-l-purple-600 dark:group-hover:border-l-purple-300",
      shadow: "shadow-purple-500/20",
      hoverShadow: "group-hover:shadow-purple-500/40",
    },
    orange: {
      border: "border-l-orange-500 dark:border-l-orange-400",
      hoverBorder:
        "group-hover:border-l-orange-600 dark:group-hover:border-l-orange-300",
      shadow: "shadow-orange-500/20",
      hoverShadow: "group-hover:shadow-orange-500/40",
    },
  };

  const accent = accentStyles[accentColor];

  return (
    <Link href={ctaHref} className="block group">
      <div
        className={`
          h-[480px] 
          bg-gradient-to-br from-white to-orange-50/30 
          dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-800/80
          rounded-xl 
          border-l-4 ${accent.border} ${accent.hoverBorder}
          shadow-lg ${accent.shadow} 
          hover:shadow-2xl ${accent.hoverShadow}
          hover:scale-[1.02] 
          transition-all duration-300 ease-out
          p-8 
          flex flex-col
          ring-1 ring-black/5 dark:ring-white/10
        `}
      >
        {/* Visual Preview Area */}
        <div className="h-[200px] mb-6 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-lg overflow-hidden shadow-inner">
          {visual}
        </div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {headline}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">
          {description}
        </p>

        {/* Badge with icon and enhanced styling */}
        <div className="inline-flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400 mb-4 bg-orange-50/80 dark:bg-orange-900/40 px-4 py-2 rounded-full w-fit border border-orange-200/50 dark:border-orange-800/50">
          <span className="text-base" aria-hidden="true">
            ✨
          </span>
          <span className="font-medium">{badge}</span>
        </div>

        {/* CTA Button */}
        <div className="w-full bg-orange-600 group-hover:bg-orange-700 dark:bg-orange-700 dark:group-hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-center shadow-md group-hover:shadow-lg group-hover:scale-105">
          {ctaText}
        </div>
      </div>
    </Link>
  );
}
