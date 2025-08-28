import type { Meta, StoryObj } from "@storybook/nextjs";
import CompatibilityIcons from "./CompatibilityIcons";
import { DogProfilerData } from "../../../types/dogProfiler";

const meta: Meta<typeof CompatibilityIcons> = {
  title: "Dogs/Detail/CompatibilityIcons",
  component: CompatibilityIcons,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Example with all positive compatibility
export const AllPositive: Story = {
  args: {
    profilerData: {
      good_with_dogs: "yes",
      good_with_cats: "yes",
      good_with_children: "yes",
      confidence_scores: {
        good_with_dogs: 0.9,
        good_with_cats: 0.8,
        good_with_children: 0.85,
      },
    } as DogProfilerData,
  },
};

// Example with mixed compatibility
export const Mixed: Story = {
  args: {
    profilerData: {
      good_with_dogs: "yes",
      good_with_cats: "no",
      good_with_children: "maybe",
      confidence_scores: {
        good_with_dogs: 0.9,
        good_with_cats: 0.95,
        good_with_children: 0.7,
      },
    } as DogProfilerData,
  },
};

// Example with special cases
export const SpecialCases: Story = {
  args: {
    profilerData: {
      good_with_dogs: "selective",
      good_with_cats: "with_training",
      good_with_children: "older_children",
      confidence_scores: {
        good_with_dogs: 0.8,
        good_with_cats: 0.75,
        good_with_children: 0.9,
      },
    } as DogProfilerData,
  },
};

// Example with unknown compatibility
export const Unknown: Story = {
  args: {
    profilerData: {
      good_with_dogs: "unknown",
      good_with_cats: "unknown",
      good_with_children: "unknown",
      confidence_scores: {
        good_with_dogs: 0.8,
        good_with_cats: 0.7,
        good_with_children: 0.9,
      },
    } as DogProfilerData,
  },
};

// Example with low confidence (nothing shows)
export const LowConfidence: Story = {
  args: {
    profilerData: {
      good_with_dogs: "yes",
      good_with_cats: "no",
      good_with_children: "maybe",
      confidence_scores: {
        good_with_dogs: 0.3,
        good_with_cats: 0.4,
        good_with_children: 0.2,
      },
    } as DogProfilerData,
  },
};

// Example with partial data (only some icons show)
export const PartialData: Story = {
  args: {
    profilerData: {
      good_with_dogs: "yes",
      good_with_cats: "no",
      good_with_children: "maybe",
      confidence_scores: {
        good_with_dogs: 0.9, // show
        good_with_cats: 0.3, // hide
        good_with_children: 0.8, // show
      },
    } as DogProfilerData,
  },
};

// Example with empty data
export const EmptyData: Story = {
  args: {
    profilerData: undefined,
  },
};
