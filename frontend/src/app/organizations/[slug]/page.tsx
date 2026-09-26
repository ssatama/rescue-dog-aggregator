import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getOrganizationBySlug,
  getAllOrganizations,
} from "../../../services/organizationsService";
import { reportError } from "../../../utils/logger";
import Layout from "../../../components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import { clampDescription, clampTitle } from "@/utils/seoMeta";
import { getCountryName } from "@/utils/countryNames";
import { getAllMetadata, getAnimals, getListCounts } from "@/services/serverAnimalsService";
import { FILTER_DEFAULTS } from "@/constants/filters";
import OrganizationDetailClient from "./OrganizationDetailClient";
import { OrganizationSchema, BreadcrumbSchema } from "../../../components/seo";
import { notFound } from "next/navigation";

// The API 404s an organization that does not exist or has been deactivated.
// That is a routing outcome, not a fetch failure, and the two need different
// handling: 404 -> notFound(), anything else -> throw so ISR caches nothing.
function isNotFound(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 404;
}

interface OrganizationDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: OrganizationDetailPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await props.params;
    const organization = await getOrganizationBySlug(resolvedParams.slug);

    const title = clampTitle(`${organization.name}: Rescue Dogs for Adoption`);

    // A short third-person summary, not the rescue's own (often first-person, 1,000-char,
    // multi-line) blurb, which search results cut off mid-sentence (#444)
    const location = [organization.city, organization.country ? getCountryName(organization.country) : null]
      .filter(Boolean)
      .join(", ");
    const shipsTo = (organization.ships_to ?? []).map((code) => getCountryName(code));
    const count = organization.total_dogs ?? 0;
    const description = clampDescription(
      [
        `${count > 0 ? `${count} ${count === 1 ? "dog" : "dogs"}` : "Dogs"} available for adoption from ${organization.name}${location ? `, a rescue in ${location}` : ""}.`,
        shipsTo.length === 1 ? `Adopts to ${shipsTo[0]}.` : shipsTo.length > 1 ? `Adopts to ${shipsTo.length} countries.` : "",
      ].join(" "),
    );

    const openGraphType = "website";

    const metadata: Metadata = {
      title,
      description,
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/organizations/${resolvedParams.slug}`,
      },
      openGraph: {
        title: `${organization.name} - Dog Rescue Organization`,
        description,
        type: openGraphType,
        locale: "en_US",
        siteName: "Rescue Dog Aggregator",
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/organizations/${resolvedParams.slug}`,
        ...(organization.logo_url && {
          images: [
            {
              url: organization.logo_url,
              alt: `${organization.name} logo`,
              width: 400,
              height: 400,
              type: "image/png" as const,
            },
          ],
        }),
      },
      twitter: {
        card: "summary",
        site: "@rescuedogsme",
        title: `${organization.name} - Dog Rescue Organization`,
        description: `Learn about ${organization.name} and their available dogs for adoption.`,
      },
    };

    return metadata;
  } catch (error) {
    // A 404 here is the expected answer for a retired org, so it is not worth
    // a Sentry event; reporting it buried the real fetch failures on this route.
    if (isNotFound(error)) {
      return {
        title: "Organization Not Found | Rescue Dog Aggregator",
        description:
          "The requested organization could not be found. Browse our partner rescue organizations.",
      };
    }

    reportError(error, { context: "generateMetadata", component: "OrganizationDetailPage" });
    // The page component throws for this case, so the body renders as an error.
    // Titling it "Not Found" would tell a crawler that a transient failure is a
    // permanent one. Mirrors the dog route's "Error Loading Dog".
    return {
      title: "Error Loading Organization | Rescue Dog Aggregator",
      description:
        "We encountered an error loading this organization's details. Please try again later.",
    };
  }
}

export default async function OrganizationDetailPage(props: OrganizationDetailPageProps): Promise<React.JSX.Element> {
  let slug: string;
  try {
    ({ slug } = await props.params);
  } catch (error) {
    reportError(error, { context: "OrganizationDetailPage", operation: "resolveParams" });
    throw error;
  }

  let organization: Awaited<ReturnType<typeof getOrganizationBySlug>>;
  try {
    organization = await getOrganizationBySlug(slug);
  } catch (error) {
    if (isNotFound(error)) {
      notFound();
    }
    reportError(error, { context: "OrganizationDetailPage", slug });
    // This route is ISR-cached for `revalidate`, so rendering the page
    // without its organization would pin an empty shell for 7 days. Fail the
    // render instead: the next request retries.
    throw error;
  }
  if (organization.id == null) {
    throw new Error(`Organization ${slug} has no id`);
  }
  const organizationId = organization.id;

  // The catalog's first page, in its default order, and the rescue's own
  // counts. Neither may fail the page, which is ISR-cached and prerendered.
  const [initialDogs, counts, metadata] = await Promise.all([
    getAnimals({ organization_id: organizationId, sort: FILTER_DEFAULTS.SORT, limit: 20, offset: 0 }).catch(
      (error: unknown) => {
        reportError(error, { context: "OrganizationDetailPage", operation: "initialDogs" });
        return [];
      },
    ),
    getListCounts({ organization_id: String(organizationId) }),
    getAllMetadata(),
  ]);

  const rescue = {
    ...organization,
    id: organizationId,
    social_media: Object.fromEntries(
      Object.entries(organization.social_media ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "",
      ),
    ),
  };

  return (
    <Layout>
      <OrganizationSchema organization={rescue} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Rescues", url: "/organizations" },
          { name: organization.name },
        ]}
      />
      <Suspense
        fallback={
          <ServerDogListing
            title={organization.name}
            intro={organization.description ?? undefined}
            dogs={initialDogs}
          />
        }
      >
        <OrganizationDetailClient
          organization={rescue}
          initialDogs={initialDogs}
          metadata={metadata}
          counts={counts}
        />
      </Suspense>
    </Layout>
  );
}

export const revalidate = 604800;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const organizations = await getAllOrganizations();

    return organizations
      .filter(
        (org): org is typeof org & { slug: string } =>
          org != null &&
          typeof org.slug === "string" &&
          org.slug.trim() !== "",
      )
      .map((org) => ({
        slug: org.slug,
      }));
  } catch (error) {
    reportError(error, { context: "generateStaticParams", component: "OrganizationDetailPage" });
    return [];
  }
}
