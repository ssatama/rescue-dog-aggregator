import React from "react";
import { render, screen } from "../../../test-utils";
import HeroDogPreviewCard from "../HeroDogPreviewCard";

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/image", () => {
  return function MockImage({ src, alt, priority, ...props }) {
    return (
      <img
        src={src}
        alt={alt}
        data-priority={priority ? "true" : "false"}
        {...props}
      />
    );
  };
});

describe("HeroDogPreviewCard", () => {
  const mockDog = {
    id: 123,
    name: "Bella",
    slug: "bella-123",
    primary_image_url: "https://images.example.com/bella.jpg",
    blur_data_url: "data:image/jpeg;base64,abc123",
  };

  describe("Rendering", () => {
    test("should render dog name", () => {
      render(<HeroDogPreviewCard dog={mockDog} />);

      expect(screen.getByText("Bella")).toBeInTheDocument();
    });

    test("should render dog image with correct alt text", () => {
      render(<HeroDogPreviewCard dog={mockDog} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Bella - rescue dog available for adoption");
    });

    test("should apply polaroid styling with rotation", () => {
      const { container } = render(<HeroDogPreviewCard dog={mockDog} index={0} />);

      const link = screen.getByRole("link");
      expect(link).toHaveStyle({ transform: "rotate(-3deg)" });
    });

    test("should link to dog detail page using slug", () => {
      render(<HeroDogPreviewCard dog={mockDog} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/dogs/bella-123");
    });
  });

  describe("Image handling", () => {
    test("should pass priority prop to image when true", () => {
      render(<HeroDogPreviewCard dog={mockDog} priority={true} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("data-priority", "true");
    });

    test("should not set priority when false", () => {
      render(<HeroDogPreviewCard dog={mockDog} priority={false} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("data-priority", "false");
    });
  });

  describe("Edge cases", () => {
    test("should fallback to id-based slug if slug missing", () => {
      const dogWithoutSlug = {
        ...mockDog,
        slug: undefined,
      };

      render(<HeroDogPreviewCard dog={dogWithoutSlug} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/dogs/dog-123");
    });

    test("should handle missing image gracefully", () => {
      const dogWithoutImage = {
        ...mockDog,
        primary_image_url: null,
      };

      render(<HeroDogPreviewCard dog={dogWithoutImage} />);

      expect(screen.getByText("Bella")).toBeInTheDocument();
    });

    test("should truncate long names visually", () => {
      const dogWithLongName = {
        ...mockDog,
        name: "Sir Bartholomew Fluffington III",
      };

      render(<HeroDogPreviewCard dog={dogWithLongName} />);

      const nameElement = screen.getByText("Sir Bartholomew Fluffington III");
      expect(nameElement).toHaveClass("truncate");
    });
  });

  describe("Accessibility", () => {
    test("should have accessible link", () => {
      render(<HeroDogPreviewCard dog={mockDog} />);

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });
  });
});
