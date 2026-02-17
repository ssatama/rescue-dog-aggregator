import type { CountryStructuredDataProps } from "@/types/pageComponents";

export default function CountryStructuredData({
  country,
  dogCount,
  stats,
  pageType,
}: CountryStructuredDataProps): React.ReactElement {
  const baseUrl = "https://www.rescuedogs.me";

  const schema =
    pageType === "index"
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Rescue Dogs by Country",
          description: `Browse ${stats?.total || 4600} rescue dogs from ${stats?.countries?.length || 8} European countries`,
          url: `${baseUrl}/dogs/country`,
          numberOfItems: stats?.countries?.length || 8,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: stats?.countries?.map((c, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: c.name,
              url: `${baseUrl}/dogs/country/${c.code.toLowerCase()}`,
            })),
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Rescue Dogs in ${country.name}`,
          description: country.description,
          url: `${baseUrl}/dogs/country/${country.code.toLowerCase()}`,
          numberOfItems: dogCount,
          about: {
            "@type": "Country",
            name: country.name,
          },
        };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
