import type { Metadata } from "next";
import {
  getOrganizationBySlug,
  getAllOrganizations,
} from "../../../services/organizationsService";
import {
  generateOrganizationSchema,
  generateJsonLdScript,
} from "../../../utils/schema";
import OrganizationDetailClient from "./OrganizationDetailClient";

interface OrganizationWithDetails {
  name: string;
  slug?: string;
  description?: string;
  city?: string;
  country?: string;
  logo_url?: string;
}

interface OrganizationDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: OrganizationDetailPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await props.params;
    const organization = await getOrganizationBySlug(resolvedParams.slug) as unknown as OrganizationWithDetails;

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

    const organizationSchema = generateOrganizationSchema(organization);

    const openGraphType = "website";

    const metadata: Record<string, unknown> = {
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
              type: "image/png",
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

    if (organizationSchema) {
      metadata.other = {
        "script:ld+json": generateJsonLdScript(organizationSchema),
      };
    }

    return metadata as Metadata;
  } catch {
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
  if (isTestEnvironment) {
    return <OrganizationDetailClient />;
  }

  return <OrganizationDetailClient />;
}

async function OrganizationDetailPageAsync(props: OrganizationDetailPageProps): Promise<React.JSX.Element> {
  const { params } = props || {};

  if (params) {
    try {
      await params;
    } catch {
      // Ignore params errors - Client component handles this via useParams()
    }
  }

  return <OrganizationDetailClient />;
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
  } catch {
    return [];
  }
}

export default isTestEnvironment
  ? OrganizationDetailPage
  : OrganizationDetailPageAsync;
