import React from "react";
import { render, screen } from "../../../test-utils";
import PersonalityTraits from "./PersonalityTraits";
import { DogProfilerData } from "../../../types/dogProfiler";

describe("PersonalityTraits Component", () => {
  const mockProfieDataWithHighConfidence: DogProfilerData = {
    personality_traits: ["lively", "energetic", "affectionate", "playful", "happy"],
    confidence_scores: {
      personality_traits: 0.8
    }
  };

  const mockProfileDataWithLowConfidence: DogProfilerData = {
    personality_traits: ["calm", "gentle"],
    confidence_scores: {
      personality_traits: 0.3
    }
  };

  const mockProfileDataWithNoTraits: DogProfilerData = {
    personality_traits: [],
    confidence_scores: {
      personality_traits: 0.9
    }
  };

  const mockProfileDataWithNoConfidence: DogProfilerData = {
    personality_traits: ["friendly", "loyal"],
    confidence_scores: {}
  };

  test("renders personality traits when confidence score > 0.5", () => {
    render(<PersonalityTraits profilerData={mockProfieDataWithHighConfidence} />);
    
    expect(screen.getByTestId("personality-traits")).toBeInTheDocument();
    expect(screen.getByText("Lively")).toBeInTheDocument();
    expect(screen.getByText("Energetic")).toBeInTheDocument();
    expect(screen.getByText("Affectionate")).toBeInTheDocument();
    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Happy")).toBeInTheDocument();
  });

  test("does not render when confidence score <= 0.5", () => {
    render(<PersonalityTraits profilerData={mockProfileDataWithLowConfidence} />);
    
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("does not render when no traits available", () => {
    render(<PersonalityTraits profilerData={mockProfileDataWithNoTraits} />);
    
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("does not render when confidence score is missing", () => {
    render(<PersonalityTraits profilerData={mockProfileDataWithNoConfidence} />);
    
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("displays max 5 traits only", () => {
    const dataWithManyTraits: DogProfilerData = {
      personality_traits: ["lively", "energetic", "affectionate", "playful", "happy", "calm", "gentle", "smart"],
      confidence_scores: {
        personality_traits: 0.9
      }
    };

    render(<PersonalityTraits profilerData={dataWithManyTraits} />);
    
    const traitElements = screen.getAllByTestId(/^trait-/);
    expect(traitElements).toHaveLength(5);
    
    // Should show first 5 traits
    expect(screen.getByText("Lively")).toBeInTheDocument();
    expect(screen.getByText("Energetic")).toBeInTheDocument();
    expect(screen.getByText("Affectionate")).toBeInTheDocument();
    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Happy")).toBeInTheDocument();
    
    // Should not show the 6th trait and beyond
    expect(screen.queryByText("Calm")).not.toBeInTheDocument();
    expect(screen.queryByText("Gentle")).not.toBeInTheDocument();
    expect(screen.queryByText("Smart")).not.toBeInTheDocument();
  });

  test("applies rotating pastel colors correctly", () => {
    render(<PersonalityTraits profilerData={mockProfieDataWithHighConfidence} />);
    
    const traits = screen.getAllByTestId(/^trait-/);
    
    // Test color rotation (blue, green, purple, yellow, pink)
    expect(traits[0]).toHaveClass("bg-blue-100", "text-blue-800");
    expect(traits[1]).toHaveClass("bg-green-100", "text-green-800");
    expect(traits[2]).toHaveClass("bg-purple-100", "text-purple-800");
    expect(traits[3]).toHaveClass("bg-yellow-100", "text-yellow-800");
    expect(traits[4]).toHaveClass("bg-pink-100", "text-pink-800");
  });

  test("applies proper badge styling", () => {
    render(<PersonalityTraits profilerData={mockProfieDataWithHighConfidence} />);
    
    const firstTrait = screen.getByTestId("trait-lively");
    expect(firstTrait).toHaveClass(
      "px-3",
      "py-1.5",
      "rounded-full",
      "text-sm",
      "font-medium"
    );
  });

  test("handles empty profiler data gracefully", () => {
    render(<PersonalityTraits profilerData={undefined} />);
    
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("handles null profiler data gracefully", () => {
    render(<PersonalityTraits profilerData={null} />);
    
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("capitalizes trait names", () => {
    const dataWithLowercaseTraits: DogProfilerData = {
      personality_traits: ["friendly", "energetic"],
      confidence_scores: {
        personality_traits: 0.8
      }
    };

    render(<PersonalityTraits profilerData={dataWithLowercaseTraits} />);
    
    expect(screen.getByText("Friendly")).toBeInTheDocument();
    expect(screen.getByText("Energetic")).toBeInTheDocument();
  });

  test("handles boundary confidence score (exactly 0.5)", () => {
    const dataWithBoundaryConfidence: DogProfilerData = {
      personality_traits: ["friendly"],
      confidence_scores: {
        personality_traits: 0.5
      }
    };

    render(<PersonalityTraits profilerData={dataWithBoundaryConfidence} />);
    
    // Should not render when confidence is exactly 0.5 (requirement is > 0.5)
    expect(screen.queryByTestId("personality-traits")).not.toBeInTheDocument();
  });

  test("renders with proper flex layout", () => {
    render(<PersonalityTraits profilerData={mockProfieDataWithHighConfidence} />);
    
    const container = screen.getByTestId("personality-traits");
    expect(container).toHaveClass("flex", "flex-wrap", "gap-2");
  });
});