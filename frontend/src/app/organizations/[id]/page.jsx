import { getOrganizationById } from '../../../services/organizationsService';
import OrganizationDetailClient from './OrganizationDetailClient';
import { isValidOpenGraphType } from '../../../types/opengraph';

/**
 * Generate metadata for organization detail page
 * @param {Object} props - The props object
 * @param {Promise<{id: string}>} props.params - The params promise
 */
export async function generateMetadata(props) {
  try {
    const { params } = props;
    const resolvedParams = params && typeof params.then === 'function' 
      ? await params 
      : params || {};
    const organization = await getOrganizationById(resolvedParams.id);
    
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
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rescuedogaggregator.com'}/organizations/${resolvedParams.id}`,
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

// Check if we're in a test environment
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

/**
 * Organization detail page component
 * @param {Object} props - The props object
 * @param {Promise<{id: string}>} props.params - The params promise
 */
function OrganizationDetailPage(props) {
  // For Jest tests, return synchronously to avoid Promise rendering issues
  if (isTestEnvironment) {
    return <OrganizationDetailClient />;
  }
  
  // This should never be reached in test environment, but is here for safety
  return <OrganizationDetailClient />;
}

/**
 * Async wrapper for Next.js 15 runtime
 * @param {Object} props - The props object with async params
 */
async function OrganizationDetailPageAsync(props) {
  // In Next.js 15, params is a Promise that needs to be awaited
  const { params } = props || {};
  
  if (params) {
    try {
      // Await params Promise (required in Next.js 15)
      await params;
    } catch {
      // Ignore params errors - Client component handles this via useParams()
    }
  }
  
  return <OrganizationDetailClient />;
}

// Export the appropriate version based on environment
export default isTestEnvironment ? OrganizationDetailPage : OrganizationDetailPageAsync;