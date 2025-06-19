import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CountryFlag from '../ui/CountryFlag';
import SocialMediaLinks from '../ui/SocialMediaLinks';
import { 
  formatBasedIn, 
  formatServiceRegions, 
  formatShipsToList,
  getCountryName 
} from '../../utils/countries';

/**
 * Hero section for individual organization pages
 * Features warm gradient background, logo, location info, and statistics
 */
export default function OrganizationHero({ organization }) {
  // Handle missing organization data
  if (!organization) {
    return (
      <div className="min-h-[400px] bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization not found</h1>
          <Link href="/organizations" className="text-blue-600 hover:text-blue-800">
            ← Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  // Generate organization initials for logo fallback
  const getInitials = (name) => {
    if (!name) return '??';
    const words = name.split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return words.slice(0, 3).map(word => word.charAt(0).toUpperCase()).join('');
  };

  // Calculate statistics
  const totalDogs = organization.total_dogs || 0;
  const countriesServed = organization.ships_to?.length || 0;
  const newThisWeek = organization.new_this_week || 0;

  return (
    <div 
      className="bg-gradient-to-br from-amber-100 to-orange-200 py-8 px-4 sm:px-6 lg:px-8"
      data-testid="organization-hero"
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2 text-sm">
            <Link 
              href="/organizations" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Organizations
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900 font-medium">{organization.name}</span>
          </div>
        </nav>

        {/* Main Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Logo and Basic Info */}
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-6">
              {/* Organization Logo */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-32 md:h-32 bg-white rounded-full shadow-lg flex items-center justify-center">
                  {organization.logo_url ? (
                    <Image
                      src={organization.logo_url}
                      alt={`${organization.name} logo`}
                      width={120}
                      height={120}
                      className="w-16 h-16 md:w-28 md:h-28 rounded-full object-cover"
                      priority
                    />
                  ) : (
                    <span className="text-lg md:text-2xl font-bold text-orange-600">
                      {getInitials(organization.name)}
                    </span>
                  )}
                </div>
              </div>

              {/* Organization Header Info */}
              <div className="flex-grow text-center sm:text-left">
                {/* Organization Name */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {organization.name}
                </h1>

                {/* Location Information */}
                <div className="space-y-2 text-sm md:text-base">
                  {/* Based in */}
                  {organization.country && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <span className="font-medium text-gray-700">Based in:</span>
                      <div className="hidden sm:flex items-center space-x-1">
                        {formatBasedIn(organization.country, organization.city, false)}
                      </div>
                      <div className="sm:hidden flex items-center space-x-1">
                        {formatBasedIn(organization.country, organization.city, true)}
                      </div>
                    </div>
                  )}

                  {/* Dogs located in */}
                  {organization.service_regions && organization.service_regions.length > 0 && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <span className="font-medium text-gray-700">Dogs located in:</span>
                      <div className="hidden sm:flex items-center space-x-1">
                        {formatServiceRegions(organization.service_regions, true, false)}
                      </div>
                      <div className="sm:hidden flex items-center space-x-1">
                        {formatServiceRegions(organization.service_regions, false, true)}
                      </div>
                    </div>
                  )}

                  {/* Ships to */}
                  {organization.ships_to && organization.ships_to.length > 0 && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <span className="font-medium text-gray-700">Ships to:</span>
                      <div className="hidden sm:flex items-center space-x-1">
                        {formatShipsToList(organization.ships_to, 3)}
                      </div>
                      <div className="sm:hidden flex items-center space-x-1">
                        {formatShipsToList(organization.ships_to, 2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Organization Description */}
                {organization.description && (
                  <p className="mt-4 text-gray-700 leading-relaxed max-w-2xl">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Statistics Cards */}
          <div className="lg:col-span-1">
            <div 
              className="grid grid-cols-2 md:flex md:flex-row lg:grid lg:grid-cols-1 gap-4"
              data-testid="statistics-cards"
            >
              {/* Total Dogs Available */}
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {totalDogs}
                </div>
                <div className="text-sm text-gray-600">Dogs Available</div>
              </div>

              {/* Countries Served */}
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {countriesServed}
                </div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>

              {/* New This Week (only show if > 0) */}
              {newThisWeek > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 text-center col-span-2 md:col-span-1">
                  <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1">
                    {newThisWeek}
                  </div>
                  <div className="text-sm text-gray-600">New This Week</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Social Media and CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          {/* Social Media Links */}
          {organization.social_media && Object.keys(organization.social_media).length > 0 && (
            <div data-testid="social-media-section">
              <SocialMediaLinks 
                socialMedia={organization.social_media}
                className="flex space-x-3"
                size="lg"
              />
            </div>
          )}

          {/* Primary CTA */}
          {organization.website_url && (
            <a
              href={organization.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Visit Original Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}