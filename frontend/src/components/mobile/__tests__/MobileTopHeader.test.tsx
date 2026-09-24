import React from "react";
import { render, screen } from "@testing-library/react";
import MobileTopHeader from "../MobileTopHeader";

describe("MobileTopHeader", () => {
  it("renders the mobile home's H1", () => {
    render(<MobileTopHeader />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your gateway to European rescue dogs",
      }),
    ).toBeInTheDocument();
  });

  it("leaves the brand to the site header", () => {
    render(<MobileTopHeader />);

    expect(screen.queryByText("rescuedogs")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("is hidden from sm up", () => {
    const { container } = render(<MobileTopHeader />);

    expect(container.firstChild).toHaveClass("sm:hidden");
  });

  it("has dark mode text", () => {
    render(<MobileTopHeader />);

    expect(screen.getByRole("heading", { level: 1 }).className).toMatch(
      /dark:text-gray-400/,
    );
  });
});
