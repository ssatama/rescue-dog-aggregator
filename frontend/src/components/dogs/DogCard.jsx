// src/components/dogs/DogCard.jsx
import Link from 'next/link';

export default function DogCard({ dog }) {
  // Using placeholder data if no dog is provided
  const name = dog?.name || "Sample Dog";
  const breed = dog?.standardized_breed || dog?.breed || "Mixed Breed";
  const breedGroup = dog?.breed_group || null;
  const ageText = dog?.age_text || "Adult";
  const ageMinMonths = dog?.age_min_months;
  const ageMaxMonths = dog?.age_max_months;
  const sex = dog?.sex || "Unknown";
  const size = dog?.standardized_size || dog?.size || "Unknown";
  const imageUrl = dog?.primary_image_url || null;
  const id = dog?.id || "0";
  const status = dog?.status || "available";

  // Format age in a more standardized way
  const getAgeLabel = () => {
    if (ageMinMonths !== undefined && ageMinMonths !== null) {
      if (ageMinMonths < 12) {
        return `${ageMinMonths} mo${ageMinMonths === 1 ? '' : 's'}`;
      } else {
        const years = Math.floor(ageMinMonths / 12);
        const months = ageMinMonths % 12;
        if (months === 0) {
          return `${years} yr${years === 1 ? '' : 's'}`;
        } else {
          return `${years}y ${months}m`;
        }
      }
    }
    return ageText;
  };

  // Get age category for styling
  const getAgeCategory = () => {
    if (ageMinMonths === undefined || ageMinMonths === null) return null;
    
    if (ageMinMonths < 12) return "puppy";
    if (ageMinMonths < 36) return "young";
    if (ageMinMonths < 96) return "adult";
    return "senior";
  };

  const ageCategory = getAgeCategory();

  // Get size category color
  const getSizeColor = () => {
    switch(size.toLowerCase()) {
      case 'tiny': return 'bg-indigo-100 text-indigo-800';
      case 'small': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'large': return 'bg-orange-100 text-orange-800';
      case 'xlarge':
      case 'extra large': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get age category color
  const getAgeColor = () => {
    switch(ageCategory) {
      case 'puppy': return 'bg-blue-100 text-blue-800';
      case 'young': return 'bg-green-100 text-green-800';
      case 'adult': return 'bg-yellow-100 text-yellow-800';
      case 'senior': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get availability badge based on status
  const getStatusBadge = () => {
    if (status === 'adopted') {
      return <span className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded-md text-xs font-medium">Adopted</span>;
    }
    if (status === 'pending') {
      return <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium">Pending</span>;
    }
    if (status === 'available') {
      return <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium">Available</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      {/* Dog image */}
      <Link href={`/dogs/${id}`} className="block">
        <div className="h-48 bg-gray-200 relative">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-200">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
          {getStatusBadge()}
        </div>
      </Link>
      
      {/* Dog info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-lg mb-1 text-gray-800 truncate">{name}</h3>
          
          {/* Sex icon */}
          <span className="ml-1 text-gray-500" title={sex}>
            {sex.toLowerCase() === 'male' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8 9.586V6a1 1 0 011-1z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M10 3a7 7 0 110 14 7 7 0 010-14z" clipRule="evenodd" />
              </svg>
            ) : sex.toLowerCase() === 'female' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 15a5 5 0 100-10 5 5 0 000 10zm0 2a7 7 0 110-14 7 7 0 010 14z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M10 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M7 12a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </div>
        
        {/* Breed with optional breed group */}
        <div className="mb-2">
          <p className="text-gray-600 text-sm truncate">{breed}</p>
          {breedGroup && breedGroup !== 'Unknown' && (
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mr-1 mt-1">
              {breedGroup}
            </span>
          )}
        </div>
        
        {/* Size and age badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {/* Size badge */}
          <span className={`inline-block text-xs px-2 py-0.5 rounded ${getSizeColor()}`}>
            {size}
          </span>
          
          {/* Age badge */}
          <span className={`inline-block text-xs px-2 py-0.5 rounded ${getAgeColor()}`}>
            {getAgeLabel()}
          </span>
        </div>
        
        <Link 
          href={`/dogs/${id}`}
          className="block text-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm w-full transition-colors duration-300"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}