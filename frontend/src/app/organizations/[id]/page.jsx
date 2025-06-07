import { getOrganizationById } from '../../../services/organizationsService';
import OrganizationDetailClient from './OrganizationDetailClient';

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

    return {
      title,
      description,
      openGraph: {
        title: `${organization.name} - Dog Rescue Organization`,
        description: `Learn about ${organization.name} and their available dogs for adoption.${organization.description ? ` ${organization.description}` : ''}`,
        type: 'organization',
        siteName: 'Rescue Dog Aggregator'
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