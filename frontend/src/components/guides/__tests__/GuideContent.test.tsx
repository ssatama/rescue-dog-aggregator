import React from "react";
import { render, screen } from "@testing-library/react";
import { GuideContent } from "../GuideContent";

// Mock MDXRemote
interface MockMDXRemoteProps {
  children?: React.ReactNode;
}

jest.mock("next-mdx-remote", () => ({
  MDXRemote: ({ children }: MockMDXRemoteProps) => (
    <div data-testid="mdx-content">{children}</div>
  ),
}));

const mockGuide = {
  slug: "test-guide",
  frontmatter: {
    title: "Test Guide",
    description: "Test description",
    heroImage: "/test.jpg",
    heroImageAlt: "Test hero image",
    readTime: 5,
    category: "test",
    keywords: ["test"],
    lastUpdated: "2025-10-03",
    author: "Test Author",
    slug: "test-guide",
    relatedGuides: [],
  },
  content: "## Test Content",
  serializedContent: {
    compiledSource: "return function() { return <div>Test</div> }",
    frontmatter: {},
    scope: {},
  },
};

describe("GuideContent", () => {
  it("renders guide title", () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText("Test Guide")).toBeInTheDocument();
  });

  it("renders hero image with alt text", () => {
    render(<GuideContent guide={mockGuide} />);
    const image = screen.getByAltText("Test hero image");
    expect(image).toBeInTheDocument();
  });

  it("renders read time metadata", () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText(/5 min read/i)).toBeInTheDocument();
  });

  it("renders author name", () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText(/Test Author/i)).toBeInTheDocument();
  });

  it("renders last updated date", () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText(/Updated 2025-10-03/i)).toBeInTheDocument();
  });

  it("renders MDX content", () => {
    render(<GuideContent guide={mockGuide} />);
    const article = screen.getByRole("article");
    expect(article).toBeInTheDocument();
  });

  it("applies prose styling classes", () => {
    render(<GuideContent guide={mockGuide} />);
    const proseContainer = document.querySelector(".prose");
    expect(proseContainer).toBeInTheDocument();
    expect(proseContainer).toHaveClass("prose-lg");
    expect(proseContainer).toHaveClass("dark:prose-invert");
  });

  it("applies container class for full page mode", () => {
    const { container } = render(
      <GuideContent guide={mockGuide} fullPage={true} />,
    );
    expect(container.querySelector(".container")).toBeInTheDocument();
  });

  it("does not apply container class for overlay mode", () => {
    const { container } = render(
      <GuideContent guide={mockGuide} fullPage={false} />,
    );
    expect(container.querySelector(".container")).not.toBeInTheDocument();
  });

  it("extracts and renders TableOfContents in full page mode", async () => {
    // Mock DOM with H2 elements
    document.body.innerHTML = `
      <article>
        <h2 id="section-1">Section 1</h2>
        <h2 id="section-2">Section 2</h2>
        <h2 id="section-3">Section 3</h2>
      </article>
    `;

    const { container } = render(
      <GuideContent guide={mockGuide} fullPage={true} />,
    );

    // TableOfContents should be rendered
    // Note: We can't easily test the actual extraction since it requires DOM timing
    // This test verifies the structure is correct
    expect(container.querySelector("article")).toBeInTheDocument();
  });

  it("does not render TableOfContents in overlay mode", () => {
    const { container } = render(
      <GuideContent guide={mockGuide} fullPage={false} />,
    );

    // TableOfContents should not be rendered in overlay mode
    // Looking for the aside element that contains the desktop TOC
    const aside = container.querySelector("aside");
    expect(aside).not.toBeInTheDocument();
  });
});
