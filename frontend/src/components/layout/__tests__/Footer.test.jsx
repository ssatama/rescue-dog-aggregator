import React from "react";
import { render, screen } from "../../../test-utils";
import Footer from "../Footer";
import "@testing-library/jest-dom";

describe("<Footer />", () => {
  beforeEach(() => {
    render(<Footer />);
  });

  it("links the brand back to “/”", () => {
    const brandLink = screen.getByRole("link", {
      name: /Rescue Dog Aggregator/i,
    });
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders a mailto “Contact” link", () => {
    const contact = screen.getByRole("link", { name: /Contact/i });
    expect(contact).toHaveAttribute("href", "mailto:rescuedogsme@gmail.com");
  });

  it("does not render a Privacy Policy link", () => {
    // queryByRole returns null if not found
    const privacy = screen.queryByRole("link", { name: /Privacy Policy/i });
    expect(privacy).toBeNull();
  });
});
