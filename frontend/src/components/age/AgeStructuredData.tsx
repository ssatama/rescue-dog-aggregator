import type { AgeStructuredDataProps } from "@/types/pageComponents";

export default function AgeStructuredData(props: AgeStructuredDataProps): React.ReactElement {
  const baseUrl = "https://www.rescuedogs.me";

  // Hub/index page schema
  if (props.pageType === "index") {
    const { stats } = props;
    const puppyCount = stats.ageCategories?.find(c => c.slug === "puppies")?.count || 0;
    const seniorCount = stats.ageCategories?.find(c => c.slug === "senior")?.count || 0;
    const totalDogs = puppyCount + seniorCount;

    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Rescue Dogs by Age",
      description: `Browse ${totalDogs.toLocaleString()} rescue dogs by age category. Find ${puppyCount.toLocaleString()} playful puppies or ${seniorCount.toLocaleString()} wise senior dogs waiting for their forever homes.`,
      url: `${baseUrl}/dogs/age`,
      numberOfItems: totalDogs,
      hasPart: [
        {
          "@type": "CollectionPage",
          name: "Rescue Puppies for Adoption",
          url: `${baseUrl}/dogs/puppies`,
          numberOfItems: puppyCount,
        },
        {
          "@type": "CollectionPage",
          name: "Senior Rescue Dogs for Adoption",
          url: `${baseUrl}/dogs/senior`,
          numberOfItems: seniorCount,
        },
      ],
      isPartOf: {
        "@type": "WebSite",
        name: "RescueDogs.me",
        url: baseUrl,
      },
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
    );
  }

  // Single age category page schema
  const { ageCategory, dogCount } = props;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name:
      ageCategory.slug === "puppies"
        ? "Rescue Puppies for Adoption"
        : "Senior Rescue Dogs for Adoption",
    description: ageCategory.description,
    url: `${baseUrl}/dogs/${ageCategory.slug}`,
    numberOfItems: dogCount,
    about: {
      "@type": "Thing",
      name: ageCategory.name,
      description: `${ageCategory.ageRange} rescue dogs available for adoption`,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "RescueDogs.me",
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
