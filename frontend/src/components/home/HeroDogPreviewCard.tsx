"use client";

import Link from "next/link";
import Image from "next/image";
import type { HeroDogPreviewCardProps } from "@/types/homeComponents";

const rotations = ["-3deg", "2deg", "-1.5deg"];

export default function HeroDogPreviewCard({ dog, index = 0, priority = false }: HeroDogPreviewCardProps) {
  const slug = dog.slug || `dog-${dog.id}`;
  const imageUrl = dog.primary_image_url || "/placeholder_dog.svg";
  const rotation = rotations[index % rotations.length];

  return (
    <Link
      href={`/dogs/${slug}`}
      className="group block"
      style={{
        transform: `rotate(${rotation})`,
        zIndex: index,
      }}
    >
      <div
        className="
          bg-[#FFFBF5] dark:bg-gray-800
          p-2 pb-4
          rounded-sm
          shadow-[0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)]
          transition-all duration-300 ease-out
          group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.1)]
          group-hover:-translate-y-2
          group-hover:scale-[1.02]
          group-hover:z-10
        "
      >
        {/* Photo */}
        <div className="relative w-32 h-32 overflow-hidden bg-gray-100 dark:bg-gray-700">
          <Image
            src={imageUrl}
            alt={`${dog.name} - rescue dog available for adoption`}
            fill
            sizes="128px"
            className="object-cover"
            priority={priority}
            placeholder={dog.blur_data_url ? "blur" : "empty"}
            blurDataURL={dog.blur_data_url}
          />
        </div>

        {/* Name - handwritten style */}
        <p
          className="
            mt-2 text-center
            font-[family-name:var(--font-caveat)]
            text-2xl font-semibold
            text-gray-800 dark:text-gray-200
            truncate px-1
          "
        >
          {dog.name}
        </p>
      </div>
    </Link>
  );
}
