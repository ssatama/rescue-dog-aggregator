import { render, screen } from "@testing-library/react";
import GuidesPage from "../page";

// Mock the layout components
jest.mock("@/components/layout/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

jest.mock("@/components/layout/Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="footer">Footer</div>,
}));

// Mock the guides utilities
jest.mock("@/lib/guides", () => ({
  getAllGuides: jest.fn(() => [
    {
      slug: "test-guide-1",
      frontmatter: {
        title: "Test Guide 1",
        description: "Description 1",
        readTime: 5,
        category: "test",
        heroImage: "/test.jpg",
        keywords: ["test"],
        lastUpdated: "2025-10-03",
        author: "Test",
        slug: "test-guide-1",
        relatedGuides: [],
      },
      content: "",
    },
    {
      slug: "test-guide-2",
      frontmatter: {
        title: "Test Guide 2",
        description: "Description 2",
        readTime: 10,
        category: "test",
        heroImage: "/test2.jpg",
        keywords: ["test"],
        lastUpdated: "2025-10-03",
        author: "Test",
        slug: "test-guide-2",
        relatedGuides: [],
      },
      content: "",
    },
  ]),
}));

describe("GuidesPage", () => {
  it("renders guides listing page title", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText("Adoption Guides")).toBeInTheDocument();
  });

  it("renders header and footer", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders breadcrumbs", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Guides")).toBeInTheDocument();
  });

  it("renders all guide cards", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText("Test Guide 1")).toBeInTheDocument();
    expect(screen.getByText("Test Guide 2")).toBeInTheDocument();
  });

  it("displays guide categories", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getAllByText("test")).toHaveLength(2);
  });

  it("displays read time for guides", async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText(/5 min/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });
});
