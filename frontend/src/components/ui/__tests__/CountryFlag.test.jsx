import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import CountryFlag from "../CountryFlag";

describe("CountryFlag", () => {
  test("renders flag image with correct src and alt text", () => {
    render(<CountryFlag countryCode="TR" countryName="Turkey" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute(
      "src",
      expect.stringContaining("flagcdn.com"),
    );
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("tr.png"));
    expect(flagImage).toHaveAttribute("alt", "Turkey flag");
  });

  test("renders with small size by default", () => {
    render(<CountryFlag countryCode="DE" countryName="Germany" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("20x15"));
  });

  test("renders with medium size when specified", () => {
    render(
      <CountryFlag countryCode="DE" countryName="Germany" size="medium" />,
    );

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("32x24"));
  });

  test("renders with large size when specified", () => {
    render(<CountryFlag countryCode="DE" countryName="Germany" size="large" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("48x36"));
  });

  test("renders placeholder for unknown country code", () => {
    render(<CountryFlag countryCode="XX" countryName="Unknown Country" />);

    const placeholder = screen.getByText("XX");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass("bg-gray-200");
  });

  test("renders placeholder when no country code provided", () => {
    render(<CountryFlag countryName="Unknown Country" />);

    const placeholder = screen.getByText("??");
    expect(placeholder).toBeInTheDocument();
  });

  test("renders flag for UK country code (normalized to GB)", () => {
    render(<CountryFlag countryCode="UK" countryName="United Kingdom" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute(
      "src",
      expect.stringContaining("flagcdn.com"),
    );
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("gb.png"));
    expect(flagImage).toHaveAttribute("alt", "United Kingdom flag");
  });

  test("falls back to placeholder on image error", async () => {
    const { rerender } = render(
      <CountryFlag countryCode="TR" countryName="Turkey" />,
    );

    const flagImage = screen.getByRole("img");

    // Simulate image load error with act wrapper
    await act(async () => {
      const errorEvent = new Event("error");
      flagImage.dispatchEvent(errorEvent);
    });

    await waitFor(() => {
      expect(screen.getByText("TR")).toBeInTheDocument();
    });
  });

  test("has correct accessibility attributes", () => {
    render(<CountryFlag countryCode="FR" countryName="France" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute("alt", "France flag");
    expect(flagImage).toHaveAttribute("loading", "lazy");
  });

  test("applies custom className when provided", () => {
    render(
      <CountryFlag
        countryCode="IT"
        countryName="Italy"
        className="custom-class"
      />,
    );

    const container = screen.getByRole("img").parentElement;
    expect(container).toHaveClass("custom-class");
  });

  test("converts country code to lowercase for flag URL", () => {
    render(<CountryFlag countryCode="GB" countryName="United Kingdom" />);

    const flagImage = screen.getByRole("img");
    expect(flagImage).toHaveAttribute("src", expect.stringContaining("gb.png"));
    expect(flagImage).toHaveAttribute(
      "src",
      expect.not.stringContaining("GB.png"),
    );
  });

  test("shows loading skeleton initially", () => {
    render(<CountryFlag countryCode="ES" countryName="Spain" />);

    // Should have loading skeleton (animate-pulse)
    const loadingSkeleton = document.querySelector(".animate-pulse");
    expect(loadingSkeleton).toBeInTheDocument();
    expect(loadingSkeleton).toHaveClass("bg-gray-200");
  });

  test("hides loading skeleton after image loads", async () => {
    render(<CountryFlag countryCode="ES" countryName="Spain" />);

    const flagImage = screen.getByRole("img");

    // Simulate image load
    await act(async () => {
      const loadEvent = new Event("load");
      flagImage.dispatchEvent(loadEvent);
    });

    // Loading skeleton should be gone
    await waitFor(() => {
      const loadingSkeleton = document.querySelector(".animate-pulse");
      expect(loadingSkeleton).not.toBeInTheDocument();
    });
  });
});
