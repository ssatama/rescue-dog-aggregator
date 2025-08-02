import type { Meta, StoryObj } from "@storybook/nextjs";
import EmptyState from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NoDogs: Story = {
  args: {
    title: "No dogs found",
    description:
      "We couldn't find any dogs matching your search criteria. Try adjusting your filters or check back later.",
    actionText: "Clear Filters",
    onAction: () => {},
  },
};

export const NoOrganizations: Story = {
  args: {
    title: "No rescue organizations",
    description:
      "There are no rescue organizations in this area yet. We're always adding new partners.",
    actionText: "Browse All Organizations",
    onAction: () => {},
  },
};

export const NoFavorites: Story = {
  args: {
    title: "No favorites yet",
    description:
      "You haven't favorited any dogs yet. Start browsing to find your perfect companion.",
    actionText: "Browse Dogs",
    onAction: () => {},
  },
};

export const SearchResults: Story = {
  args: {
    title: 'No results for "Golden Retriever"',
    description:
      "We couldn't find any Golden Retrievers available for adoption right now. Try a different breed or check back later.",
    actionText: "Search All Dogs",
    onAction: () => {},
  },
};

export const WithoutAction: Story = {
  args: {
    title: "Coming Soon",
    description:
      "This feature is under development. Check back soon for updates.",
  },
};

export const ErrorState: Story = {
  args: {
    title: "Something went wrong",
    description:
      "We encountered an error while loading the dogs. Please try again.",
    actionText: "Try Again",
    onAction: () => {},
  },
};
