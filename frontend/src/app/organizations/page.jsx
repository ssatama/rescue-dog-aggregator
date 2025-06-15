import OrganizationsClient from './OrganizationsClient';

export const metadata = {
  title: 'Rescue Organizations - Rescue Dog Aggregator',
  description: 'Browse rescue organizations that work tirelessly to rescue and rehome dogs. Find organizations near you and support their mission to save more animals.',
  openGraph: {
    title: 'Rescue Organizations',
    description: 'Browse rescue organizations that work tirelessly to rescue and rehome dogs. Find organizations near you and support their mission to save more animals.',
    type: 'website',
    siteName: 'Rescue Dog Aggregator'
  },
  twitter: {
    card: 'summary',
    title: 'Rescue Organizations',
    description: 'Browse rescue organizations that work tirelessly to rescue and rehome dogs.'
  }
};

export default function OrganizationsPage() {
  return <OrganizationsClient />;
}