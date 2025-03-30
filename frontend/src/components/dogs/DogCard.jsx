import Link from 'next/link';

export default function DogCard({ dog }) {
  // Using placeholder data if no dog is provided
  const name = dog?.name || "Sample Dog";
  const breed = dog?.breed || "Mixed Breed";
  const ageText = dog?.age_text || "Adult";
  const sex = dog?.sex || "Unknown";
  const imageUrl = dog?.primary_image_url || null;
  const id = dog?.id || "0";

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
        </div>
      </Link>
      
      {/* Dog info */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 text-gray-800">{name}</h3>
        <p className="text-gray-600 text-sm mb-2">
          {breed} • {ageText} • {sex}
        </p>
        
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