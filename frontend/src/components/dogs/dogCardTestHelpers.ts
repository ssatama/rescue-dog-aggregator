import type { Dog } from "@/types/dog";

export const mockDog: Dog = {
  id: 1,
  slug: "buddy-labrador-retriever-1",
  name: "Buddy",
  standardized_breed: "Labrador Retriever",
  breed: "Lab Mix",
  breed_group: "Test Group",
  age_text: "2 years",
  age_min_months: 24,
  sex: "Male",
  standardized_size: "Large",
  size: "Large",
  primary_image_url: "https://example.com/image.jpg",
  status: "available",
  organization: {
    name: "Test Organization",
    city: "Test City",
    country: "TC",
  },
};

export const incompleteDataDog: Dog = {
  id: 2,
  name: "Max",
  status: "available",
};

export const dogWithUnknownBreed: Dog = {
  id: 3,
  name: "Luna",
  standardized_breed: "Unknown",
  breed: "Unknown",
  status: "available",
};

export const recentDog = (daysAgo: number = 2): Dog => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: 1,
    name: "Buddy",
    status: "available",
    primary_image_url: "https://example.com/image.jpg",
    created_at: date.toISOString(),
    organization: { name: "Test Org", city: "Test City", country: "TC" },
  };
};

export const dogWithShipping: Dog = {
  id: 1,
  name: "Buddy",
  status: "available",
  organization: {
    name: "REAN",
    ships_to: ["DE", "NL", "BE", "FR"],
  },
};

export const dogWithCompatibility: Dog = {
  id: 1,
  name: "Buddy",
  status: "available",
  dog_profiler_data: {
    good_with_dogs: "yes",
    good_with_cats: "maybe",
    good_with_children: "no",
  },
};

export const dogWithTraits: Dog = {
  id: 1,
  name: "Buddy",
  status: "available",
  dog_profiler_data: {
    personality_traits: ["Friendly", "Energetic", "Loyal", "Smart", "Playful"],
  },
};

export const dogWithExperience: Dog = {
  id: 1,
  name: "Buddy",
  status: "available",
  dog_profiler_data: {
    experience_level: "some_experience",
  },
};
