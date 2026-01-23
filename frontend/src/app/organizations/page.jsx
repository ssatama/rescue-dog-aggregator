import OrganizationsClient from "./OrganizationsClient";
import { getEnhancedOrganizationsSSR } from "../../services/organizationsService";

export const revalidate = 300;

// Generate metadata with dynamic schema
export async function generateMetadata() {
  let orgCount = 13;
  try {
    const organizations = await getEnhancedOrganizationsSSR();
    orgCount = organizations?.length || 13;
  } catch (e) {
    // Use fallback count
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rescue Organizations",
    description: "Browse trusted dog rescue organizations across Europe",
    url: "https://www.rescuedogs.me/organizations",
    numberOfItems: orgCount,
  };

  return {
    title: "Rescue Organizations | Find Dog Rescue Centers",
    description:
      "Browse trusted dog rescue organizations across Europe. Find rescue centers by location, available dogs, and adoption regions.",
    keywords:
      "dog rescue organizations, rescue centers, dog adoption centers, animal shelters Europe, rescue dogs",
    alternates: {
      canonical: "https://www.rescuedogs.me/organizations",
    },
    openGraph: {
      title: "Rescue Organizations | Find Dog Rescue Centers",
      description:
        "Browse trusted dog rescue organizations across Europe. Find rescue centers by location, available dogs, and adoption regions.",
      type: "website",
      url: "https://www.rescuedogs.me/organizations",
      images: [
        {
          url: "https://www.rescuedogs.me/og-image.png",
          width: 1200,
          height: 630,
          alt: "Rescue Organizations",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Rescue Organizations | Dog Rescue Centers",
      description: "Browse trusted dog rescue organizations across Europe.",
    },
    other: {
      "application/ld+json": JSON.stringify(collectionSchema),
    },
  };
}

export default async function OrganizationsPage() {
  let organizations = [];

  try {
    organizations = await getEnhancedOrganizationsSSR();
  } catch (error) {
    console.error("Failed to fetch organizations server-side:", error);
  }

  return (
    <OrganizationsClient
      initialData={organizations}
    />
  );
}
