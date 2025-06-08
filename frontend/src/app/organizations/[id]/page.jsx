import { getOrganizationById } from '../../../services/organizationsService';
import OrganizationDetailClient from './OrganizationDetailClient';
import { isValidOpenGraphType } from '../../../types/opengraph';

export async function generateMetadata({ params }) {
  try {
    const organization = await getOrganizationById(params.id);
    
    const title = `${organization.name} - Dog Rescue Organization | Rescue Dog Aggregator`;
    
    let description = `Learn about ${organization.name} and their available dogs for adoption.`;
    
    if (organization.description) {
      description += ` ${organization.description}`;
    }
    
    if (organization.city || organization.country) {
      const location = [organization.city, organization.country].filter(Boolean).join(', ');
      description += ` Located in ${location}.`;
    }

    // Enhanced OpenGraph metadata with validation
    const openGraphType = 'website'; // Primary type for organization pages

    return {
      title,
      description,
      openGraph: {
        title: `${organization.name} - Dog Rescue Organization`,
        description: `Learn about ${organization.name} and their available dogs for adoption.${organization.description ? ` ${organization.description}` : ''}`,
        type: openGraphType,
        siteName: 'Rescue Dog Aggregator',
        // Enhanced metadata for better social sharing
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rescuedogaggregator.com'}/organizations/${params.id}`,
        ...(organization.logo_url && { images: [organization.logo_url] })
      },
      twitter: {
        card: 'summary',
        title: `${organization.name} - Dog Rescue Organization`,
        description: `Learn about ${organization.name} and their available dogs for adoption.`
      }
    };
  } catch (error) {
    return {
      title: 'Organization Not Found | Rescue Dog Aggregator',
      description: 'The requested organization could not be found. Browse our partner rescue organizations.'
    };
  }
}

export default function OrganizationDetailPage({ params }) {
  return <OrganizationDetailClient params={params} />;
}