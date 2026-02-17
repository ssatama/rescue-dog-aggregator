import type { Metadata } from "next";
import type { OrganizationCardData } from "../../types/organizationComponents";
import OrganizationsClient from "./OrganizationsClient";
import { getEnhancedOrganizationsSSR } from "../../services/organizationsService";
import { reportError } from "../../utils/logger";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  let orgCount = 13;
  try {
    const organizations = await getEnhancedOrganizationsSSR();
    orgCount = organizations?.length || 13;
  } catch (error) {
    reportError(error, { context: "generateMetadata", component: "OrganizationsPage" });
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

export default async function OrganizationsPage(): Promise<React.JSX.Element> {
  let organizations: OrganizationCardData[] = [];

  try {
    organizations = await getEnhancedOrganizationsSSR() as unknown as OrganizationCardData[];
  } catch (error) {
    console.error("Failed to fetch organizations server-side:", error);
  }

  return (
    <OrganizationsClient
      initialData={organizations}
    />
  );
}
