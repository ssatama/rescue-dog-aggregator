import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SocialMediaLinks from '../ui/SocialMediaLinks';
import LazyImage from '../ui/LazyImage';
import { handleImageError } from '../../utils/imageUtils';

export default function OrganizationCard({ organization }) {
  // Using placeholder data if no organization is provided
  const name = organization?.name || "Sample Organization";
  const location = organization?.city ? 
    (organization.country ? `${organization.city}, ${organization.country}` : organization.city) : 
    (organization?.country || "Unknown Location");
  const description = organization?.description || "No description available";
  const websiteUrl = organization?.website_url || "#";
  const logoUrl = organization?.logo_url || null;
  const socialMedia = organization?.social_media || {};
  const id = organization?.id || "0";

  return (
    <div className="block rounded-lg border hover:shadow-lg overflow-hidden">
      <Card className="overflow-hidden flex flex-col h-full transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="p-6 flex justify-center items-center bg-gray-50">
          {logoUrl ? (
            <LazyImage 
              src={logoUrl} 
              alt={name} 
              className="h-24 object-contain"
              onError={(e) => handleImageError(e, logoUrl)}
              placeholder={
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <span className="text-2xl font-bold text-blue-500">
                    {name.charAt(0)}
                  </span>
                </div>
              }
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-500">
                {name.charAt(0)}
              </span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-6 flex flex-col flex-grow">
          <CardTitle className="text-gray-800 mb-2">{name}</CardTitle>
          <p className="text-gray-600 text-small mb-2">{location}</p>
          <p className="text-body text-gray-700 mb-4 line-clamp-3 flex-grow">{description}</p>
          
          {/* Social Media Links */}
          {socialMedia && Object.keys(socialMedia).length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-tiny text-gray-500 mb-2">Follow us:</p>
              <SocialMediaLinks socialMedia={socialMedia} className="justify-start" />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <div className="flex space-x-3 w-full">
            <Button asChild size="sm" className="flex-1">
              <a 
                href={websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
              >
                Visit Website
              </a>
            </Button>
            
            <Link href={`/organizations/${id}`}>
              <Button variant="secondary" size="sm" className="flex-1">
                View Dogs
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}