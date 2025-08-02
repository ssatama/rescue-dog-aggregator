import type { Meta, StoryObj } from "@storybook/nextjs";
import Loading from "./Loading";

const meta: Meta<typeof Loading> = {
  title: "UI/Loading",
  component: Loading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithText: Story = {
  args: {
    text: "Loading rescue dogs...",
  },
};

export const LoadingDogs: Story = {
  args: {
    text: "Finding dogs in need of homes...",
  },
};

export const LoadingOrganizations: Story = {
  args: {
    text: "Loading rescue organizations...",
  },
};

export const SearchingDogs: Story = {
  args: {
    text: "Searching for your perfect companion...",
  },
};

export const SavingFavorites: Story = {
  args: {
    text: "Saving to favorites...",
  },
};
