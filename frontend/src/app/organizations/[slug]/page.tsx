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

interface OrganizationDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
    reportError(error, { context: "generateMetadata", component: "OrganizationDetailPage" });
    return {
      title: "Organization Not Found | Rescue Dog Aggregator",
      description:
        "The requested organization could not be found. Browse our partner rescue organizations.",
    };
  }
}

const isTestEnvironment =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

function OrganizationDetailPage(_props: OrganizationDetailPageProps): React.JSX.Element {
  return <Layout><OrganizationDetailClient /></Layout>;
}

async function OrganizationDetailPageAsync(props: OrganizationDetailPageProps): Promise<React.JSX.Element> {
  const { params } = props || {};
  let resolvedParams: { slug?: string } = {};

  if (params) {
    try {
      resolvedParams = await params;
    } catch {
      // Ignore params errors - Client component handles this via useParams()
    }
  }

  let resolvedSearchParams: Record<string, string | string[] | undefined> = {};
  if (props.searchParams) {
    try {
      resolvedSearchParams = await props.searchParams;
    } catch {
      // Ignore searchParams errors - Client component falls back to defaults
    }
  }

  let initialOrganization = null;
  if (resolvedParams.slug) {
    try {
      initialOrganization = await getOrganizationBySlug(resolvedParams.slug);
    } catch (error) {
      reportError(error, { context: "OrganizationDetailPageAsync", slug: resolvedParams.slug });
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
        <OrganizationDetailClient initialOrganization={initialOrganization} initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </Layout>
  );
}

export const revalidate = 86400;

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
