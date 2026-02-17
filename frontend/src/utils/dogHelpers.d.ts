import type { Dog } from "../types/dog";

type DogInput = Partial<Dog>;

export function formatAge(dog: DogInput): string;
export function getAgeCategory(dog: DogInput): string;
export function formatBreed(dog: DogInput): string | null;
export function formatGender(dog: DogInput): { text: string; icon: string };
export function isRecentDog(dog: DogInput): boolean;
export function getOrganizationName(dog: DogInput): string;
export function getShipsToCountries(dog: DogInput): string[];
export function formatSize(dog: DogInput): string | null;
export function formatExperienceLevel(dog: DogInput): string | null;
export function formatCompatibility(dog: DogInput): {
  withDogs: { icon: string; text: string; color: string };
  withCats: { icon: string; text: string; color: string };
  withChildren: { icon: string; text: string; color: string };
};
export function getPersonalityTraits(dog: DogInput): string[];
