import React from "react";
import { render, screen } from "../../../test-utils";
import Footer from "../Footer";
import "@testing-library/jest-dom";

describe("<Footer />", () => {
  beforeEach(() => {
    render(<Footer />);
  });

  describe("Brand and Logo", () => {
    it("links the brand back to /", () => {
      const brandLinks = screen.getAllByRole("link", {
        name: /Rescue Dog Aggregator/i,
      });
      // There are 2 brand links (desktop and mobile)
      expect(brandLinks.length).toBeGreaterThan(0);
      brandLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/");
      });
    });

    it("renders logo image with correct alt text", () => {
      const logoImages = screen.getAllByAltText(/rescue dog aggregator logo/i);
      expect(logoImages.length).toBeGreaterThan(0);
    });

    it("renders tagline", () => {
      const taglines = screen.getAllByText(
        "Helping rescue dogs find loving homes.",
      );
      expect(taglines.length).toBeGreaterThan(0);
    });
  });

  describe("Desktop Navigation Sections", () => {
    it("renders Discover section with links", () => {
      expect(screen.getByText("Discover")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /browse dogs/i }),
      ).toHaveAttribute("href", "/dogs");
      expect(screen.getByRole("link", { name: /^breeds$/i })).toHaveAttribute(
        "href",
        "/breeds",
      );
      expect(screen.getByRole("link", { name: /^swipe$/i })).toHaveAttribute(
        "href",
        "/swipe",
      );
    });

    it("renders Guides section with all 4 guide links", () => {
      expect(screen.getByText("Guides")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /european rescue/i }),
      ).toHaveAttribute("href", "/guides/european-rescue-guide");
      expect(screen.getByRole("link", { name: /why rescue/i })).toHaveAttribute(
        "href",
        "/guides/why-rescue-from-abroad",
      );
      expect(
        screen.getByRole("link", { name: /first-time owner/i }),
      ).toHaveAttribute("href", "/guides/first-time-owner-guide");
      expect(screen.getByRole("link", { name: /costs/i })).toHaveAttribute(
        "href",
        "/guides/costs-and-preparation",
      );
    });

    it("renders Support section with links", () => {
      expect(screen.getByText("Support")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^about$/i })).toHaveAttribute(
        "href",
        "/about",
      );
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toHaveAttribute("href", "/organizations");
    });
  });

  describe("Contact Link", () => {
    it("renders Contact link to About page contact section", () => {
      const contact = screen.getByRole("link", { name: /Contact/i });
      expect(contact).toHaveAttribute("href", "/about#contact");
    });
  });

  describe("Privacy and Copyright", () => {
    it("does not render a Privacy Policy link", () => {
      const privacy = screen.queryByRole("link", { name: /Privacy Policy/i });
      expect(privacy).toBeNull();
    });

    it("does not render copyright text", () => {
      expect(screen.queryByText(/© 2025/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/copyright/i)).not.toBeInTheDocument();
    });
  });
});