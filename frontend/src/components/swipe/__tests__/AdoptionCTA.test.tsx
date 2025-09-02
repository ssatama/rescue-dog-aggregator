import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdoptionCTA } from "../AdoptionCTA";
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs");

describe("AdoptionCTA", () => {
  const mockCaptureEvent = jest.mocked(Sentry.captureEvent);
  const mockWindowOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    global.window.open = mockWindowOpen;
  });

  afterEach(() => {
    // Clean up
    delete (global.window as any).open;
  });

  it("should render adoption button with correct text", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText(/Visit Buddy/)).toBeInTheDocument();
    expect(button).toHaveClass("bg-orange-500");
  });

  it("should track click event to Sentry", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    fireEvent.click(button);

    expect(mockCaptureEvent).toHaveBeenCalledWith({
      message: "swipe.adoption.clicked",
      level: "info",
      extra: {
        dog_id: 1,
        dog_name: "Buddy",
        organization: "Happy Paws",
      },
    });
  });

  it("should open dog detail page in new tab", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    fireEvent.click(button);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "/dogs/1",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should show paw print icon", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    expect(screen.getByText("🐾")).toBeInTheDocument();
  });

  it("should still work even when no adoption URL provided", () => {
    render(
      <AdoptionCTA
        adoptionUrl=""
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass("bg-orange-500");
  });

  it("should have hover effect", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(button).toHaveClass("hover:bg-orange-600");
  });

  it("should have full width styling", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(button).toHaveClass("w-full");
  });

  it("should have proper accessibility attributes", () => {
    render(
      <AdoptionCTA
        adoptionUrl="https://example.com/adopt"
        dogId={1}
        dogName="Buddy"
        organizationName="Happy Paws"
      />,
    );

    const button = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(button).toHaveAttribute("aria-label", "Visit Buddy's profile page");
  });
});
