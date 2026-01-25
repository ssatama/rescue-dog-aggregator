import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock FavoriteButton
const FavoriteButtonRenderCount = { count: 0 };
jest.mock("../../favorites/FavoriteButton", () => ({
  FavoriteButton: jest.fn(({ dogId, compact }) => {
    FavoriteButtonRenderCount.count++;
    return (
      <button
        data-testid={`favorite-btn-${dogId}`}
        data-render-count={FavoriteButtonRenderCount.count}
        data-compact={compact ? "true" : "false"}
      >
        Favorite
      </button>
    );
  }),
}));

// Mock ShareButton
const ShareButtonRenderCount = { count: 0 };
jest.mock("../../ui/ShareButton", () => ({
  __esModule: true,
  default: jest.fn(({ url, title }) => {
    ShareButtonRenderCount.count++;
    return (
      <button
        data-testid="share-btn"
        data-render-count={ShareButtonRenderCount.count}
        data-url={url}
        data-title={title}
      >
        Share
      </button>
    );
  }),
}));

// Mock trackDogCardClick
jest.mock("@/lib/monitoring/breadcrumbs", () => ({
  trackDogCardClick: jest.fn(),
}));

// Mock NextImage
jest.mock("../../ui/NextImage", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => (
    <img data-testid="dog-image" alt={alt} />
  ),
}));

// Mock useFavorites hook
jest.mock("../../../hooks/useFavorites", () => ({
  useFavorites: () => ({
    isFavorited: jest.fn(() => false),
    toggleFavorite: jest.fn(),
  }),
}));

// Import after mocks - the component is JSX so we need to assert the type
const DogCardOptimized = require("../DogCardOptimized").default as React.FC<Record<string, unknown>>;

const createMockDog = (overrides = {}) => ({
  id: 1,
  name: "Max",
  slug: "max-golden-retriever-1",
  breed: "Golden Retriever",
  age: "2 years",
  sex: "Male",
  primary_image_url: "/test1.jpg",
  organization: {
    id: 1,
    name: "Happy Tails",
    slug: "happy-tails",
  },
  properties: {},
  dog_profiler_data: {},
  ...overrides,
});

describe("DogCardOptimized Memoization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FavoriteButtonRenderCount.count = 0;
    ShareButtonRenderCount.count = 0;
  });

  describe("React.memo behavior", () => {
    it("renders without animation class when isVirtualized is true", () => {
      const { container } = render(
        <DogCardOptimized
          dog={createMockDog()}
          isVirtualized={true}
          position={0}
        />,
      );

      const card = container.querySelector("[data-testid='dog-card-1']");
      expect(card).toBeInTheDocument();
      expect(card?.className).not.toContain("animate-fadeInUp");
    });

    it("does not re-render when unrelated props change", () => {
      const dog = createMockDog();

      const { rerender } = render(
        <DogCardOptimized dog={dog} priority={false} position={0} />,
      );

      const initialRenderCount = FavoriteButtonRenderCount.count;

      // Re-render with same props - should not trigger child re-renders due to memo
      rerender(<DogCardOptimized dog={dog} priority={false} position={0} />);

      // Memo should prevent re-render, so count should stay the same
      expect(FavoriteButtonRenderCount.count).toBe(initialRenderCount);
    });

    it("re-renders when dog.id changes", () => {
      const dog1 = createMockDog({ id: 1 });
      const dog2 = createMockDog({ id: 2 });

      const { rerender } = render(
        <DogCardOptimized dog={dog1} position={0} />,
      );

      const initialRenderCount = FavoriteButtonRenderCount.count;

      rerender(<DogCardOptimized dog={dog2} position={0} />);

      // Should re-render when dog.id changes
      expect(FavoriteButtonRenderCount.count).toBeGreaterThan(initialRenderCount);
    });

    it("re-renders when position changes", () => {
      const dog = createMockDog();

      const { rerender } = render(
        <DogCardOptimized dog={dog} position={0} />,
      );

      const initialRenderCount = FavoriteButtonRenderCount.count;

      rerender(<DogCardOptimized dog={dog} position={1} />);

      // Should re-render when position changes
      expect(FavoriteButtonRenderCount.count).toBeGreaterThan(initialRenderCount);
    });
  });

  describe("memoized shareData", () => {
    it("passes stable share data props to ShareButton", () => {
      const dog = createMockDog();

      render(<DogCardOptimized dog={dog} position={0} />);

      const shareBtn = screen.getByTestId("share-btn");
      expect(shareBtn).toHaveAttribute("data-title", "Meet Max");
    });
  });

  describe("animation deferral", () => {
    it("skips animation for virtualized cards regardless of position", () => {
      const { container } = render(
        <DogCardOptimized
          dog={createMockDog()}
          isVirtualized={true}
          position={0}
        />,
      );

      const card = container.querySelector("[data-testid='dog-card-1']");
      expect(card?.className).not.toContain("animate-fadeInUp");
    });

    it("skips animation for cards beyond position 4", () => {
      const { container } = render(
        <DogCardOptimized
          dog={createMockDog()}
          isVirtualized={false}
          position={5}
        />,
      );

      const card = container.querySelector("[data-testid='dog-card-1']");
      // Animation should not be applied for position >= 4
      expect(card?.className).not.toContain("animate-delay-500");
    });
  });

  describe("reduced motion preference", () => {
    it("respects prefers-reduced-motion: reduce preference", () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { container } = render(
        <DogCardOptimized dog={createMockDog()} isVirtualized={false} position={0} />
      );

      const card = container.querySelector("[data-testid='dog-card-1']");
      expect(card?.className).not.toContain("animate-fadeInUp");

      window.matchMedia = originalMatchMedia;
    });
  });

  describe("embedded mode", () => {
    it("renders compact embedded card without action buttons", () => {
      const { container } = render(
        <DogCardOptimized
          dog={createMockDog()}
          embedded={true}
          position={0}
        />,
      );

      const card = container.querySelector("[data-embedded='true']");
      expect(card).toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders compact card with action buttons", () => {
      render(
        <DogCardOptimized
          dog={createMockDog()}
          compact={true}
          position={0}
        />,
      );

      expect(screen.getByTestId("favorite-btn-1")).toBeInTheDocument();
      expect(screen.getByTestId("share-btn")).toBeInTheDocument();
    });
  });
});

describe("FavoriteButton Memoization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FavoriteButtonRenderCount.count = 0;
  });

  it("renders with correct props", () => {
    render(
      <DogCardOptimized dog={createMockDog()} position={0} />,
    );

    const favoriteBtn = screen.getByTestId("favorite-btn-1");
    expect(favoriteBtn).toBeInTheDocument();
  });
});

describe("ShareButton Memoization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ShareButtonRenderCount.count = 0;
  });

  it("renders with memoized share data", () => {
    render(
      <DogCardOptimized dog={createMockDog()} position={0} />,
    );

    const shareBtn = screen.getByTestId("share-btn");
    expect(shareBtn).toBeInTheDocument();
    expect(shareBtn).toHaveAttribute("data-title", "Meet Max");
  });
});
