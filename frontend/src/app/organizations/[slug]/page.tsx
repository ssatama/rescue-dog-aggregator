import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getOrganizationBySlug,
  getAllOrganizations,
} from "../../../services/organizationsService";
import { reportError } from "../../../utils/logger";
import Layout from "../../../components/layout/Layout";
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

    const title = `${organization.name} - Dog Rescue Organization | Rescue Dog Aggregator`;

    let description = `Learn about ${organization.name} and their available dogs for adoption.`;

    if (organization.description) {
      description += ` ${organization.description}`;
    }

    if (organization.city || organization.country) {
      const location = [organization.city, organization.country]
        .filter(Boolean)
        .join(", ");
      description += ` Located in ${location}.`;
    }

    const openGraphType = "website";

    const metadata: Metadata = {
      title,
      description,
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/organizations/${resolvedParams.slug}`,
      },
      openGraph: {
        title: `${organization.name} - Dog Rescue Organization`,
        description: `Learn about ${organization.name} and their available dogs for adoption.${organization.description ? ` ${organization.description}` : ""}`,
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
      <Suspense>
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
