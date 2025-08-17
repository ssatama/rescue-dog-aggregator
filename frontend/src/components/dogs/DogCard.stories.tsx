import type { Meta, StoryObj } from "@storybook/nextjs";
import DogCard from "./DogCardOptimized";

const meta: Meta<typeof DogCard> = {
  title: "Components/Dogs/DogCard",
  component: DogCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockDog = {
  id: "stasha-123",
  name: "Stasha",
  slug: "stasha",
  breed: "Mixed Breed",
  breed_group: "Mixed Group",
  primary_image_url:
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop",
  age_months: 25, // 2 years, 1 month
  gender: "Female",
  size: "Medium",
  description:
    "Looking for a loving home. I am being rehomed through Daisy Family Rescue e.V. with the appropriate permit under §11 Animal Welfare Act.",
  status: "Available",
  organization: {
    id: "daisy-family-rescue",
    name: "Daisy Family Rescue e.V.",
    country: "DE",
    slug: "daisy-family-rescue",
  },
  ships_to: ["DE", "AT", "CH", "NL", "BE"],
  tags: ["Friendly", "Good with kids", "House trained"],
  location: "Germany",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const Default: Story = {
  args: {
    dog: mockDog,
  },
};

export const LongDescription: Story = {
  args: {
    dog: {
      ...mockDog,
      id: "luna-456",
      name: "Luna",
      slug: "luna",
      primary_image_url:
        "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=300&fit=crop",
      age_months: 36, // 3 years
      breed: "Border Collie Mix",
      size: "Large",
      description:
        "Luna is a beautiful and intelligent dog who loves to play fetch and go on long walks. She is great with children and other pets, making her the perfect addition to any family. Luna has been in our care for 3 months and is fully house-trained and up to date on all vaccinations.",
      tags: [
        "Intelligent",
        "Good with kids",
        "Good with other pets",
        "House trained",
        "Vaccinated",
      ],
    },
  },
};

export const SmallDog: Story = {
  args: {
    dog: {
      ...mockDog,
      id: "tiny-789",
      name: "Tiny",
      slug: "tiny",
      breed: "Chihuahua Mix",
      breed_group: "Toy Group",
      primary_image_url:
        "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop",
      age_months: 24, // 2 years
      size: "Small",
      gender: "Male",
      tags: ["Small", "Lap dog", "Gentle"],
      organization: {
        id: "small-paws-rescue",
        name: "Small Paws Rescue",
        country: "US",
        slug: "small-paws-rescue",
      },
    },
  },
};
