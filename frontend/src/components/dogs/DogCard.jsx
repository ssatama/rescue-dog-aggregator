import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter, // Optional, if you want a distinct footer area
  CardHeader,
  CardTitle,
  // CardDescription // Use if you have a subtitle under the title
} from "@/components/ui/card"; // <<< Import Card components
import { Badge } from "@/components/ui/badge"; // <<< Import Badge component
import { Button } from "@/components/ui/button"; // <<< Import Button

export default function DogCard({ dog }) {
  // Basic validation or default values
  const name = dog?.name || "Unknown Dog";
  const breed = dog?.standardized_breed || dog?.breed || "Unknown Breed";
  const breedGroup = dog?.breed_group; // <<< Get breed group
  const imageUrl = dog?.primary_image_url || '/placeholder-dog.svg'; // Use a placeholder
  const location = dog?.organization?.city ?
    (dog.organization.country ? `${dog.organization.city}, ${dog.organization.country}` : dog.organization.city) :
    "Unknown Location";
  const id = dog?.id || "0";
  const status = dog?.status || 'unknown';

  return (
    // *** Replace outer div with Card ***
    <Card className="overflow-hidden flex flex-col h-full group transition-shadow duration-300 hover:shadow-lg"> {/* Added hover shadow */}
      <CardHeader className="p-0 relative"> {/* Remove padding for image */}
        <Link href={`/dogs/${id}`} className="block relative" aria-label={`View details for ${name}`}> {/* Added aria-label */}
          {/* Image */}
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" // Added hover effect
            // Add error handling for images
            onError={(e) => {
              e.target.onerror = null; // prevent infinite loop
              e.target.src = '/placeholder-dog.svg'; // fallback to placeholder
            }}
          />
          {/* Status Badge (optional) */}
          {status !== 'available' && (
             <Badge
               variant={status === 'adopted' ? "secondary" : "default"} // Use secondary for adopted, default (yellowish?) for pending
               className="absolute top-2 right-2" // Position badge
             >
               {status.charAt(0).toUpperCase() + status.slice(1)}
             </Badge>
           )}
        </Link>
      </CardHeader>

      {/* Use CardContent for the main text body */}
      <CardContent className="p-4 flex flex-col flex-grow"> {/* Add flex-grow to push footer down */}
        <CardTitle className="text-lg font-bold mb-1 truncate group-hover:text-blue-600"> {/* Add hover effect */}
          <Link href={`/dogs/${id}`} className="hover:underline">
            {name}
          </Link>
        </CardTitle>
        <p className="text-sm text-gray-600 mb-1 truncate">{breed}</p> {/* Reduced margin */}
        {/* *** Add Breed Group Badge *** */}
        {breedGroup && breedGroup !== 'Unknown' && (
          <Badge variant="outline" className="text-xs mb-2 w-fit"> {/* Use outline, fit width */}
            {breedGroup} Group
          </Badge>
        )}
        <p className="text-xs text-gray-500 flex-grow">
          {location !== "Unknown Location" ? location : <>&nbsp;</>} {/* Render location or non-breaking space */}
        </p>

        {/* Optional: Add tags/badges here if needed */}
        {/* <div className="mt-2 flex flex-wrap gap-1">
          {dog.sex && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{dog.sex}</span>}
          {dog.age_category && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{dog.age_category}</span>}
        </div> */}
      </CardContent>

      {/* Optional: Use CardFooter for actions or less important info */}
      <CardFooter className="p-4 pt-0"> {/* Remove top padding */}
         {/* Link wraps the Button */}
         <Link href={`/dogs/${id}`} passHref className="w-full"> {/* Link takes full width */}
           {/* Button is now a direct child, no asChild or legacyBehavior needed */}
           <Button
             size="sm"
             variant="outline" // Use outline variant
             className="w-full" // Keep full width
             // Default outline variant usually handles hover states well
           >
             Adopt {name} {/* Change text to "Adopt {dog.name}" */}
           </Button>
         </Link>
      </CardFooter>
    </Card>
  );
}