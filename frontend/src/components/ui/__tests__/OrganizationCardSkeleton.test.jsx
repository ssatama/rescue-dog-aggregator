import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationCardSkeleton from "../OrganizationCardSkeleton";

describe("OrganizationCardSkeleton", () => {
  describe("Basic Rendering", () => {
    it("renders skeleton card with all essential elements", () => {
      render(<OrganizationCardSkeleton />);

      const skeleton = screen.getByTestId("organization-card-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse");
    });

    it("has correct card structure matching OrganizationCard", () => {
      render(<OrganizationCardSkeleton />);

      // Check for header skeleton
      const headerSkeleton = screen.getByTestId("skeleton-header");
      expect(headerSkeleton).toBeInTheDocument();

      // Check for content skeleton
      const contentSkeleton = screen.getByTestId("skeleton-content");
      expect(contentSkeleton).toBeInTheDocument();

      // Check for footer skeleton
      const footerSkeleton = screen.getByTestId("skeleton-footer");
      expect(footerSkeleton).toBeInTheDocument();
    });
  });

  describe("Header Section", () => {
    it("renders logo skeleton with correct dimensions", () => {
      render(<OrganizationCardSkeleton />);

      const logoSkeleton = screen.getByTestId("skeleton-logo");
      expect(logoSkeleton).toBeInTheDocument();
      expect(logoSkeleton).toHaveClass("w-16", "h-16", "rounded-lg");
    });

    it("renders organization name and location skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const nameSkeleton = screen.getByTestId("skeleton-org-name");
      expect(nameSkeleton).toBeInTheDocument();
      expect(nameSkeleton).toHaveClass("h-5", "w-3/4");

      const locationSkeleton = screen.getByTestId("skeleton-org-location");
      expect(locationSkeleton).toBeInTheDocument();
      expect(locationSkeleton).toHaveClass("h-4", "w-1/2");
    });
  });

  describe("Location Info Section", () => {
    it("renders three location info line skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const basedInSkeleton = screen.getByTestId("skeleton-based-in");
      expect(basedInSkeleton).toBeInTheDocument();

      const dogsInSkeleton = screen.getByTestId("skeleton-dogs-in");
      expect(dogsInSkeleton).toBeInTheDocument();

      const shipsToSkeleton = screen.getByTestId("skeleton-ships-to");
      expect(shipsToSkeleton).toBeInTheDocument();
    });

    it("has proper spacing between location lines", () => {
      render(<OrganizationCardSkeleton />);

      const locationInfoSkeleton = screen.getByTestId("skeleton-location-info");
      expect(locationInfoSkeleton).toHaveClass("space-y-2");
    });
  });

  describe("Statistics Section", () => {
    it("renders dog count and new badge skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const dogCountSkeleton = screen.getByTestId("skeleton-dog-count");
      expect(dogCountSkeleton).toBeInTheDocument();
      expect(dogCountSkeleton).toHaveClass("h-8", "w-12");

      const dogLabelSkeleton = screen.getByTestId("skeleton-dog-label");
      expect(dogLabelSkeleton).toBeInTheDocument();

      const newBadgeSkeleton = screen.getByTestId("skeleton-new-badge");
      expect(newBadgeSkeleton).toBeInTheDocument();
    });
  });

  describe("Recent Dogs Preview", () => {
    it("renders three dog thumbnail skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const thumbnailSkeletons = screen.getAllByTestId(
        "skeleton-dog-thumbnail",
      );
      expect(thumbnailSkeletons).toHaveLength(3);

      thumbnailSkeletons.forEach((thumbnail) => {
        expect(thumbnail).toHaveClass("w-12", "h-12", "rounded-lg");
      });
    });

    it("renders preview text skeleton", () => {
      render(<OrganizationCardSkeleton />);

      const previewTextSkeleton = screen.getByTestId("skeleton-preview-text");
      expect(previewTextSkeleton).toBeInTheDocument();
      expect(previewTextSkeleton).toHaveClass("h-3", "w-full");
    });
  });

  describe("Social Media Section", () => {
    it("renders social media icon skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const socialMediaSkeletons = screen.getAllByTestId(
        "skeleton-social-icon",
      );
      expect(socialMediaSkeletons.length).toBeGreaterThan(0);

      socialMediaSkeletons.forEach((icon) => {
        expect(icon).toHaveClass("w-6", "h-6", "rounded");
      });
    });
  });

  describe("Footer Section", () => {
    it("renders two CTA button skeletons", () => {
      render(<OrganizationCardSkeleton />);

      const websiteButtonSkeleton = screen.getByTestId(
        "skeleton-website-button",
      );
      expect(websiteButtonSkeleton).toBeInTheDocument();
      expect(websiteButtonSkeleton).toHaveClass("h-8", "flex-1");

      const viewDogsButtonSkeleton = screen.getByTestId(
        "skeleton-view-dogs-button",
      );
      expect(viewDogsButtonSkeleton).toBeInTheDocument();
      expect(viewDogsButtonSkeleton).toHaveClass("h-8", "flex-1");
    });

    it("has proper button spacing", () => {
      render(<OrganizationCardSkeleton />);

      const buttonContainerSkeleton = screen.getByTestId(
        "skeleton-button-container",
      );
      expect(buttonContainerSkeleton).toHaveClass(
        "flex",
        "space-x-3",
        "w-full",
      );
    });
  });

  describe("Animation and Styling", () => {
    it("has pulse animation applied", () => {
      render(<OrganizationCardSkeleton />);

      const skeleton = screen.getByTestId("organization-card-skeleton");
      expect(skeleton).toHaveClass("animate-pulse");
    });

    it("uses gray-200 color for skeleton elements with dark mode support", () => {
      render(<OrganizationCardSkeleton />);

      // Check specific skeleton elements that should have bg-gray-200 and dark:bg-gray-700
      const logoSkeleton = screen.getByTestId("skeleton-logo");
      const nameSkeleton = screen.getByTestId("skeleton-org-name");
      const dogCountSkeleton = screen.getByTestId("skeleton-dog-count");

      expect(logoSkeleton).toHaveClass("bg-gray-200");
      expect(logoSkeleton).toHaveClass("dark:bg-gray-700");
      expect(nameSkeleton).toHaveClass("bg-gray-200");
      expect(nameSkeleton).toHaveClass("dark:bg-gray-700");
      expect(dogCountSkeleton).toHaveClass("bg-gray-200");
      expect(dogCountSkeleton).toHaveClass("dark:bg-gray-700");
    });

    it("matches OrganizationCard styling with dark mode support", () => {
      render(<OrganizationCardSkeleton />);

      const skeleton = screen.getByTestId("organization-card-skeleton");
      expect(skeleton).toHaveClass(
        "overflow-hidden",
        "h-full",
        "border",
        "border-gray-200",
        "dark:border-gray-700",
        "bg-white",
        "dark:bg-gray-800",
        "animate-pulse",
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<OrganizationCardSkeleton />);

      const skeleton = screen.getByTestId("organization-card-skeleton");
      expect(skeleton).toHaveAttribute(
        "aria-label",
        "Loading organization information",
      );
      expect(skeleton).toHaveAttribute("role", "status");
    });

    it("maintains proper semantic structure", () => {
      render(<OrganizationCardSkeleton />);

      const skeleton = screen.getByTestId("organization-card-skeleton");
      expect(skeleton.tagName).toBe("DIV");
    });
  });

  describe("Responsive Design", () => {
    it("maintains proper spacing and layout", () => {
      render(<OrganizationCardSkeleton />);

      const headerSkeleton = screen.getByTestId("skeleton-header");
      expect(headerSkeleton).toHaveClass("p-6", "pb-4");

      const contentSkeleton = screen.getByTestId("skeleton-content");
      expect(contentSkeleton).toHaveClass("p-6", "pt-0", "space-y-3");

      const footerSkeleton = screen.getByTestId("skeleton-footer");
      expect(footerSkeleton).toHaveClass("p-6", "pt-0");
    });
  });
});
