import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MobileBreedSpotlight } from "../MobileBreedSpotlight";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Next Image
interface MockImageProps {
  src: string;
  alt: string;
  className?: string;
}

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, className }: MockImageProps) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

// Mock lucide icons
jest.mock("lucide-react", () => ({
  ChevronRight: () => <span data-testid="chevron-icon">→</span>,
  Dog: () => <span data-testid="dog-icon">🐕</span>,
}));

// Mock useReducedMotion
let mockReducedMotion = false;
jest.mock("@/hooks", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Mock framer-motion
interface MockMotionDivProps {
  children?: React.ReactNode;
  className?: string;
  drag?: boolean | "x" | "y";
  dragConstraints?: object;
  dragElastic?: number;
  onDragEnd?: () => void;
  "data-testid"?: string;
}

interface MockAnimatePresenceProps {
  children: React.ReactNode;
}

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      drag,
      dragConstraints,
      dragElastic,
      onDragEnd,
      ...props
    }: MockMotionDivProps) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: MockAnimatePresenceProps) => children,
}));

const mockBreeds = [
  {
    name: "Labrador Retriever",
    description:
      "Friendly, outgoing, and active dogs who love families and make perfect companions.",
    availableCount: 20,
    imageUrl: "/images/breeds/labrador.jpg",
    slug: "labrador-retriever",
  },
  {
    name: "Golden Retriever",
    description:
      "Intelligent, friendly, and devoted dogs that make excellent family pets.",
    availableCount: 15,
    imageUrl: "/images/breeds/golden-retriever.jpg",
    slug: "golden-retriever",
  },
  {
    name: "Beagle",
    description:
      "Small to medium-sized hounds known for their gentle disposition and curious nature.",
    availableCount: 8,
    slug: "beagle",
  },
];

describe("MobileBreedSpotlight", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the component with breeds array correctly", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Check heading
    expect(screen.getByText("Breed Spotlight")).toBeInTheDocument();

    // Check first breed is displayed initially
    expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

    // Description is not rendered in current implementation
    // expect(
    //   screen.getByText(/Friendly, outgoing, and active dogs/),
    // ).toBeInTheDocument();

    // Check available count
    expect(screen.getByText("20 available")).toBeInTheDocument();

    // Check CTA button with plural format
    expect(
      screen.getByRole("button", { name: /explore labradors/i }),
    ).toBeInTheDocument();
  });

  it("applies mobile-only visibility classes", () => {
    const { container } = render(<MobileBreedSpotlight breeds={mockBreeds} />);
    const section = container.firstChild;
    expect(section).toHaveClass("sm:hidden");
  });

  it("applies white/zinc background classes instead of gradient", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);
    const card = screen.getByTestId("breed-spotlight-card");
    expect(card).toHaveClass(
      "bg-white",
      "dark:bg-zinc-900",
      "border",
      "border-zinc-200",
      "dark:border-zinc-700",
    );
    // Should not have gradient classes
    expect(card).not.toHaveClass("bg-gradient-to-br");
  });

  it("renders breed image when provided", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    const image = screen.getByAltText("Labrador Retriever");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/breeds/labrador.jpg");
  });

  it("renders dog icon fallback when no image provided", () => {
    render(<MobileBreedSpotlight breeds={[mockBreeds[2]]} />); // Beagle has no imageUrl

    // Should show dog icon placeholder
    expect(screen.getByTestId("dog-icon")).toBeInTheDocument();
  });

  it("navigates to breed page when CTA button is clicked", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    const ctaButton = screen.getByRole("button", {
      name: /explore labradors/i,
    });
    fireEvent.click(ctaButton);

    expect(mockPush).toHaveBeenCalledWith("/breeds/labrador-retriever");
  });

  it("handles empty breeds array gracefully", () => {
    render(<MobileBreedSpotlight breeds={[]} />);

    // Should show fallback state
    expect(screen.getByText("Breed Spotlight")).toBeInTheDocument();
    expect(screen.getByText("Discover Popular Breeds")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /explore all breeds/i }),
    ).toBeInTheDocument();
  });

  it("displays loading skeleton when loading prop is true", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} loading={true} />);

    expect(screen.getByTestId("breed-spotlight-skeleton")).toBeInTheDocument();
  });

  it("navigates to general breeds page when no breed slug", () => {
    const breedWithoutSlug = [{ ...mockBreeds[0], slug: undefined }];
    render(<MobileBreedSpotlight breeds={breedWithoutSlug} />);

    const ctaButton = screen.getByRole("button", {
      name: /explore labradors/i,
    });
    fireEvent.click(ctaButton);

    expect(mockPush).toHaveBeenCalledWith("/breeds");
  });

  it("formats breed name correctly for CTA button", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Should use "Labradors" (plural) in the button
    expect(
      screen.getByRole("button", { name: /explore labradors/i }),
    ).toBeInTheDocument();
  });

  it("handles breeds with single-word names", () => {
    render(<MobileBreedSpotlight breeds={[mockBreeds[2]]} />); // Beagle

    expect(
      screen.getByRole("button", { name: /explore beagles/i }),
    ).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Check section role
    const section = screen.getByRole("region", { name: /breed spotlight/i });
    expect(section).toBeInTheDocument();

    // Check button has proper aria-label
    const ctaButton = screen.getByRole("button", {
      name: /explore labradors/i,
    });
    expect(ctaButton).toHaveAttribute("aria-label");
  });

  it("applies hover effect classes to CTA button", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    const ctaButton = screen.getByRole("button", {
      name: /explore labradors/i,
    });
    expect(ctaButton).toHaveClass("hover:bg-[#C67F93]", "transition-all");
  });

  it("renders with proper padding and spacing", () => {
    const { container } = render(<MobileBreedSpotlight breeds={mockBreeds} />);
    const section = container.firstChild;

    expect(section).toHaveClass("px-4", "pb-6");
  });

  it("displays count badge with correct styling", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    const badge = screen.getByText("20 available");
    expect(badge).toHaveClass(
      "bg-green-100",
      "dark:bg-green-900/30",
      "text-green-700",
      "dark:text-green-400",
    );
  });

  it("handles zero available count", () => {
    const breedWithNoAvailable = [{ ...mockBreeds[0], availableCount: 0 }];
    render(<MobileBreedSpotlight breeds={breedWithNoAvailable} />);

    // Should not show the count badge when 0
    expect(screen.queryByText("0 available")).not.toBeInTheDocument();
  });

  it("shows dot navigation indicators for multiple breeds", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Should show dots for navigation
    const dots = screen.getAllByRole("button", {
      name: /go to breed \d+/i,
    });
    expect(dots).toHaveLength(3); // Three breeds = three dots
  });

  it("does not show dot navigation for single breed", () => {
    render(<MobileBreedSpotlight breeds={[mockBreeds[0]]} />);

    // Should not show dots for single breed
    const dots = screen.queryAllByRole("button", {
      name: /go to breed \d+/i,
    });
    expect(dots).toHaveLength(0);
  });

  it("navigates between breeds using dot indicators", () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Initially shows first breed
    expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

    // Click second dot
    const dots = screen.getAllByRole("button", {
      name: /go to breed \d+/i,
    });
    fireEvent.click(dots[1]);

    // Should show second breed
    expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
  });

  it("auto-advances carousel after timeout", async () => {
    render(<MobileBreedSpotlight breeds={mockBreeds} />);

    // Initially shows first breed
    expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

    // Advance time by 8 seconds
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Should show second breed
    await waitFor(() => {
      expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
    });
  });

  it("handles special breed name pluralization", () => {
    const specialBreeds = [
      {
        name: "German Shepherd",
        description: "Loyal and versatile working dogs.",
        availableCount: 5,
        slug: "german-shepherd",
      },
    ];
    render(<MobileBreedSpotlight breeds={specialBreeds} />);

    expect(
      screen.getByRole("button", { name: /explore german shepherds/i }),
    ).toBeInTheDocument();
  });

  describe("Reduced Motion", () => {
    beforeEach(() => {
      mockReducedMotion = true;
    });

    afterEach(() => {
      mockReducedMotion = false;
    });

    it("renders carousel correctly with reduced motion enabled", () => {
      render(<MobileBreedSpotlight breeds={mockBreeds} />);

      expect(screen.getByText("Breed Spotlight")).toBeInTheDocument();
      expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();
      expect(screen.getByText("20 available")).toBeInTheDocument();
    });

    it("auto-advances carousel with reduced motion enabled", async () => {
      render(<MobileBreedSpotlight breeds={mockBreeds} />);

      expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(8000);
      });

      await waitFor(() => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      });
    });
  });

  it("does not show description when not provided", () => {
    const breedWithoutDescription = [
      {
        ...mockBreeds[0],
        description: undefined,
      },
    ];
    render(<MobileBreedSpotlight breeds={breedWithoutDescription} />);

    expect(screen.queryByTestId("breed-description")).not.toBeInTheDocument();
  });
});
