// src/components/dogs/__tests__/DogDescription.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for DogDescription dark mode functionality

import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import DogDescription from "../DogDescription";

// Mock the security utils
jest.mock("../../../utils/security", () => ({
  sanitizeText: jest.fn((text) => text),
  sanitizeHtml: jest.fn((html) => {
    return html.replace(/<script[^>]*>.*?<\/script>/gi, "");
  }),
}));

describe("DogDescription Dark Mode", () => {
  const mockProps = {
    dogName: "Buddy",
    organizationName: "Happy Paws Rescue",
    className: "test-class",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Main Content Dark Mode", () => {
    test("description container has dark mode text colors", () => {
      const description = "This is a lovely dog looking for a home.";
      render(<DogDescription {...mockProps} description={description} />);

      const container = screen.getByTestId("description-container");
      expect(container).toHaveClass("text-gray-700");
      expect(container).toHaveClass("dark:text-gray-300");
    });

    test("description content has dark mode text styling", () => {
      const description = "This is a lovely dog looking for a home.";
      render(<DogDescription {...mockProps} description={description} />);

      const descriptionContent = screen.getByTestId("description-content");
      expect(descriptionContent).toHaveClass("text-gray-700");
      expect(descriptionContent).toHaveClass("dark:text-gray-300");
    });

    test("fallback description has dark mode styling", () => {
      render(<DogDescription {...mockProps} description="" />);

      const fallbackDescription = screen.getByTestId("fallback-description");
      expect(fallbackDescription).toHaveClass("text-gray-700");
      expect(fallbackDescription).toHaveClass("dark:text-gray-300");
    });

    test("enhanced description has dark mode styling for short descriptions", () => {
      const shortDescription = "Sweet dog!";
      render(<DogDescription {...mockProps} description={shortDescription} />);

      const enhancedDescription = screen.getByTestId("enhanced-description");
      expect(enhancedDescription).toHaveClass("text-gray-600");
      expect(enhancedDescription).toHaveClass("dark:text-gray-400");
    });
  });

  describe("Read More Button Dark Mode", () => {
    test("read more button has dark mode styling", () => {
      const longDescription =
        "This is a very long description that should trigger the read more functionality. ".repeat(
          10,
        );
      render(<DogDescription {...mockProps} description={longDescription} />);

      const readMoreButton = screen.getByTestId("read-more-button");
      expect(readMoreButton).toHaveClass("text-orange-600");
      expect(readMoreButton).toHaveClass("dark:text-orange-400");
      expect(readMoreButton).toHaveClass("hover:text-orange-800");
      expect(readMoreButton).toHaveClass("dark:hover:text-orange-300");
      expect(readMoreButton).toHaveClass("hover:bg-orange-50");
      expect(readMoreButton).toHaveClass("dark:hover:bg-orange-900/20");
      expect(readMoreButton).toHaveClass("focus:ring-orange-500");
      expect(readMoreButton).toHaveClass("dark:focus:ring-orange-400");
    });

    test("read more button maintains orange theme on expand/collapse", () => {
      const longDescription =
        "This is a very long description that should trigger the read more functionality. ".repeat(
          10,
        );
      render(<DogDescription {...mockProps} description={longDescription} />);

      const readMoreButton = screen.getByTestId("read-more-button");

      // Click to expand
      fireEvent.click(readMoreButton);

      // Still should have dark mode classes after expansion
      expect(readMoreButton).toHaveClass("text-orange-600");
      expect(readMoreButton).toHaveClass("dark:text-orange-400");
      expect(readMoreButton).toHaveClass("hover:text-orange-800");
      expect(readMoreButton).toHaveClass("dark:hover:text-orange-300");
    });
  });

  describe("Prose Container Dark Mode", () => {
    test("prose container maintains readable styling in dark mode", () => {
      const description = "This is a test description with good readability.";
      render(<DogDescription {...mockProps} description={description} />);

      const proseContainer = screen.getByTestId("prose-container");
      expect(proseContainer).toHaveClass("prose");
      expect(proseContainer).toHaveClass("dark:prose-invert");
    });
  });

  describe("Focus and Accessibility in Dark Mode", () => {
    test("read more button has proper focus styling for dark mode", () => {
      const longDescription =
        "This is a very long description that should trigger the read more functionality. ".repeat(
          10,
        );
      render(<DogDescription {...mockProps} description={longDescription} />);

      const readMoreButton = screen.getByTestId("read-more-button");
      expect(readMoreButton).toHaveClass("focus:ring-2");
      expect(readMoreButton).toHaveClass("focus:ring-orange-500");
      expect(readMoreButton).toHaveClass("dark:focus:ring-orange-400");
      expect(readMoreButton).toHaveClass("focus:ring-opacity-50");
    });

    test("enhanced description maintains proper contrast in dark mode", () => {
      const shortDescription = "Sweet dog!";
      render(<DogDescription {...mockProps} description={shortDescription} />);

      const enhancedDescription = screen.getByTestId("enhanced-description");
      // Gray-600 in light mode, gray-400 in dark mode for proper contrast
      expect(enhancedDescription).toHaveClass("text-gray-600");
      expect(enhancedDescription).toHaveClass("dark:text-gray-400");
    });
  });
});
