import type { Metadata } from "next";
import type { OrganizationCardData } from "../../types/organizationComponents";
import OrganizationsClient from "./OrganizationsClient";
import Layout from "../../components/layout/Layout";
import { getEnhancedOrganizationsSSR } from "../../services/organizationsService";
import { reportError } from "../../utils/logger";

export const revalidate = 300;

export function generateMetadata(): Metadata {
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
  };
}

export default async function OrganizationsPage(): Promise<React.JSX.Element> {
  let organizations: OrganizationCardData[] = [];

  try {
    organizations = await getEnhancedOrganizationsSSR() as unknown as OrganizationCardData[];
  } catch (error) {
    reportError(error, { context: "OrganizationsPage", operation: "getEnhancedOrganizationsSSR" });
  }

  const collectionJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rescue Organizations",
    description: "Browse trusted dog rescue organizations across Europe",
    url: "https://www.rescuedogs.me/organizations",
    numberOfItems: organizations.length || 13,
  }).replace(/</g, "\\u003c");

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: collectionJsonLd }}
      />
      <OrganizationsClient
        initialData={organizations}
      />
    </Layout>
  );
}
