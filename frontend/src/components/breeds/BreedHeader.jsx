import { Badge } from "@/components/ui/badge";
import { Dog, MapPin, Users } from "lucide-react";

export default function BreedHeader({ breedData, breedDescription }) {
  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8 mb-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            {breedData.primary_breed}
          </h1>
          
          {breedDescription?.tagline && (
            <p className="text-xl text-muted-foreground mb-4">
              {breedDescription.tagline}
            </p>
          )}
          
          <div className="flex flex-wrap gap-4 mb-6">
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <Dog className="h-4 w-4" />
              {breedData.count} available
            </Badge>
            {breedData.breed_group && (
              <Badge variant="outline" className="px-3 py-1">
                {breedData.breed_group} Group
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
              <Users className="h-4 w-4" />
              {breedData.organizations?.length || 0} rescues
            </Badge>
            {breedData.countries?.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                <MapPin className="h-4 w-4" />
                {breedData.countries.length} countries
              </Badge>
            )}
          </div>

          {breedDescription?.overview && (
            <p className="text-lg leading-relaxed text-muted-foreground">
              {breedDescription.overview}
            </p>
          )}
        </div>
        
        {breedData.sample_image_url && (
          <div className="lg:w-96">
            <img
              src={breedData.sample_image_url}
              alt={`${breedData.primary_breed} dog`}
              className="w-full h-64 lg:h-80 object-cover rounded-xl shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}