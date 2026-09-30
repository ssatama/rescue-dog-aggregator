import Link from "next/link";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { GalleryDog } from "@/types/breeds";

// A third of the half-width column:
const SIZES = "(max-width: 1280px) 17vw, 215px";
const GALLERY_MEDIA = "(min-width: 1024px)";

interface BreedPhotoGalleryProps {
  dogs: GalleryDog[];
  breedName: string;
  className?: string;
}

export default function BreedPhotoGallery({ dogs, breedName, className = "" }: BreedPhotoGalleryProps) {
  // None of the breed's newest dogs has a photo (pickGalleryDogs logs it):
  // leave the gallery out rather than apologise for it (#660)
  if (!dogs || dogs.length === 0) {
    return null;
  }

  // Its first row is the page's largest image from 1024px, so it is preloaded
  // there, and only there: a phone hides the gallery and its lazy images are
  // never fetched (#672)
  dogs.slice(0, 3).forEach((dog) => {
    const { props } = getImageProps({ src: dog.primary_image_url, alt: "", fill: true, sizes: SIZES });
    preload(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      media: GALLERY_MEDIA,
      fetchPriority: "high",
    });
  });

  // From 1024px, beside the breed's details. Below that the list's own cards
  // are the photos, just under the header, so a gallery only repeated them (#661)
  return (
    <div className={`breed-photo-gallery hidden lg:block ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {dogs.slice(0, 6).map((dog, index) => (
          <Link
            key={dog.slug}
            href={`/dogs/${dog.slug}`}
            className="relative overflow-hidden rounded-xl cursor-pointer group block aspect-[4/5]"
          >
            <Image
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none"
              sizes={SIZES}
              fetchPriority={index < 3 ? "high" : "auto"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none" />
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
              <span className="text-white text-sm font-medium">
                {dog.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
