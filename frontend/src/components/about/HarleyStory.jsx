import Image from "next/image";
import { HARLEY_PHOTOS } from "../../constants/images";

export default function HarleyStory() {
  return (
    <section className="mb-16">
      <h2 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
        Why This Exists
      </h2>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <Image
            src={HARLEY_PHOTOS.before}
            alt="Harley rescue dog first day in Berlin looking uncertain"
            width={800}
            height={600}
            className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
          />
          <p className="text-base font-medium text-gray-600 dark:text-gray-400 mt-2 text-center">
            August 2023 - Day 1 in Berlin
          </p>
        </div>
        <div>
          <Image
            src={HARLEY_PHOTOS.after}
            alt="Harley rescue dog happy and confident at summer cottage"
            width={800}
            height={600}
            className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
          />
          <p className="text-base font-medium text-gray-600 dark:text-gray-400 mt-2 text-center">
            Summer 2024 - At the cottage
          </p>
        </div>
      </div>
      <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto text-center">
        I built this platform after struggling to find Harley through cluttered rescue sites in 2023.
        Most platforms buried dogs under poor design and confusing navigation. Rescue organizations are
        not tech experts - they are experts at rescuing dogs. Every rescue dog deserves to be presented
        at their best.
      </p>
    </section>
  );
}