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
import { getAnimals } from "@/services/serverAnimalsService";
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
        `${count > 0 ? `${count} dogs` : "Dogs"} available for adoption from ${organization.name}${location ? `, a rescue in ${location}` : ""}.`,
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

const isTestEnvironment =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

function OrganizationDetailPage(_props: OrganizationDetailPageProps): React.JSX.Element {
  return <Layout><OrganizationDetailClient /></Layout>;
}

export async function OrganizationDetailPageAsync(props: OrganizationDetailPageProps): Promise<React.JSX.Element> {
  const { params } = props || {};
  let resolvedParams: { slug?: string } = {};

  if (params) {
    try {
      resolvedParams = await params;
    } catch (error) {
      reportError(error, { context: "OrganizationDetailPageAsync", operation: "resolveParams" });
      throw error;
    }
  }

  let initialOrganization = null;
  if (resolvedParams.slug) {
    try {
      initialOrganization = await getOrganizationBySlug(resolvedParams.slug);
    } catch (error) {
      if (isNotFound(error)) {
        notFound();
      }
      reportError(error, { context: "OrganizationDetailPageAsync", slug: resolvedParams.slug });
      // This route is ISR-cached for `revalidate`, so rendering the page
      // without its organization would pin an empty shell for 7 days. Fail the
      // render instead: the next request retries.
      throw error;
    }
  }

  // Only for the server-rendered fallback crawlers read (#437); the client fetches its own.
  // A failure here must not fail the page, which is ISR-cached and prerendered at build.
  let initialDogs: Awaited<ReturnType<typeof getAnimals>> = [];
  if (initialOrganization?.id != null) {
    try {
      initialDogs = await getAnimals({ organization_id: initialOrganization.id, limit: 20, offset: 0 });
    } catch (error) {
      reportError(error, { context: "OrganizationDetailPageAsync", operation: "fallbackDogs" });
    }
  }

  const breadcrumbItems = initialOrganization
    ? [
        { name: "Home", url: "/" },
        { name: "Organizations", url: "/organizations" },
        { name: initialOrganization.name },
      ]
    : null;

  return (
    <Layout>
      {initialOrganization && initialOrganization.id != null && (
        <OrganizationSchema organization={{ ...initialOrganization, id: initialOrganization.id }} />
      )}
      {breadcrumbItems && <BreadcrumbSchema items={breadcrumbItems} />}
      <Suspense
        fallback={
          initialOrganization ? (
            <ServerDogListing
              title={initialOrganization.name}
              intro={initialOrganization.description ?? undefined}
              dogs={initialDogs}
            />
          ) : null
        }
      >
        <OrganizationDetailClient initialOrganization={initialOrganization} />
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

export default isTestEnvironment
  ? OrganizationDetailPage
  : OrganizationDetailPageAsync;
