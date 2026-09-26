import { render, screen } from "@testing-library/react";
import { TableOfContents, InlineContents } from "../TableOfContents";

jest.mock("../hooks/useActiveSection", () => ({
  useActiveSection: jest.fn(() => "benefits"),
}));

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "benefits", title: "Benefits" },
];

describe("TableOfContents (#503)", () => {
  it("links each section and marks the one being read", () => {
    render(<TableOfContents sections={sections} />);

    expect(screen.getByRole("link", { name: "Introduction" })).toHaveAttribute("href", "#introduction");
    expect(screen.getByRole("link", { name: "Benefits" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Introduction" })).not.toHaveAttribute("aria-current");
  });

  it("is a sidebar from 1024px only", () => {
    const { container } = render(<TableOfContents sections={sections} />);

    expect(container.querySelector("aside")).toHaveClass("hidden", "lg:block");
  });
});

describe("InlineContents (#503)", () => {
  it("is a collapsed list below 1024px, with no floating button", () => {
    const { container } = render(<InlineContents sections={sections} />);

    const details = container.querySelector("details");
    expect(details).toHaveClass("lg:hidden");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText("2 sections")).toBeInTheDocument();
    expect(container.querySelector(".fixed")).toBeNull();
  });
});
