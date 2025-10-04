import Image from "next/image";
import { HARLEY_PHOTOS } from "../../constants/images";

export default function HarleyStory() {
  return (
    <section className="mb-16">
      <h2 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
        Why This Exists
      </h2>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="group relative">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <Image
              src={HARLEY_PHOTOS.before}
              alt="Harley rescue dog first day in Berlin looking uncertain"
              width={800}
              height={600}
              className="w-full h-auto object-cover aspect-[3/4]"
              priority
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base font-medium">August 2023 - Day 1 in Berlin</p>
          </div>
        </div>

        <div className="group relative">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <Image
              src={HARLEY_PHOTOS.after}
              alt="Harley rescue dog happy and confident at summer cottage"
              width={800}
              height={600}
              className="w-full h-auto object-cover aspect-[3/4]"
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base font-medium">Summer 2024 - At the cottage</p>
          </div>
        </div>
      </div>
      <div className="relative">
        {/* Add accent border */}
        <div className="absolute left-0 top-0 w-1 h-24 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full"></div>
        
        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed pl-8 max-w-4xl mx-auto">
          I built this platform after struggling to find Harley through cluttered rescue sites in 2023.
          Most platforms buried dogs under poor design and confusing navigation. Rescue organizations are
          not tech experts - they are experts at rescuing dogs. Every rescue dog deserves to be presented
          at their best.
        </p>
      </div>
    </section>
  );
}