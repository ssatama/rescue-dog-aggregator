import Link from 'next/link';

export default function OrganizationCard({ organization }) {
  // Using placeholder data if no organization is provided
  const name = organization?.name || "Sample Organization";
  const location = organization?.city ? 
    (organization.country ? `${organization.city}, ${organization.country}` : organization.city) : 
    (organization?.country || "Unknown Location");
  const description = organization?.description || "No description available";
  const websiteUrl = organization?.website_url || "#";
  const logoUrl = organization?.logo_url || null;
  const id = organization?.id || "0";

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Logo/Image area */}
      <div className="p-6 flex justify-center items-center bg-gray-50">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={name} 
            className="h-24 object-contain"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-500">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      
      {/* Organization info */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
        <p className="text-gray-600 text-sm mb-2">{location}</p>
        <p className="text-gray-700 mb-4 line-clamp-3">{description}</p>
        
        <div className="flex space-x-3">
          <a 
            href={websiteUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 inline-block text-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            Visit Website
          </a>
          
          <Link 
            href={`/organizations/${id}`}
            className="flex-1 inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm transition-colors"
          >
            View Dogs
          </Link>
        </div>
      </div>
    </div>
  );
}