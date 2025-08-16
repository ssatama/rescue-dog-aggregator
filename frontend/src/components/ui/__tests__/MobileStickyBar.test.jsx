import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import MobileStickyBar from "../MobileStickyBar";

const mockDog = {
  id: 1,
  name: "Test Dog",
  breed: "Test Breed",
  primary_image_url: "https://example.com/image.jpg",
  organization: "Test Organization",
  status: "available",
  adoption_url: "https://example.com/adopt",
};

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, "open", {
  writable: true,
  value: mockWindowOpen,
});

describe("MobileStickyBar", () => {
  beforeEach(() => {
    mockWindowOpen.mockClear();
  });

  test("renders mobile sticky bar", () => {
    render(<MobileStickyBar dog={mockDog} />);

    const stickyBar = screen.getByTestId("mobile-sticky-bar");
    expect(stickyBar).toBeInTheDocument();
    expect(stickyBar).toHaveClass("md:hidden"); // Only visible on mobile

    const contactButton = screen.getByTestId("mobile-contact-button");
    expect(contactButton).toBeInTheDocument();
    expect(contactButton).toHaveTextContent("Start Adoption Process");
  });

  test("handles contact button click", () => {
    render(<MobileStickyBar dog={mockDog} />);

    const contactButton = screen.getByTestId("mobile-contact-button");
    contactButton.click();

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://example.com/adopt",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("contact button has proper accessibility attributes", () => {
    render(<MobileStickyBar dog={mockDog} />);

    const contactButton = screen.getByTestId("mobile-contact-button");
    expect(contactButton).toHaveAttribute(
      "aria-label",
      "Start adoption process",
    );
  });

  test("can be hidden with isVisible prop", () => {
    render(<MobileStickyBar dog={mockDog} isVisible={false} />);

    const stickyBar = screen.queryByTestId("mobile-sticky-bar");
    expect(stickyBar).not.toBeInTheDocument();
  });

  test("applies custom className", () => {
    render(<MobileStickyBar dog={mockDog} className="custom-class" />);

    const stickyBar = screen.getByTestId("mobile-sticky-bar");
    expect(stickyBar).toHaveClass("custom-class");
  });
});
