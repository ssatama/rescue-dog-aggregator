import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { GuideContent } from "../GuideContent";

jest.mock("../hooks/useActiveSection", () => ({ useActiveSection: () => "" }));

const frontmatter = {
  title: "Test Guide",
  description: "Test description",
  heroImage: "/test.jpg",
  heroImageAlt: "Test hero image",
  readTime: 5,
  category: "owner-preparation",
  keywords: ["test"],
  lastUpdated: "2025-10-03",
  author: "Test Author",
  slug: "test-guide",
  relatedGuides: [],
};
const mockGuide = { slug: "test-guide", frontmatter };

describe("GuideContent (#503)", () => {
  it("renders exactly one h1, from the frontmatter title", () => {
    const { container } = render(<GuideContent guide={mockGuide} />);

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Test Guide");
  });

  it("names the category in words, never its slug", () => {
    render(<GuideContent guide={mockGuide} />);

    expect(screen.getByText("First-time owners")).toBeInTheDocument();
    expect(screen.queryByText(/owner-preparation/i)).not.toBeInTheDocument();
  });

  it("gives read time, a readable date and the author", () => {
    render(<GuideContent guide={mockGuide} />);

    expect(screen.getByText(/5 min read/)).toHaveTextContent("5 min read · Updated 3 Oct 2025 · Test Author");
  });

  it("shows real dogs instead of a stock photo, and links into the matching catalog view", () => {
    render(
      <GuideContent
        guide={{
          ...mockGuide,
          frontmatter: { ...frontmatter, dogs: { label: "See dogs that suit first-time owners", href: "/dogs?first_time_friendly=true" } },
          dogs: [{ id: 1, name: "Rex", slug: "rex-1", image: "https://images.rescuedogs.me/rex.jpg" }],
        }}
      />,
    );

    expect(screen.queryByAltText("Test hero image")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rex" })).toHaveAttribute("href", "/dogs/rex-1");
    const links = screen.getAllByRole("link", { name: /See dogs that suit first-time owners/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dogs?first_time_friendly=true",
      "/dogs?first_time_friendly=true",
    ]);
  });

  it("leaves the dogs and link out when the guide has none", () => {
    render(<GuideContent guide={mockGuide} />);

    expect(screen.queryByRole("list", { name: /dogs listed now/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to look?")).not.toBeInTheDocument();
  });

  it("does not emit JSON-LD (the route owns page-level schema)", () => {
    const { container } = render(<GuideContent guide={mockGuide} />);

    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("renders the body it is given and lists its sections from the rendered headings", async () => {
    render(
      <GuideContent guide={mockGuide}>
        <h2 id="first-section">First Section</h2>
        <p>Body prose</p>
        <h2 id="second-section">Second Section</h2>
      </GuideContent>,
    );

    expect(screen.getByText("Body prose")).toBeInTheDocument();
    // Ids come from rehype-slug on the server; the contents link to them as they are
    await waitFor(() => expect(screen.getAllByRole("navigation", { name: "Contents" })).toHaveLength(2));
    const hrefs = screen
      .getAllByRole("link", { name: "Second Section" })
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["#second-section", "#second-section"]);
  });
});
