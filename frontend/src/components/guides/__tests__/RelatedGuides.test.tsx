import { render, screen } from "@testing-library/react";
import { RelatedGuides } from "../RelatedGuides";

const mockGuides = [
  {
    slug: "european-rescue-guide",
    frontmatter: {
      title: "European Rescue Guide",
      description: "Guide to European rescue dogs",
      heroImage: "/hero1.jpg",
      heroImageAlt: "Hero 1",
      readTime: 10,
      category: "adoption",
      keywords: ["rescue"],
      lastUpdated: "2025-10-03",
      author: "Test Author",
      slug: "european-rescue-guide",
      relatedGuides: [],
    },
    content: "",
    serializedContent: undefined,
  },
  {
    slug: "first-time-owner-guide",
    frontmatter: {
      title: "First Time Owner Guide",
      description: "Guide for first-time dog owners",
      heroImage: "/hero2.jpg",
      heroImageAlt: "Hero 2",
      readTime: 8,
      category: "adoption",
      keywords: ["owner"],
      lastUpdated: "2025-10-03",
      author: "Test Author",
      slug: "first-time-owner-guide",
      relatedGuides: [],
    },
    content: "",
    serializedContent: undefined,
  },
];

describe("RelatedGuides", () => {
  it("renders related guides when provided", () => {
    const { container } = render(<RelatedGuides relatedGuides={mockGuides} />);

    expect(screen.getByText("Related Guides")).toBeInTheDocument();
    expect(screen.getByText("European Rescue Guide")).toBeInTheDocument();
    expect(screen.getByText("First Time Owner Guide")).toBeInTheDocument();
  });

  it("returns null when no related guides provided", () => {
    const { container } = render(<RelatedGuides relatedGuides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only provided guides", () => {
    const { container } = render(
      <RelatedGuides relatedGuides={[mockGuides[0]]} />,
    );

    expect(screen.getByText("European Rescue Guide")).toBeInTheDocument();
    expect(
      screen.queryByText("First Time Owner Guide"),
    ).not.toBeInTheDocument();
  });

  it("renders guides in a grid layout", () => {
    const { container } = render(<RelatedGuides relatedGuides={mockGuides} />);

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-2");
  });

  it("applies proper styling to footer section", () => {
    const { container } = render(
      <RelatedGuides relatedGuides={[mockGuides[0]]} />,
    );

    const footer = container.querySelector("footer");
    expect(footer).toHaveClass("mt-12", "pt-8", "border-t");
  });
});
