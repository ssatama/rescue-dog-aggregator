import type { DogWithProfiler, DogProfilerData } from "../types/dogProfiler";

export interface PersonalityPattern {
  commonTraits: string[];
  personalityTheme: string;
  traitFrequency: Record<string, number>;
  dominantTraits: string[];
}

export interface LifestyleCompatibility {
  apartmentSuitability: number;
  activeFamilySuitability: number;
  firstTimeOwnerSuitability: number;
  workFromHomeSuitability: number;
  messages: string[];
}

export interface ExperienceRequirements {
  overallLevel:
    | "beginner_friendly"
    | "some_experience_needed"
    | "experienced_only";
  distribution: Record<string, number>;
  recommendation: string;
}

export interface HiddenGems {
  uniqueQuirks: Array<{ dogName: string; quirk: string }>;
  sharedActivities: string[];
  unexpectedCommonalities: string[];
  funFacts: string[];
}

export interface CareComplexity {
  overallScore: "low" | "moderate" | "high";
  factors: {
    training: number;
    grooming: number;
    medical: number;
    exercise: number;
  };
  description: string;
}

export interface EnhancedInsights {
  personalityPattern: PersonalityPattern | null;
  lifestyleCompatibility: LifestyleCompatibility | null;
  experienceRequirements: ExperienceRequirements | null;
  hiddenGems: HiddenGems | null;
  careComplexity: CareComplexity | null;
  energyProfile: {
    averageLevel: string;
    distribution: Record<string, number>;
    recommendation: string;
  } | null;
  compatibilityMatrix: {
    withDogs: { yes: number; no: number; maybe: number; unknown: number };
    withCats: { yes: number; no: number; maybe: number; unknown: number };
    withChildren: { yes: number; no: number; maybe: number; unknown: number };
  } | null;
}

export function analyzePersonalityPatterns(
  dogs: DogWithProfiler[],
): PersonalityPattern | null {
  const dogsWithData = dogs.filter(
    (d) => d.dog_profiler_data?.personality_traits,
  );
  if (dogsWithData.length === 0) return null;

  const traitCounts: Record<string, number> = {};
  const allTraits: string[] = [];

  dogsWithData.forEach((dog) => {
    const traits = dog.dog_profiler_data?.personality_traits || [];
    traits.forEach((trait) => {
      const normalizedTrait = trait.toLowerCase().trim();
      traitCounts[normalizedTrait] = (traitCounts[normalizedTrait] || 0) + 1;
      allTraits.push(normalizedTrait);
    });
  });

  // Find common traits (appear in >50% of dogs)
  const threshold = Math.ceil(dogsWithData.length * 0.5);
  const commonTraits = Object.entries(traitCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([trait]) => trait)
    .sort((a, b) => traitCounts[b] - traitCounts[a]);

  // Determine personality theme
  let personalityTheme = "Diverse personalities";
  if (commonTraits.includes("gentle") || commonTraits.includes("calm")) {
    personalityTheme = "You prefer calm, gentle companions";
  } else if (
    commonTraits.includes("playful") ||
    commonTraits.includes("energetic")
  ) {
    personalityTheme = "You love playful, energetic dogs";
  } else if (
    commonTraits.includes("loyal") ||
    commonTraits.includes("affectionate")
  ) {
    personalityTheme = "You value loyalty and affection";
  } else if (
    commonTraits.includes("intelligent") ||
    commonTraits.includes("smart")
  ) {
    personalityTheme = "You appreciate intelligent, trainable dogs";
  }

  // Get top 5 most common traits
  const dominantTraits = Object.entries(traitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trait]) => trait);

  return {
    commonTraits,
    personalityTheme,
    traitFrequency: traitCounts,
    dominantTraits,
  };
}

export function calculateLifestyleCompatibility(
  dogs: DogWithProfiler[],
): LifestyleCompatibility | null {
  const dogsWithData = dogs.filter((d) => d.dog_profiler_data);
  if (dogsWithData.length === 0) return null;

  let apartmentScore = 0;
  let activeScore = 0;
  let firstTimeScore = 0;
  let workFromHomeScore = 0;
  const messages: string[] = [];

  dogsWithData.forEach((dog) => {
    const data = dog.dog_profiler_data!;

    // Apartment suitability
    if (data.home_type === "apartment_ok") apartmentScore += 100;
    else if (data.home_type === "house_preferred") apartmentScore += 50;
    if (data.energy_level === "low" || data.energy_level === "medium")
      apartmentScore += 20;
    if (data.yard_required === false) apartmentScore += 30;

    // Active family suitability
    if (data.energy_level === "high" || data.energy_level === "very_high")
      activeScore += 50;
    if (data.exercise_needs === "high") activeScore += 50;
    if (
      data.favorite_activities?.some(
        (a) => a.includes("hik") || a.includes("run"),
      )
    )
      activeScore += 20;

    // First-time owner suitability
    if (data.experience_level === "first_time_ok") firstTimeScore += 100;
    else if (data.experience_level === "some_experience") firstTimeScore += 30;
    if (data.trainability === "easy") firstTimeScore += 50;
    if (data.confidence === "confident") firstTimeScore += 20;

    // Work from home suitability
    if (data.sociability === "very_social" || data.sociability === "social")
      workFromHomeScore += 50;
    if (data.energy_level === "low" || data.energy_level === "medium")
      workFromHomeScore += 30;
    if (data.confidence === "confident") workFromHomeScore += 20;
  });

  // Normalize scores
  const count = dogsWithData.length;
  apartmentScore = Math.min(100, Math.round(apartmentScore / count));
  activeScore = Math.min(100, Math.round(activeScore / count));
  firstTimeScore = Math.min(100, Math.round(firstTimeScore / count));
  workFromHomeScore = Math.min(100, Math.round(workFromHomeScore / count));

  // Generate messages
  if (apartmentScore >= 70) messages.push("Great for apartment living");
  if (activeScore >= 70) messages.push("Perfect for active families");
  if (firstTimeScore >= 70) messages.push("Suitable for first-time owners");
  if (workFromHomeScore >= 70) messages.push("Ideal work-from-home companions");

  return {
    apartmentSuitability: apartmentScore,
    activeFamilySuitability: activeScore,
    firstTimeOwnerSuitability: firstTimeScore,
    workFromHomeSuitability: workFromHomeScore,
    messages,
  };
}

export function assessExperienceRequirements(
  dogs: DogWithProfiler[],
): ExperienceRequirements | null {
  const dogsWithData = dogs.filter(
    (d) => d.dog_profiler_data?.experience_level,
  );
  if (dogsWithData.length === 0) return null;

  const distribution: Record<string, number> = {
    first_time_ok: 0,
    some_experience: 0,
    experienced_only: 0,
  };

  dogsWithData.forEach((dog) => {
    const level = dog.dog_profiler_data!.experience_level!;
    distribution[level] = (distribution[level] || 0) + 1;
  });

  // Determine overall requirement
  let overallLevel: ExperienceRequirements["overallLevel"] =
    "beginner_friendly";
  let recommendation = "";

  const percentExperienced =
    distribution.experienced_only / dogsWithData.length;
  const percentSome = distribution.some_experience / dogsWithData.length;
  const percentFirstTime = distribution.first_time_ok / dogsWithData.length;

  if (percentExperienced > 0.5) {
    overallLevel = "experienced_only";
    recommendation =
      "These dogs need experienced handlers. Consider getting support from a trainer.";
  } else if (percentSome > 0.6) {
    overallLevel = "some_experience_needed";
    recommendation =
      "Some dog experience helpful. Great opportunity to grow your skills!";
  } else if (percentFirstTime > 0.5) {
    overallLevel = "beginner_friendly";
    recommendation =
      "Perfect for first-time dog owners! These dogs are forgiving and adaptable.";
  } else {
    overallLevel = "some_experience_needed";
    recommendation = "Good mix of experience levels - you can learn together!";
  }

  return {
    overallLevel,
    distribution,
    recommendation,
  };
}

export function discoverHiddenGems(dogs: DogWithProfiler[]): HiddenGems | null {
  const dogsWithData = dogs.filter((d) => d.dog_profiler_data);
  if (dogsWithData.length === 0) return null;

  const uniqueQuirks: Array<{ dogName: string; quirk: string }> = [];
  const activityCounts: Record<string, number> = {};
  const funFacts: string[] = [];
  const unexpectedCommonalities: string[] = [];

  dogsWithData.forEach((dog) => {
    const data = dog.dog_profiler_data!;

    // Collect unique quirks
    if (data.unique_quirk) {
      uniqueQuirks.push({
        dogName: dog.name,
        quirk: data.unique_quirk,
      });
    }

    // Count activities
    data.favorite_activities?.forEach((activity) => {
      const normalized = activity.toLowerCase().trim();
      activityCounts[normalized] = (activityCounts[normalized] || 0) + 1;
    });
  });

  // Find shared activities (appear in >50% of dogs)
  const threshold = Math.ceil(dogsWithData.length * 0.5);
  const sharedActivities = Object.entries(activityCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([activity]) => activity);

  // Generate fun facts
  if (uniqueQuirks.length > 0) {
    funFacts.push(`${uniqueQuirks[0].dogName} ${uniqueQuirks[0].quirk}`);
  }

  // Check for unexpected commonalities
  const allConfident = dogsWithData.every(
    (d) => d.dog_profiler_data?.confidence === "confident",
  );
  if (allConfident && dogsWithData.length >= 2) {
    unexpectedCommonalities.push("All your favorites are confident dogs");
  }

  const allSameEnergy = dogsWithData.every(
    (d) =>
      d.dog_profiler_data?.energy_level ===
      dogsWithData[0].dog_profiler_data?.energy_level,
  );
  if (allSameEnergy && dogsWithData.length >= 2) {
    unexpectedCommonalities.push(
      `All have ${dogsWithData[0].dog_profiler_data?.energy_level} energy`,
    );
  }

  return {
    uniqueQuirks: uniqueQuirks.slice(0, 3), // Top 3 quirks
    sharedActivities,
    unexpectedCommonalities,
    funFacts: funFacts.slice(0, 2),
  };
}

export function calculateCareComplexity(
  dogs: DogWithProfiler[],
): CareComplexity | null {
  const dogsWithData = dogs.filter((d) => d.dog_profiler_data);
  if (dogsWithData.length === 0) return null;

  let trainingScore = 0;
  let groomingScore = 0;
  let medicalScore = 0;
  let exerciseScore = 0;

  dogsWithData.forEach((dog) => {
    const data = dog.dog_profiler_data!;

    // Training complexity
    if (data.trainability === "easy") trainingScore += 1;
    else if (data.trainability === "moderate") trainingScore += 2;
    else if (data.trainability === "challenging") trainingScore += 3;

    // Grooming needs
    if (data.grooming_needs === "minimal") groomingScore += 1;
    else if (data.grooming_needs === "weekly") groomingScore += 2;
    else if (data.grooming_needs === "frequent") groomingScore += 3;

    // Medical needs
    if (data.medical_needs) medicalScore += 3;
    if (data.special_needs) medicalScore += 2;

    // Exercise needs
    if (data.exercise_needs === "minimal") exerciseScore += 1;
    else if (data.exercise_needs === "moderate") exerciseScore += 2;
    else if (data.exercise_needs === "high") exerciseScore += 3;
  });

  // Calculate averages
  const count = dogsWithData.length;
  const avgTraining = trainingScore / count;
  const avgGrooming = groomingScore / count;
  const avgMedical = medicalScore / count;
  const avgExercise = exerciseScore / count;

  // Calculate overall score
  const totalScore = avgTraining + avgGrooming + avgMedical + avgExercise;
  let overallScore: CareComplexity["overallScore"];
  let description: string;

  if (totalScore <= 5) {
    overallScore = "low";
    description = "Low maintenance - great for busy lifestyles";
  } else if (totalScore <= 8) {
    overallScore = "moderate";
    description = "Moderate care needs - manageable with routine";
  } else {
    overallScore = "high";
    description = "Higher care needs - requires dedicated time";
  }

  return {
    overallScore,
    factors: {
      training: avgTraining,
      grooming: avgGrooming,
      medical: avgMedical,
      exercise: avgExercise,
    },
    description,
  };
}

export function getEnhancedInsights(dogs: DogWithProfiler[]): EnhancedInsights {
  const personalityPattern = analyzePersonalityPatterns(dogs);
  const lifestyleCompatibility = calculateLifestyleCompatibility(dogs);
  const experienceRequirements = assessExperienceRequirements(dogs);
  const hiddenGems = discoverHiddenGems(dogs);
  const careComplexity = calculateCareComplexity(dogs);

  // Energy profile
  let energyProfile = null;
  const dogsWithEnergy = dogs.filter((d) => d.dog_profiler_data?.energy_level);
  if (dogsWithEnergy.length > 0) {
    const energyDist: Record<string, number> = {};
    let totalEnergy = 0;
    dogsWithEnergy.forEach((dog) => {
      const level = dog.dog_profiler_data!.energy_level!;
      energyDist[level] = (energyDist[level] || 0) + 1;
      if (level === "low") totalEnergy += 1;
      else if (level === "medium") totalEnergy += 2;
      else if (level === "high") totalEnergy += 3;
      else if (level === "very_high") totalEnergy += 4;
    });

    const avgEnergy = totalEnergy / dogsWithEnergy.length;
    let averageLevel = "medium";
    let recommendation = "";

    if (avgEnergy <= 1.5) {
      averageLevel = "low";
      recommendation = "Perfect for relaxed, quiet homes";
    } else if (avgEnergy <= 2.5) {
      averageLevel = "medium";
      recommendation = "Good balance of activity and calm";
    } else if (avgEnergy <= 3.5) {
      averageLevel = "high";
      recommendation = "Need active owners and regular exercise";
    } else {
      averageLevel = "very_high";
      recommendation = "Require very active lifestyle and lots of stimulation";
    }

    energyProfile = {
      averageLevel,
      distribution: energyDist,
      recommendation,
    };
  }

  // Compatibility matrix
  let compatibilityMatrix = null;
  const dogsWithCompat = dogs.filter((d) => d.dog_profiler_data);
  if (dogsWithCompat.length > 0) {
    const matrix = {
      withDogs: { yes: 0, no: 0, maybe: 0, unknown: 0 },
      withCats: { yes: 0, no: 0, maybe: 0, unknown: 0 },
      withChildren: { yes: 0, no: 0, maybe: 0, unknown: 0 },
    };

    dogsWithCompat.forEach((dog) => {
      const data = dog.dog_profiler_data!;
      const dogCompat = data.good_with_dogs || "unknown";
      const catCompat = data.good_with_cats || "unknown";
      const childCompat = data.good_with_children || "unknown";

      matrix.withDogs[dogCompat as keyof typeof matrix.withDogs]++;
      matrix.withCats[catCompat as keyof typeof matrix.withCats]++;
      matrix.withChildren[childCompat as keyof typeof matrix.withChildren]++;
    });

    compatibilityMatrix = matrix;
  }

  return {
    personalityPattern,
    lifestyleCompatibility,
    experienceRequirements,
    hiddenGems,
    careComplexity,
    energyProfile,
    compatibilityMatrix,
  };
}
