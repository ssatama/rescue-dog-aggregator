/**
 * FAQ Schema.org structured data generation utilities
 * Generates FAQPage schema for dog detail pages to enable rich results
 */

interface DogProfilerData {
  good_with_children?: "yes" | "no" | "maybe" | "unknown";
  good_with_dogs?: "yes" | "no" | "maybe" | "unknown";
  good_with_cats?: "yes" | "no" | "maybe" | "unknown";
  energy_level?: "low" | "medium" | "high" | "very_high";
  experience_level?: "first_time_ok" | "some_experience" | "experienced_only";
  home_type?: "apartment_ok" | "house_preferred" | "house_required";
  exercise_needs?: "minimal" | "moderate" | "high";
}

interface DogData {
  name: string;
  dog_profiler_data?: DogProfilerData;
}

interface FAQItem {
  "@type": "Question";
  name: string;
  acceptedAnswer: {
    "@type": "Answer";
    text: string;
  };
}

interface FAQSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: FAQItem[];
}

type CompatibilityValue = "yes" | "no" | "maybe" | "unknown";

const formatCompatibilityAnswer = (
  name: string,
  value: CompatibilityValue,
  subject: string
): string => {
  switch (value) {
    case "yes":
      return `Yes, ${name} is great with ${subject} and would make a wonderful companion.`;
    case "no":
      return `No, ${name} prefers a home without ${subject}.`;
    case "maybe":
      return `It depends - ${name} may need proper introductions and supervision with ${subject}.`;
    case "unknown":
      return `We don't have specific information about ${name}'s compatibility with ${subject}. Please contact the rescue for more details.`;
    default:
      return `Please contact the rescue organization for information about ${name}'s compatibility with ${subject}.`;
  }
};

const formatEnergyLevelAnswer = (
  name: string,
  level: DogProfilerData["energy_level"]
): string => {
  switch (level) {
    case "low":
      return `${name} has a calm, low-energy temperament. They enjoy relaxed walks and plenty of cuddle time.`;
    case "medium":
      return `${name} has medium energy. They enjoy daily walks and playtime but also love to relax.`;
    case "high":
      return `${name} has high energy and needs regular exercise, play sessions, and mental stimulation.`;
    case "very_high":
      return `${name} has very high energy and requires extensive daily exercise, activities, and mental challenges.`;
    default:
      return `Please contact the rescue organization for information about ${name}'s energy level.`;
  }
};

const formatExperienceLevelAnswer = (
  name: string,
  level: DogProfilerData["experience_level"]
): string => {
  switch (level) {
    case "first_time_ok":
      return `Yes, ${name} is suitable for first-time dog owners. They have a gentle, adaptable nature.`;
    case "some_experience":
      return `${name} would do best with owners who have some previous dog experience.`;
    case "experienced_only":
      return `${name} requires an experienced dog owner who understands their specific needs.`;
    default:
      return `Please contact the rescue organization for guidance on the experience level needed for ${name}.`;
  }
};

const formatHomeTypeAnswer = (
  name: string,
  type: DogProfilerData["home_type"]
): string => {
  switch (type) {
    case "apartment_ok":
      return `${name} can adapt well to apartment living with regular walks and outdoor time.`;
    case "house_preferred":
      return `${name} would prefer a house with some outdoor space, though may adapt to apartment living.`;
    case "house_required":
      return `${name} needs a house with a secure garden or yard due to their size or exercise requirements.`;
    default:
      return `Please contact the rescue organization for information about ${name}'s housing needs.`;
  }
};

/**
 * Generate FAQPage schema for dog detail pages
 * Uses dog_profiler_data fields to create unique Q&A content
 */
export const generateFAQSchema = (dog: DogData): FAQSchema | null => {
  if (!dog?.name || !dog?.dog_profiler_data) {
    return null;
  }

  const { name, dog_profiler_data } = dog;
  const faqs: FAQItem[] = [];

  if (
    dog_profiler_data.good_with_children &&
    dog_profiler_data.good_with_children !== "unknown"
  ) {
    faqs.push({
      "@type": "Question",
      name: `Is ${name} good with children?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatCompatibilityAnswer(
          name,
          dog_profiler_data.good_with_children,
          "children"
        ),
      },
    });
  }

  if (
    dog_profiler_data.good_with_dogs &&
    dog_profiler_data.good_with_dogs !== "unknown"
  ) {
    faqs.push({
      "@type": "Question",
      name: `Does ${name} get along with other dogs?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatCompatibilityAnswer(
          name,
          dog_profiler_data.good_with_dogs,
          "other dogs"
        ),
      },
    });
  }

  if (
    dog_profiler_data.good_with_cats &&
    dog_profiler_data.good_with_cats !== "unknown"
  ) {
    faqs.push({
      "@type": "Question",
      name: `Can ${name} live with cats?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatCompatibilityAnswer(
          name,
          dog_profiler_data.good_with_cats,
          "cats"
        ),
      },
    });
  }

  if (dog_profiler_data.energy_level) {
    faqs.push({
      "@type": "Question",
      name: `What is ${name}'s energy level?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatEnergyLevelAnswer(name, dog_profiler_data.energy_level),
      },
    });
  }

  if (dog_profiler_data.experience_level) {
    faqs.push({
      "@type": "Question",
      name: `Is ${name} suitable for first-time dog owners?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatExperienceLevelAnswer(
          name,
          dog_profiler_data.experience_level
        ),
      },
    });
  }

  if (dog_profiler_data.home_type) {
    faqs.push({
      "@type": "Question",
      name: `What type of home does ${name} need?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: formatHomeTypeAnswer(name, dog_profiler_data.home_type),
      },
    });
  }

  if (faqs.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs,
  };
};
