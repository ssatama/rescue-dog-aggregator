import type { BreedStructuredDataProps } from "@/types/breeds";

export default function BreedStructuredData({
  breedData,
  dogs,
  pageType = "detail",
}: BreedStructuredDataProps) {
  if (!breedData) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";

  // Build breadcrumb list
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Dog Breeds",
        item: `${baseUrl}/breeds`,
      },
    ],
  };

  // Add breed-specific breadcrumb for detail pages
  if (pageType === "detail" && breedData.primary_breed) {
    breadcrumbList.itemListElement.push({
      "@type": "ListItem",
      position: 3,
      name: breedData.primary_breed,
      item: `${baseUrl}/breeds/${breedData.breed_slug || "mixed"}`,
    });
  }

  // Build CollectionPage schema for breeds hub
  const collectionSchema =
    pageType === "hub"
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Dog Breeds Available for Adoption",
          description:
            "Browse rescue dogs by breed with real-time availability from verified organizations",
          url: `${baseUrl}/breeds`,
          numberOfItems: breedData.unique_breeds || 0,
          hasPart:
            breedData.qualifying_breeds?.map((breed) => ({
              "@type": "WebPage",
              name: `${breed.primary_breed} Dogs`,
              url: `${baseUrl}/breeds/${breed.breed_slug}`,
              description: `${breed.count} ${breed.primary_breed} dogs available`,
            })) || [],
        }
      : null;

  // Build ItemList schema for available dogs
  const itemListSchema =
    dogs && dogs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Available ${breedData.primary_breed || "Mixed Breed"} Dogs`,
          numberOfItems: dogs.length,
          itemListElement: dogs.map((dog, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name: dog.name,
              description:
                dog.properties?.description ||
                `Meet ${dog.name}, a ${dog.breed || "mixed breed"} dog available for adoption`,
              image: dog.primary_image_url,
            },
          })),
        }
      : null;

  // Build Organization schema for rescue network
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rescue Dog Aggregator",
    url: baseUrl,
    description: "Aggregating rescue dogs from multiple verified organizations",
  };

  // Combine all schemas
  const schemas = [
    breadcrumbList,
    collectionSchema,
    itemListSchema,
    organizationSchema,
  ].filter(Boolean);

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
