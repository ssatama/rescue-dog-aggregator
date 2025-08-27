import {
  formatExperienceLevel,
  formatEnergyLevel,
  formatTrainability,
  formatHomeType,
  formatCompatibility,
  formatSociability,
  formatConfidence,
  formatExerciseNeeds,
  formatGroomingNeeds,
  formatBoolean,
  formatProfilerField,
} from "../dogProfilerFormatters";

describe("dogProfilerFormatters", () => {
  describe("formatExperienceLevel", () => {
    it("formats experience levels correctly", () => {
      expect(formatExperienceLevel("first_time_ok")).toBe("First-time owners");
      expect(formatExperienceLevel("some_experience")).toBe("Some Experience");
      expect(formatExperienceLevel("experienced_only")).toBe(
        "Experienced owners",
      );
      expect(formatExperienceLevel("very_experienced")).toBe("Expert owners");
      expect(formatExperienceLevel(null)).toBeNull();
      expect(formatExperienceLevel(undefined)).toBeNull();
    });
  });

  describe("formatEnergyLevel", () => {
    it("formats energy levels correctly", () => {
      expect(formatEnergyLevel("low")).toBe("Low");
      expect(formatEnergyLevel("medium")).toBe("Medium");
      expect(formatEnergyLevel("high")).toBe("High");
      expect(formatEnergyLevel("very_high")).toBe("Very High");
      expect(formatEnergyLevel(null)).toBeNull();
      expect(formatEnergyLevel(undefined)).toBeNull();
    });
  });

  describe("formatTrainability", () => {
    it("formats trainability levels correctly", () => {
      expect(formatTrainability("easy")).toBe("Easy");
      expect(formatTrainability("moderate")).toBe("Moderate");
      expect(formatTrainability("challenging")).toBe("Challenging");
      expect(formatTrainability(null)).toBeNull();
      expect(formatTrainability(undefined)).toBeNull();
    });
  });

  describe("formatHomeType", () => {
    it("formats home types correctly", () => {
      expect(formatHomeType("apartment_ok")).toBe("Apartment OK");
      expect(formatHomeType("house_preferred")).toBe("House Preferred");
      expect(formatHomeType("house_required")).toBe("House Required");
      expect(formatHomeType(null)).toBeNull();
      expect(formatHomeType(undefined)).toBeNull();
    });
  });

  describe("formatCompatibility", () => {
    it("formats compatibility values correctly", () => {
      expect(formatCompatibility("yes")).toBe("Yes");
      expect(formatCompatibility("no")).toBe("No");
      expect(formatCompatibility("maybe")).toBe("Maybe");
      expect(formatCompatibility("unknown")).toBe("Unknown");
      expect(formatCompatibility(null)).toBeNull();
      expect(formatCompatibility(undefined)).toBeNull();
    });
  });

  describe("formatSociability", () => {
    it("formats sociability levels correctly", () => {
      expect(formatSociability("reserved")).toBe("Reserved");
      expect(formatSociability("moderate")).toBe("Moderate");
      expect(formatSociability("social")).toBe("Social");
      expect(formatSociability("very_social")).toBe("Very Social");
      expect(formatSociability(null)).toBeNull();
      expect(formatSociability(undefined)).toBeNull();
    });
  });

  describe("formatConfidence", () => {
    it("formats confidence levels correctly", () => {
      expect(formatConfidence("shy")).toBe("Shy");
      expect(formatConfidence("moderate")).toBe("Moderate");
      expect(formatConfidence("confident")).toBe("Confident");
      expect(formatConfidence(null)).toBeNull();
      expect(formatConfidence(undefined)).toBeNull();
    });
  });

  describe("formatExerciseNeeds", () => {
    it("formats exercise needs correctly", () => {
      expect(formatExerciseNeeds("minimal")).toBe("Minimal");
      expect(formatExerciseNeeds("moderate")).toBe("Moderate");
      expect(formatExerciseNeeds("high")).toBe("High");
      expect(formatExerciseNeeds(null)).toBeNull();
      expect(formatExerciseNeeds(undefined)).toBeNull();
    });
  });

  describe("formatGroomingNeeds", () => {
    it("formats grooming needs correctly", () => {
      expect(formatGroomingNeeds("minimal")).toBe("Minimal");
      expect(formatGroomingNeeds("weekly")).toBe("Weekly");
      expect(formatGroomingNeeds("frequent")).toBe("Frequent");
      expect(formatGroomingNeeds("daily")).toBe("Daily");
      expect(formatGroomingNeeds(null)).toBeNull();
      expect(formatGroomingNeeds(undefined)).toBeNull();
    });
  });

  describe("formatBoolean", () => {
    it("formats boolean values correctly", () => {
      expect(formatBoolean(true)).toBe("Yes");
      expect(formatBoolean(false)).toBe("No");
      expect(formatBoolean(null)).toBeNull();
      expect(formatBoolean(undefined)).toBeNull();
    });
  });

  describe("formatProfilerField", () => {
    it("formats generic profiler fields correctly", () => {
      expect(formatProfilerField("some_field_name")).toBe("Some Field Name");
      expect(formatProfilerField("house_trained")).toBe("House Trained");
      expect(formatProfilerField("UPPER_CASE")).toBe("Upper Case");
      expect(formatProfilerField(null)).toBeNull();
      expect(formatProfilerField(undefined)).toBeNull();
    });
  });
});
