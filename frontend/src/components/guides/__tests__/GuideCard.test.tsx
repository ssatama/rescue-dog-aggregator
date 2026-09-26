import { render, screen } from "@testing-library/react";
import { GuideCard } from "../GuideCard";
import type { Guide } from "@/types/guide";

const mockGuide: Guide = {
  slug: "test-guide",
  frontmatter: {
    title: "Test Guide Title",
    slug: "test-guide",
    description: "This is a test guide description",
    heroImage: "/test-hero.jpg",
    heroImageAlt: "Test hero image",
    readTime: 10,
    category: "financial-planning",
    keywords: ["test", "guide"],
    lastUpdated: "2025-10-03",
    author: "Test Author",
    relatedGuides: [],
  },
  content: "",
};

describe("GuideCard (#503)", () => {
  it("is one link to the guide, named by its title", () => {
    render(<GuideCard guide={mockGuide} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/guides/test-guide");
    expect(screen.getByRole("link")).toHaveTextContent("Test Guide Title");
  });

  it("names the category in words, never the slug", () => {
    render(<GuideCard guide={mockGuide} />);

    expect(screen.getByText("Costs")).toBeInTheDocument();
    expect(screen.queryByText(/financial-planning/i)).not.toBeInTheDocument();
  });

  it("gives read time and a readable date", () => {
    render(<GuideCard guide={mockGuide} />);

    expect(screen.getByText(/10 min read/)).toHaveTextContent("10 min read · Updated 3 Oct 2025");
  });

  it("shows real dogs, not the stock hero image", () => {
    render(
      <GuideCard guide={{ ...mockGuide, dogs: [{ id: 1, name: "Rex", slug: "rex-1", image: "https://images.rescuedogs.me/rex.jpg" }] }} />,
    );

    expect(screen.getByAltText("Rex")).toBeInTheDocument();
    expect(screen.queryByAltText("Test hero image")).not.toBeInTheDocument();
    // The card is one link; its photos are not links of their own
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
