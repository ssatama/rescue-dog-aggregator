"use client";

import React, { useState } from "react";
import { SwipeContainerWithFilters } from "../../components/swipe/SwipeContainerWithFilters";
import { SwipeDetails } from "../../components/swipe/SwipeDetails";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface Dog {
  id: number;
  name: string;
  breed?: string;
  age?: string;
  image?: string;
  organization?: string;
  location?: string;
  slug: string;
  description?: string;
  traits?: string[];
  energy_level?: number;
  special_characteristic?: string;
  quality_score?: number;
  created_at?: string;
  sex?: string;
  size?: string;
  good_with_dogs?: boolean | string;
  good_with_cats?: boolean | string;
  good_with_kids?: boolean | string;
  additional_images?: string[];
}

export default function SwipePage() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Helper function to map dog data to SwipeDetails format
  const mapDogForDetails = (dog: Dog): any => ({
    id: dog.id,
    name: dog.name,
    age: dog.age || 'Unknown',
    sex: dog.sex || 'Unknown',
    size: dog.size || 'Medium',
    breed: dog.breed || 'Mixed Breed',
    organization_name: dog.organization || '',
    location: dog.location || '',
    adoption_url: `/dogs/${dog.slug}`,
    image_url: dog.image || '',
    additional_images: dog.additional_images || [],
    dog_profiler_data: dog.description ? {
      description: dog.description,
      personality_traits: dog.traits || [],
      energy_level: dog.energy_level,
      good_with_dogs: dog.good_with_dogs,
      good_with_cats: dog.good_with_cats,
      good_with_kids: dog.good_with_kids,
      unique_quirk: dog.special_characteristic
    } : undefined
  });

  // Redirect desktop users
  if (!isMobile && typeof window !== "undefined") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold mb-4">Mobile Only Feature</h1>
          <p className="text-gray-600 mb-6">
            The swipe feature is designed for mobile devices. 
            Please visit this page on your phone to start swiping!
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  const fetchDogsWithFilters = async (queryString: string): Promise<Dog[]> => {
    try {
      const response = await fetch(`/api/dogs/swipe?${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dogs: ${response.statusText}`);
      }
      const data = await response.json();
      return data.dogs || [];
    } catch (error) {
      console.error("Error fetching dogs:", error);
      return [];
    }
  };

  const handleSwipe = (direction: "left" | "right", dog: Dog) => {
    console.log(`Swiped ${direction} on ${dog.name}`);
  };

  const handleCardExpanded = (dog: Dog) => {
    setSelectedDog(dog);
    setShowDetails(true);
  };

  return (
    <div className="h-screen bg-gray-50">
      <SwipeContainerWithFilters
        fetchDogs={fetchDogsWithFilters}
        onSwipe={handleSwipe}
        onCardExpanded={handleCardExpanded}
      />
      
      {selectedDog && (
        <SwipeDetails
          dog={mapDogForDetails(selectedDog)}
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedDog(null);
          }}
        />
      )}
    </div>
  );
}