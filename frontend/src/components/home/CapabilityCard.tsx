// frontend/src/components/home/CapabilityCard.tsx

import Link from 'next/link';

interface CapabilityCardProps {
  visual: React.ReactNode;
  headline: string;
  description: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
}

export default function CapabilityCard({
  visual,
  headline,
  description,
  badge,
  ctaText,
  ctaHref,
}: CapabilityCardProps) {
  return (
    <Link href={ctaHref} className="block group">
      <div className="h-[480px] bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col">
        {/* Visual Preview Area */}
        <div className="h-[200px] mb-6 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
          {visual}
        </div>
        
        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {headline}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">
          {description}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {badge}
        </div>
        
        {/* CTA Text */}
        <div className="w-full bg-orange-600 group-hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center">
          {ctaText}
        </div>
      </div>
    </Link>
  );
}