import OrganizationsClient from './OrganizationsClient';

export const metadata = {
  title: 'Rescue Organizations - Rescue Dog Aggregator',
  description: 'Browse rescue organizations from across Europe. See where dogs are located, shipping information, available dogs count, and recent additions. Support organizations saving animals worldwide.',
  keywords: 'rescue organizations, dog adoption, animal rescue, Europe, shipping dogs, pet adoption',
  openGraph: {
    title: 'Rescue Organizations - Find Your Perfect Match',
    description: 'Browse rescue organizations from across Europe. See where dogs are located, shipping information, available dogs count, and recent additions.',
    type: 'website',
    siteName: 'Rescue Dog Aggregator'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rescue Organizations - Enhanced Listings',
    description: 'Discover rescue organizations with detailed geographic information, dog statistics, and recent additions.'
  }
};

export default function OrganizationsPage() {
  return <OrganizationsClient />;
}