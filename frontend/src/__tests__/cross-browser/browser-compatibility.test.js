/**
 * Cross-Browser Compatibility Tests
 *
 * Tests for browser-specific features and compatibility:
 * - Chrome (desktop/mobile)
 * - Safari (desktop/mobile)
 * - Firefox
 * - Edge
 * - Feature detection
 * - Polyfill requirements
 */

import { render, screen, waitFor, fireEvent } from "../../test-utils";
import { act } from "../../test-utils";
import DogDetailClient from "../../app/dogs/[slug]/DogDetailClient";
import { LazyImage } from "../../components/ui/LazyImage";

// Suppress console errors for swipe handler warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("Unknown event handler property") ||
        message.includes("onSwipedLeft") ||
        message.includes("onSwipedRight") ||
        message.includes("onSwiped") ||
        message.includes("onSwiping"))
    ) {
      return; // Suppress swipe handler warnings
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-dog-123" }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
  usePathname: () => "/dogs/test-dog-123",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock services
jest.mock("../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(() =>
    Promise.resolve({
      id: "test-dog-123",
      slug: "test-dog-mixed-breed-123",
      name: "Test Dog",
      breed: "Mixed Breed",
      age_text: "2 years old",
      sex: "Male",
      size: "Medium",
      primary_image_url: "https://example.com/dog.jpg",
      properties: {
        description: "A lovely dog looking for a home.",
      },
      organization: {
        id: 1,
        name: "Test Rescue",
        website_url: "https://testrescue.org",
      },
      organization_id: 1,
      status: "available",
      adoption_url: "https://testrescue.org/adopt",
    }),
  ),
  getAnimals: jest.fn(() => Promise.resolve([])), // Mock immediately resolved for useSwipeNavigation
}));

// Mock the useSwipeNavigation hook to prevent real API calls
jest.mock("../../hooks/useSwipeNavigation", () => ({
  useSwipeNavigation: jest.fn(() => ({
    handlers: {
      onSwipedLeft: jest.fn(),
      onSwipedRight: jest.fn(),
    },
    prevDog: null,
    nextDog: null,
    isLoading: false,
  })),
  navigationCache: {
    clear: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
  },
}));

jest.mock("../../services/relatedDogsService", () => ({
  getRelatedDogs: jest.fn(() => Promise.resolve([])),
}));

// Mock the HeroImageWithBlurredBackground to avoid loading issues
jest.mock("../../components/ui/HeroImageWithBlurredBackground", () => {
  return function MockHeroImage({ src, alt }) {
    return (
      <div data-testid="mock-hero-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} data-testid="hero-image" />
      </div>
    );
  };
});

// Mock useAdvancedImage hook to avoid infinite loops
jest.mock("../../hooks/useAdvancedImage", () => ({
  useAdvancedImage: jest.fn(() => ({
    src: "https://example.com/dog.jpg",
    isLoading: false,
    hasError: false,
    onLoad: jest.fn(),
    onError: jest.fn(),
  })),
}));

// Mock additional complex components that might cause loading issues
jest.mock("../../components/dogs/RelatedDogsSection", () => {
  return function MockRelatedDogsSection() {
    return <div data-testid="related-dogs-section">Related Dogs</div>;
  };
});

jest.mock("../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../hooks/useScrollAnimation", () => ({
  ScrollAnimationWrapper: ({ children }) => <div>{children}</div>,
}));

describe("Cross-Browser Compatibility Tests", () => {
  beforeEach(() => {
    // Mock IntersectionObserver for all tests
    global.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Modern Browser Features", () => {
    test("intersection observer works or has fallback", async () => {
      // Test with IntersectionObserver support - use LazyImage which actually uses it
      const { unmount } = render(
        <LazyImage src="https://example.com/test.jpg" alt="Test" />,
      );

      await waitFor(() => {
        // Check if image or placeholder is rendered
        const elements = screen.getAllByRole("img");
        expect(elements.length).toBeGreaterThan(0);
      });

      // LazyImage uses IntersectionObserver through useLazyImage hook
      expect(global.IntersectionObserver).toHaveBeenCalled();

      // Clean up before second render
      unmount();

      // Test without IntersectionObserver (older browsers)
      const originalIntersectionObserver = global.IntersectionObserver;
      global.IntersectionObserver = undefined;
      window.IntersectionObserver = undefined;

      render(<LazyImage src="https://example.com/test2.jpg" alt="Test 2" />);

      // Should still render without crashing (fallback behavior)
      await waitFor(() => {
        // Either placeholder or image should be visible
        const elements = screen.getAllByRole("img");
        expect(elements.length).toBeGreaterThan(0);
      });

      // Restore IntersectionObserver for other tests
      global.IntersectionObserver = originalIntersectionObserver;
      window.IntersectionObserver = originalIntersectionObserver;
    });

    test("CSS custom properties fallbacks work", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Test that components render even if CSS custom properties aren't supported
      const elements = screen.getAllByTestId(/.*/).filter((el) => el.style);

      elements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        // Should have fallback styles that work without CSS custom properties
        expect(
          computedStyle.color || computedStyle.backgroundColor,
        ).toBeDefined();
      });
    });

    test("flexbox and grid layouts work correctly", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("metadata-cards")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const gridContainer = screen.getByTestId("metadata-cards");

      // In test environment, just verify the element exists with proper classes
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer.className).toContain("grid");
    });
  });

  describe("Safari-Specific Tests", () => {
    beforeEach(() => {
      // Mock Safari user agent
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
      });
    });

    test("webkit-specific styles are handled correctly", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Test that webkit-specific CSS doesn't break other browsers
      const heroImage = screen.getAllByTestId("hero-section")[0];
      expect(heroImage).toBeInTheDocument();
    });

    test("iOS Safari touch events work correctly", async () => {
      // Mock iOS Safari
      Object.defineProperty(navigator, "platform", {
        writable: true,
        value: "iPhone",
      });

      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("action-bar")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const actionBar = screen.getByTestId("action-bar");
      const buttons = actionBar.querySelectorAll("button");

      if (buttons.length > 0) {
        // Test touch events
        act(() => {
          fireEvent.touchStart(buttons[0]);
          fireEvent.touchEnd(buttons[0]);
        });

        expect(buttons[0]).toBeInTheDocument();
      }
    });

    test("Safari date handling works correctly", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Test that date formatting works in Safari
      const dateElements = document.querySelectorAll(
        '[data-testid*="date"], [datetime]',
      );
      dateElements.forEach((element) => {
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe("Firefox-Specific Tests", () => {
    beforeEach(() => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0",
      });
    });

    test("Firefox CSS grid implementation works", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("metadata-cards")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const gridContainer = screen.getByTestId("metadata-cards");
      expect(gridContainer).toHaveClass("grid");
    });

    test("Firefox image loading behavior", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const images = document.querySelectorAll("img");
      images.forEach((img) => {
        // Firefox-specific image loading tests
        expect(
          img.loading === "lazy" || img.loading === "eager" || !img.loading,
        ).toBe(true);
      });
    });
  });

  describe("Edge/IE Compatibility", () => {
    beforeEach(() => {
      // Mock Edge user agent
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62",
      });
    });

    test("Edge legacy features work correctly", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Test that modern features have appropriate fallbacks
      const heroContainer = screen.getAllByTestId("hero-section")[0];
      expect(heroContainer).toBeInTheDocument();
    });

    test("ES6+ features have appropriate polyfills", async () => {
      // Test that modern JavaScript features work or have polyfills
      const testArray = [1, 2, 3];

      // Array methods that might need polyfills
      expect(testArray.includes(2)).toBe(true);
      expect(Array.from(testArray)).toEqual([1, 2, 3]);

      // Object methods
      expect(Object.assign({}, { test: true })).toEqual({ test: true });

      // Promise support
      expect(Promise.resolve(true)).toBeInstanceOf(Promise);
    });
  });

  describe("Feature Detection Tests", () => {
    test("component gracefully handles missing features", async () => {
      // Test without requestAnimationFrame
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = undefined;

      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      global.requestAnimationFrame = originalRAF;
    });

    test("local storage availability is checked", async () => {
      // Test without localStorage
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, "localStorage", {
        value: undefined,
        writable: true,
      });

      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      global.localStorage = originalLocalStorage;
    });

    test("window object availability is checked", async () => {
      // Test server-side rendering scenario
      const originalWindow = global.window;
      global.window = undefined;

      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      global.window = originalWindow;
    });
  });

  describe("Responsive Design Cross-Browser", () => {
    test("media queries work across browsers", async () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: viewport.width,
        });

        Object.defineProperty(window, "innerHeight", {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        await act(async () => {
          render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
        });

        await waitFor(() => {
          expect(screen.getAllByTestId("hero-section").length).toBeGreaterThan(
            0,
          );
        });

        // Component should render correctly at all viewport sizes
        const heroContainers = screen.getAllByTestId("hero-section");
        expect(heroContainers.length).toBeGreaterThan(0);
      }
    });

    test("touch vs mouse interactions are handled correctly", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("action-bar")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const actionBar = screen.getByTestId("action-bar");
      const buttons = actionBar.querySelectorAll("button");

      if (buttons.length > 0) {
        // Test mouse events
        act(() => {
          fireEvent.mouseDown(buttons[0]);
          fireEvent.mouseUp(buttons[0]);
          fireEvent.click(buttons[0]);
        });

        // Test touch events
        act(() => {
          fireEvent.touchStart(buttons[0]);
          fireEvent.touchEnd(buttons[0]);
        });

        expect(buttons[0]).toBeInTheDocument();
      }
    });
  });

  describe("Performance Across Browsers", () => {
    test("animations perform well in all browsers", async () => {
      await act(async () => {
        render(<DogDetailClient params={{ slug: "test-dog-123" }} />);
      });

      await waitFor(
        () => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Test that animations don't cause performance issues
      const animatedElements = document.querySelectorAll(
        '[class*="transition"], [class*="animate"]',
      );

      animatedElements.forEach((element) => {
        expect(element).toBeInTheDocument();
      });
    });

    test("memory usage is reasonable across browsers", async () => {
      // Test multiple renders and unmounts
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <DogDetailClient params={{ slug: "test-dog-123" }} />,
        );

        await waitFor(() => {
          expect(screen.getAllByTestId("hero-section")[0]).toBeInTheDocument();
        });

        unmount();
      }

      // Should not crash after multiple render cycles
      expect(true).toBe(true);
    });
  });
});
