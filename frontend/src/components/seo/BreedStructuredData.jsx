/**
 * Structured data component for breed pages
 * Implements multiple schema types for rich snippets and enhanced SERP features
 */

export default function BreedStructuredData({
  breedData,
  dogs,
  pageType = "detail",
}) {
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

  // Build Article schema for breed descriptions
  const articleSchema = breedData.description
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${breedData.primary_breed || "Mixed Breed"} Dogs: Breed Information & Adoption Guide`,
        description:
          breedData.description?.tagline ||
          breedData.description?.overview ||
          `Learn about ${breedData.primary_breed} dogs available for adoption`,
        author: {
          "@type": "Organization",
          name: "Rescue Dogs",
          url: baseUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "Rescue Dogs",
          url: baseUrl,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/logo.png`,
          },
        },
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${baseUrl}/breeds/${breedData.breed_slug || "mixed"}`,
        },
      }
    : null;

  // Build AggregateRating schema using breed statistics
  // NOTE: Removed fake ratings - will add back when real review data exists
  const aggregateRating = null;

  // Build FAQPage schema with common breed questions
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many ${breedData.primary_breed || "mixed breed"} dogs are available for adoption?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Currently, there are ${breedData.count || 0} ${breedData.primary_breed || "mixed breed"} dogs available for adoption from verified rescue organizations.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the average age of ${breedData.primary_breed || "mixed breed"} rescue dogs?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The average age of ${breedData.primary_breed || "mixed breed"} dogs in our network is ${breedData.average_age ? `${breedData.average_age} years` : "varies, with dogs ranging from puppies to seniors"}.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the temperament of ${breedData.primary_breed || "mixed breed"} dogs?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            breedData.description?.temperament ||
            `${breedData.primary_breed || "Mixed breed"} dogs have unique personalities. Each dog's temperament is assessed by rescue organizations to help match them with suitable homes.`,
        },
      },
      {
        "@type": "Question",
        name: `Are ${breedData.primary_breed || "mixed breed"} dogs good with children?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            breedData.description?.family ||
            `Many ${breedData.primary_breed || "mixed breed"} dogs can be excellent with children when properly socialized. Each dog's compatibility with children is evaluated individually by rescue organizations.`,
        },
      },
    ],
  };

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
              offers: {
                "@type": "Offer",
                price: 0,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                seller: {
                  "@type": "Organization",
                  name: dog.organization?.name || "Rescue Organization",
                },
              },
            },
          })),
        }
      : null;

  // Build Organization schema for rescue network
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rescue Dogs Network",
    url: baseUrl,
    description: "Aggregating rescue dogs from multiple verified organizations",
    sameAs: [
      "https://www.facebook.com/rescuedogs",
      "https://www.instagram.com/rescuedogs",
      "https://twitter.com/rescuedogs",
    ],
  };

  // Combine all schemas
  const schemas = [
    breadcrumbList,
    articleSchema,
    aggregateRating,
    faqSchema,
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
