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
    it("renders Find Dogs section with links", () => {
      expect(screen.getByText("Find Dogs")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /^all dogs$/i }),
      ).toHaveAttribute("href", "/dogs");
      expect(screen.getByRole("link", { name: /^breeds$/i })).toHaveAttribute(
        "href",
        "/breeds",
      );
      expect(screen.getByRole("link", { name: /^swipe$/i })).toHaveAttribute(
        "href",
        "/swipe",
      );
      expect(screen.getByRole("link", { name: /^puppies$/i })).toHaveAttribute(
        "href",
        "/dogs/puppies",
      );
      expect(screen.getByRole("link", { name: /^seniors$/i })).toHaveAttribute(
        "href",
        "/dogs/senior",
      );
    });

    it("renders Learn section with Guides hub and 4 guide links", () => {
      expect(screen.getByText("Learn")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^guides$/i })).toHaveAttribute(
        "href",
        "/guides",
      );
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

    it("renders About section with links", () => {
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^about us$/i })).toHaveAttribute(
        "href",
        "/about",
      );
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toHaveAttribute("href", "/organizations");
      expect(screen.getByRole("link", { name: /^faq$/i })).toHaveAttribute(
        "href",
        "/faq",
      );
    });
  });

  describe("Bottom Bar", () => {
    it("renders Made with heart in Europe text", () => {
      const madeWithTexts = screen.getAllByText(/made with/i);
      expect(madeWithTexts.length).toBeGreaterThan(0);
    });

    it("renders Privacy Policy link in bottom bar", () => {
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    });
  });

  describe("Privacy and Copyright", () => {
    it("does not render copyright text", () => {
      expect(screen.queryByText(/© 2025/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/copyright/i)).not.toBeInTheDocument();
    });
  });
});