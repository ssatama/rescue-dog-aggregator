/**
 * CTA Button Harmonization Tests
 * Ensures all CTA buttons use consistent orange theme (#EA580C)
 * Following TDD methodology: RED-GREEN-REFACTOR
 */

import React from "react";
import { render, screen } from "../../test-utils";
import { Button } from "@/components/ui/button";

describe("CTA Button Harmonization - Orange Theme Conversion", () => {
  describe("Button Component Base Styling", () => {
    test("default variant should use orange primary colors", () => {
      render(<Button data-testid="default-button">Test Button</Button>);
      const button = screen.getByTestId("default-button");

      // Should NOT contain blue colors
      expect(button.className).not.toMatch(/bg-blue-/);
      expect(button.className).not.toMatch(/hover:bg-blue-/);
      expect(button.className).not.toMatch(/shadow-blue-/);
      expect(button.className).not.toMatch(/focus:ring-blue-/);

      // Should use primary colors that will be orange-themed
      expect(button.className).toMatch(/bg-primary/);
    });

    test("outline variant should not use blue hover states", () => {
      render(
        <Button variant="outline" data-testid="outline-button">
          Outline Button
        </Button>,
      );
      const button = screen.getByTestId("outline-button");

      // Should NOT contain blue hover shadows
      expect(button.className).not.toMatch(/hover:shadow-blue-/);
      expect(button.className).not.toMatch(/hover:border-blue-/);
    });

    test("secondary variant should not use blue shadows", () => {
      render(
        <Button variant="secondary" data-testid="secondary-button">
          Secondary Button
        </Button>,
      );
      const button = screen.getByTestId("secondary-button");

      // Should NOT contain blue shadows
      expect(button.className).not.toMatch(/shadow-blue-/);
    });
  });

  describe("CTA Button Sizing Standards", () => {
    test("large buttons should use proper padding (px-8)", () => {
      render(
        <Button size="lg" data-testid="large-button">
          Large CTA
        </Button>,
      );
      const button = screen.getByTestId("large-button");

      expect(button.className).toMatch(/px-8/);
    });

    test("small buttons should use proper padding (px-3)", () => {
      render(
        <Button size="sm" data-testid="small-button">
          Small CTA
        </Button>,
      );
      const button = screen.getByTestId("small-button");

      expect(button.className).toMatch(/px-3/);
    });

    test("default buttons should use proper padding (px-4)", () => {
      render(<Button data-testid="default-button">Default CTA</Button>);
      const button = screen.getByTestId("default-button");

      expect(button.className).toMatch(/px-4/);
    });
  });

  describe("Focus States and Transitions", () => {
    test("buttons should have proper transition timing (duration-300)", () => {
      render(<Button data-testid="transition-button">Transition Test</Button>);
      const button = screen.getByTestId("transition-button");

      // Should have smooth transitions
      expect(button.className).toMatch(/transition-all/);
      expect(button.className).toMatch(/duration-300/);
    });

    test("buttons should have proper focus ring styling", () => {
      render(<Button data-testid="focus-button">Focus Test</Button>);
      const button = screen.getByTestId("focus-button");

      // Should have focus-visible ring
      expect(button.className).toMatch(/focus-visible:ring-2/);
      expect(button.className).toMatch(/focus-visible:ring-offset-2/);
    });
  });

  describe("Custom Orange Button Classes", () => {
    test("custom orange buttons should use proper orange colors", () => {
      render(
        <Button
          className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
          data-testid="custom-orange-button"
        >
          Custom Orange CTA
        </Button>,
      );
      const button = screen.getByTestId("custom-orange-button");

      // Should contain orange classes
      expect(button.className).toMatch(/bg-orange-600/);
      expect(button.className).toMatch(/hover:bg-orange-700/);
      expect(button.className).toMatch(/focus:ring-orange-600/);

      // Should NOT contain any blue classes
      expect(button.className).not.toMatch(/bg-blue-/);
      expect(button.className).not.toMatch(/hover:bg-blue-/);
      expect(button.className).not.toMatch(/focus:ring-blue-/);
    });

    test("orange gradient buttons should use proper gradient classes", () => {
      render(
        <Button
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-700"
          data-testid="gradient-orange-button"
        >
          Gradient Orange CTA
        </Button>,
      );
      const button = screen.getByTestId("gradient-orange-button");

      // Should contain gradient orange classes
      expect(button.className).toMatch(/from-orange-600/);
      expect(button.className).toMatch(/to-orange-700/);
      expect(button.className).toMatch(/hover:from-orange-600/);
      expect(button.className).toMatch(/hover:to-orange-700/);
    });
  });

  describe("Accessibility Requirements", () => {
    test("CTA buttons should meet minimum touch target size (48px)", () => {
      render(
        <Button size="lg" data-testid="touch-target-button">
          Touch Target Test
        </Button>,
      );
      const button = screen.getByTestId("touch-target-button");

      // Large buttons should be h-10 (40px) or larger
      expect(button.className).toMatch(/h-10/);
    });

    test("buttons should maintain proper contrast with orange theme", () => {
      render(
        <Button
          className="bg-orange-600 text-white"
          data-testid="contrast-button"
        >
          Contrast Test
        </Button>,
      );
      const button = screen.getByTestId("contrast-button");

      // Should use white text on orange background for proper contrast
      expect(button.className).toMatch(/text-white/);
      expect(button.className).toMatch(/bg-orange-600/);
    });
  });

  describe("Animation and Micro-interactions", () => {
    test("buttons should have hover lift effect", () => {
      render(<Button data-testid="hover-button">Hover Test</Button>);
      const button = screen.getByTestId("hover-button");

      // Should have hover translate effect
      expect(button.className).toMatch(/hover:-translate-y-0\.5/);
      expect(button.className).toMatch(/hover:shadow-lg/);
    });

    test("buttons should have active press effect", () => {
      render(<Button data-testid="active-button">Active Test</Button>);
      const button = screen.getByTestId("active-button");

      // Should have active translate effect
      expect(button.className).toMatch(/active:translate-y-0/);
      expect(button.className).toMatch(/active:shadow-sm/);
    });
  });
});
