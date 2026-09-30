"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import DogsPageClientSimplified from "@/app/dogs/DogsPageClientSimplified";
import type { Dog } from "@/types/dog";
import type { DogsPageMetadata } from "@/types/dogsPage";

interface BreedCatalogProps {
  initialDogs: Dog[];
  metadata?: DogsPageMetadata;
  initialParams: { primary_breed: string } | { breed_group: string };
}

/** The breed's dogs in the catalog itself, with the breed fixed (#500). */
export default function BreedCatalog({ initialDogs, metadata, initialParams }: BreedCatalogProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  // Links from before #500 filtered by ?available_to_country=; the catalog
  // reads available_country, so carry the old name over once
  useEffect(() => {
    const legacy = searchParams?.get("available_to_country");
    if (!searchParams || !legacy || searchParams.get("available_country")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("available_to_country");
    params.set("available_country", legacy);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return (
    <DogsPageClientSimplified
      initialDogs={initialDogs}
      metadata={metadata}
      initialParams={initialParams}
      hideHero
      hideBreadcrumbs
    />
  );
}
