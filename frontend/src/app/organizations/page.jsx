import OrganizationsClient from "./OrganizationsClient";
import { getEnhancedOrganizationsSSR } from "../../services/organizationsService";

export const metadata = {
  title: "Rescue Organizations | Find Dog Rescue Centers",
  description:
    "Browse trusted dog rescue organizations across Europe. Find rescue centers by location, available dogs, and adoption regions.",
  keywords:
    "dog rescue organizations, rescue centers, dog adoption centers, animal shelters Europe, rescue dogs",
  openGraph: {
    title: "Rescue Organizations | Find Dog Rescue Centers",
    description:
      "Browse trusted dog rescue organizations across Europe. Find rescue centers by location, available dogs, and adoption regions.",
    type: "website",
    url: "https://www.rescuedogs.me/organizations",
    images: [
      {
        url: "https://www.rescuedogs.me/og-organizations.jpg",
        width: 1200,
        height: 630,
        alt: "Rescue Organizations",
      },
    ],
  },
};

export const revalidate = 300;

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
      dataTimestamp={Date.now()}
    />
  );
}
