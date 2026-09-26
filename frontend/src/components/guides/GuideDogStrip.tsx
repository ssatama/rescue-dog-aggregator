import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES } from "@/constants/imageSizes";
import { cn } from "@/lib/utils";
import type { GuideDog } from "@/types/guide";

/**
 * A guide's real listed dogs, in place of a stock photo (#503). Square crops
 * of whatever shape the rescue's photo is. `linked` makes each photo open its
 * dog; a card that is itself one link passes false.
 */
export function GuideDogStrip({
  dogs,
  linked = false,
  className,
}: {
  dogs: GuideDog[];
  linked?: boolean;
  className?: string;
}): React.JSX.Element | null {
  if (dogs.length === 0) return null;

  return (
    <ul className={cn("grid grid-cols-3 gap-2", className)} aria-label="Some of the dogs listed now">
      {dogs.map((dog) => {
        const photo = (
          <Image
            src={dog.image}
            alt={dog.name}
            fill
            sizes={IMAGE_SIZES.THUMBNAIL}
            className="object-cover object-[center_30%]"
          />
        );
        return (
          <li key={dog.id} className="relative aspect-square overflow-hidden rounded-lg bg-soft">
            {linked ? (
              <Link
                href={`/dogs/${dog.slug}`}
                className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                {photo}
              </Link>
            ) : (
              photo
            )}
          </li>
        );
      })}
    </ul>
  );
}
