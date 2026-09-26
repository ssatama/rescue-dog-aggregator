import Image from "next/image";
import { HARLEY_PHOTOS } from "../../constants/images";

export default function HarleyStory() {
  return (
    <section>
      <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Why this exists
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-6">
        <div className="group relative">
          <div className="relative overflow-hidden rounded-xl bg-soft">
            <Image
              src={HARLEY_PHOTOS.before}
              alt="Harley rescue dog first day in Berlin looking uncertain"
              width={800}
              height={600}
              className="w-full h-auto object-cover aspect-[3/4]"
              priority
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-subtle">
            <svg
              className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">
              August 2023 · Day 1 in Berlin
            </p>
          </div>
        </div>

        <div className="group relative">
          <div className="relative overflow-hidden rounded-xl bg-soft">
            <Image
              src={HARLEY_PHOTOS.after}
              alt="Harley rescue dog happy and confident at summer cottage"
              width={800}
              height={600}
              className="w-full h-auto object-cover aspect-[3/4]"
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-subtle">
            <svg
              className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">
              Summer 2024 · At the cottage
            </p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-lg leading-relaxed text-ink">
          I built this platform after struggling to find my dog Harley through
          cluttered rescue sites in 2023. Most sites buried dogs under poor
          design and confusing navigation. Rescue organizations are not tech
          experts - they are experts at rescuing dogs. Every rescue dog deserves
          to be presented at their best.
        </p>
      </div>
    </section>
  );
}
