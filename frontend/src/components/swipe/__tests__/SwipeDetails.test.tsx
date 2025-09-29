import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeDetails } from "../SwipeDetails";
import { useFavorites } from "@/hooks/useFavorites";
import { ToastProvider } from "../../../contexts/ToastContext";
import * as Sentry from "@sentry/nextjs";

jest.mock("@/hooks/useFavorites");
jest.mock("@sentry/nextjs");

const mockDog = {
  id: 1,
  name: "Buddy",
  age: "2 years",
  age_min_months: 24,
  sex: "Male",
  size: "Medium",
  breed: "Golden Mix",
  organization_name: "Happy Paws Rescue",
  location: "Berlin, Germany",
  adoption_url: "https://example.com/adopt/buddy",
  primary_image_url: "https://example.com/buddy1.jpg",
  slug: "buddy-golden-mix",
  photos: ["https://example.com/buddy2.jpg", "https://example.com/buddy3.jpg"],
  dog_profiler_data: {
    description:
      "Buddy is a lovable 2-year-old Golden Mix seeking his forever home. This playful pup has a heart of gold and endless energy for adventures.",
    personality_traits: ["Playful", "Loyal", "Gentle", "Friendly"],
    energy_level: 4,
    good_with_dogs: true,
    good_with_cats: "maybe",
    good_with_children: true,
    exercise_needs: "High",
    special_needs: "",
    unique_quirk: "Loves to carry his favorite toy everywhere",
  },
};

const mockDogWithoutLLMData = {
  id: 2,
  name: "Max",
  age: "3 years",
  age_min_months: 36,
  sex: "Male",
  size: "Large",
  breed: "German Shepherd",
  organization_name: "Pet Rescue",
  location: "Munich, Germany",
  adoption_url: "https://example.com/adopt/max",
  primary_image_url: "https://example.com/max.jpg",
  slug: "max-german-shepherd",
  photos: [],
};

describe("SwipeDetails", () => {
  const mockOnClose = jest.fn();
  const mockToggleFavorite = jest.fn();
  const mockCaptureEvent = jest.mocked(Sentry.captureEvent);
  const mockWindowOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFavorites as jest.Mock).mockReturnValue({
      favorites: [],
      toggleFavorite: mockToggleFavorite,
      isFavorited: jest.fn().mockReturnValue(false),
    });
    // Mock window.open
    global.window.open = mockWindowOpen;
  });

  afterEach(() => {
    // Clean up
    delete (global.window as any).open;
  });

  const renderWithProvider = (component) => {
    return render(<ToastProvider>{component}</ToastProvider>);
  };

  it("should open modal on card tap", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Dog Details")).toBeInTheDocument();
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });

  it("should display image carousel", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);

    const dots = screen.getAllByRole("button", { name: /Go to image/i });
    expect(dots).toHaveLength(3);
  });

  it("should show full personality description", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(
      screen.getByText(/Buddy is a lovable 2-year-old Golden Mix/),
    ).toBeInTheDocument();

    expect(screen.getByText(/Playful/)).toBeInTheDocument();
    expect(screen.getByText(/Loyal/)).toBeInTheDocument();
    expect(screen.getByText(/Gentle/)).toBeInTheDocument();
    expect(screen.getByText(/Friendly/)).toBeInTheDocument();
  });

  it("should include adoption CTA button", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const adoptButton = screen.getByRole("button", {
      name: /Visit Buddy's profile page/i,
    });
    expect(adoptButton).toBeInTheDocument();
    expect(screen.getByText(/Visit Buddy/)).toBeInTheDocument();
    // Check that the button contains a paw print
    const pawPrints = screen.getAllByText("🐾");
    expect(pawPrints.length).toBeGreaterThan(0);

    // Mock window.open for the test
    const originalOpen = window.open;
    window.open = jest.fn();
    fireEvent.click(adoptButton);
    expect(window.open).toHaveBeenCalledWith(
      "/dogs/1",
      "_blank",
      "noopener,noreferrer",
    );
    window.open = originalOpen;

    expect(mockCaptureEvent).toHaveBeenCalledWith({
      message: "swipe.adoption.clicked",
      level: "info",
      extra: {
        dog_id: 1,
        dog_name: "Buddy",
        organization: "Happy Paws Rescue",
      },
    });
  });

  it("should allow sharing dog profile", async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    const mockWriteText = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "isSecureContext", {
      value: true,
      writable: true,
      configurable: true,
    });

    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const shareButton = screen.getByLabelText("Share");
    expect(shareButton).toBeInTheDocument();

    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: "Check out Buddy for adoption!",
        text: "Buddy is a lovable 2-year-old Golden Mix seeking his forever home. This playful pup has a heart of gold and endless energy for adventures.",
        url: "http://localhost/dog/1",
      });
    });
  });

  it("should close on backdrop click", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const backdrop = screen.getByTestId("modal-backdrop");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show close button", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const closeButton = screen.getByRole("button", { name: /Close/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should display basic info correctly", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Young")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("should show good with badges", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Dogs ✓")).toBeInTheDocument();
    expect(screen.getByText("Cats ?")).toBeInTheDocument();
    expect(screen.getByText("Kids ✓")).toBeInTheDocument();
  });

  it("should show save button when not favorited", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const saveButton = screen.getByRole("button", {
      name: /Add to favorites/i,
    });
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(mockToggleFavorite).toHaveBeenCalledWith(mockDog.id);
  });

  it("should handle dogs without LLM data gracefully", () => {
    renderWithProvider(
      <SwipeDetails
        dog={mockDogWithoutLLMData}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.getByText("Adult")).toBeInTheDocument(); // Changed from "3 years" to "Adult" since age_min_months: 36
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();

    expect(screen.queryByText("Personality")).not.toBeInTheDocument();
    expect(screen.queryByText("Good With")).not.toBeInTheDocument();
  });

  it("should not render when closed", () => {
    const { container } = renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={false} onClose={mockOnClose} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should track modal open event", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(mockCaptureEvent).toHaveBeenCalledWith({
      message: "swipe.details.opened",
      level: "info",
      extra: {
        dog_id: 1,
        dog_name: "Buddy",
      },
    });
  });

  it("should not display energy level indicator (removed in redesign)", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.queryByTestId(/energy-dot/)).not.toBeInTheDocument();
    expect(screen.queryByText("Energy Level")).not.toBeInTheDocument();
  });

  it("should show organization information", () => {
    renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Happy Paws Rescue")).toBeInTheDocument();
    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
  });

  it("should handle swipe down to dismiss", () => {
    const { container } = renderWithProvider(
      <SwipeDetails dog={mockDog} isOpen={true} onClose={mockOnClose} />,
    );

    const modal = container.querySelector('[data-testid="modal-content"]');

    fireEvent.touchStart(modal!, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(modal!, { touches: [{ clientY: 350 }] });
    fireEvent.touchEnd(modal!, { changedTouches: [{ clientY: 350 }] });

    expect(mockOnClose).toHaveBeenCalled();
  });
});
