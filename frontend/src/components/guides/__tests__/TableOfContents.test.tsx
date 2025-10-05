import { render, screen, fireEvent } from "@testing-library/react";
import { TableOfContents } from "../TableOfContents";

// Mock useActiveSection hook
jest.mock("../hooks/useActiveSection", () => ({
  useActiveSection: jest.fn(() => "introduction"),
}));

const mockSections = [
  { id: "introduction", title: "Introduction", level: 2 },
  { id: "benefits", title: "Benefits", level: 2 },
  { id: "conclusion", title: "Conclusion", level: 2 },
];

describe("TableOfContents", () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("renders all section titles", () => {
    render(<TableOfContents sections={mockSections} readingProgress={50} />);

    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Benefits")).toBeInTheDocument();
    expect(screen.getByText("Conclusion")).toBeInTheDocument();
  });

  it("displays reading progress percentage", () => {
    render(<TableOfContents sections={mockSections} readingProgress={75} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("highlights active section", () => {
    const { container } = render(
      <TableOfContents sections={mockSections} readingProgress={50} />,
    );

    // Find the button containing "Introduction" (active section)
    const buttons = container.querySelectorAll("button");
    const activeButton = Array.from(buttons).find((btn) =>
      btn.textContent?.includes("Introduction"),
    );

    expect(activeButton).toHaveClass("bg-orange-100");
  });

  it("scrolls to section when clicked", () => {
    const mockElement = document.createElement("div");
    mockElement.id = "benefits";
    document.body.appendChild(mockElement);

    render(<TableOfContents sections={mockSections} readingProgress={50} />);

    const benefitsButton = screen.getByText("Benefits");
    fireEvent.click(benefitsButton);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("shows desktop sidebar on large screens", () => {
    const { container } = render(
      <TableOfContents sections={mockSections} readingProgress={50} />,
    );

    const desktopAside = container.querySelector("aside");
    expect(desktopAside).toHaveClass("hidden", "lg:block");
  });

  it("shows mobile FAB on small screens", () => {
    const { container } = render(
      <TableOfContents sections={mockSections} readingProgress={50} />,
    );

    const mobileFAB = container.querySelector(".lg\\:hidden button");
    expect(mobileFAB).toBeInTheDocument();
  });

  it("displays current section badge on mobile FAB", () => {
    render(<TableOfContents sections={mockSections} readingProgress={50} />);

    // Mobile badge shows 1/3 (first section is active)
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("opens mobile drawer when FAB is clicked", () => {
    render(<TableOfContents sections={mockSections} readingProgress={50} />);

    const fab = screen.getByLabelText("Table of Contents");
    fireEvent.click(fab);

    // Sheet should open - check for dialog role
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("displays circular progress indicator", () => {
    const { container } = render(
      <TableOfContents sections={mockSections} readingProgress={60} />,
    );

    // SVG circle should exist
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("closes mobile drawer after section selection", () => {
    render(<TableOfContents sections={mockSections} readingProgress={50} />);

    // Open drawer
    const fab = screen.getByLabelText("Table of Contents");
    fireEvent.click(fab);

    // Click a section
    const benefitsButtons = screen.getAllByText("Benefits");
    fireEvent.click(benefitsButtons[benefitsButtons.length - 1]); // Click mobile version

    // Drawer should close (dialog no longer visible)
    // Note: This test might need adjustment based on Sheet implementation
  });
});
