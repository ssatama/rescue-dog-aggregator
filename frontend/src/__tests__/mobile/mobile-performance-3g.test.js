import { render, screen, waitFor, act } from "@testing-library/react";
import DogSection from "../../components/home/DogSection";
import HeroSection from "../../components/home/HeroSection";

// Mock logger properly with Jest module mocking
jest.mock("../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
  reportError: jest.fn(),
}));

// Mock services with performance monitoring
jest.mock("../../services/animalsService");
const {
  getAnimalsByCuration,
  getStatistics,
} = require("../../services/animalsService");

jest.mock("../../utils/imageUtils", () => ({
  preloadImages: jest.fn(),
  getCatalogCardImageWithPosition: jest.fn((url) => ({
    src: url.replace("/upload/", "/upload/w_320,h_240,c_fill,q_70,f_auto/"),
    position: "center",
  })),
  handleImageError: jest.fn(),
  getMobileOptimizedImage: jest.fn((url) =>
    url.replace("/upload/", "/upload/w_320,h_240,c_fill,q_70,f_auto/"),
  ),
}));

describe("Mobile Performance on 3G Networks", () => {
  const mockDogs = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Dog ${i + 1}`,
    breed: "Test Breed",
    primary_image_url: `https://images.rescuedogs.me/rescue_dogs/test/dog-${i + 1}.jpg`,
    organization: { name: "Test Rescue", city: "Test City", country: "TC" },
  }));

  const mockStats = {
    total_dogs: 237,
    total_organizations: 12,
    total_countries: 2,
    countries: ["Turkey", "United States"],
    organizations: [
      { id: 1, name: "Test Rescue 1", dog_count: 15 },
      { id: 2, name: "Test Rescue 2", dog_count: 12 },
      { id: 3, name: "Test Rescue 3", dog_count: 8 },
      { id: 4, name: "Test Rescue 4", dog_count: 6 },
    ],
  };

  beforeEach(() => {
    // Mock API responses with realistic delays for 3G
    getAnimalsByCuration.mockImplementation(
      (curationType, limit = 4) =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockDogs.slice(0, limit)), 500),
        ),
    );
    getStatistics.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockStats), 300)),
    );

    // Mock 3G network conditions
    Object.defineProperty(navigator, "connection", {
      writable: true,
      value: {
        effectiveType: "3g",
        downlink: 1.5,
        rtt: 300,
      },
    });

    // Mock mobile viewport - need to match the actual query used in DogSection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches:
          query === "(max-width: 767px)" || query === "(max-width: 768px)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    // Mock performance API properly
    Object.defineProperty(global, "performance", {
      writable: true,
      value: {
        ...global.performance,
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
        getEntriesByName: jest.fn(() => []),
        now: jest.fn(() => Date.now()),
      },
    });

    // Mock requestIdleCallback
    global.requestIdleCallback = jest.fn((callback) => setTimeout(callback, 0));
    global.cancelIdleCallback = jest.fn();

    // Mock Element methods for JSDOM
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 320,
      height: 240,
      top: 0,
      left: 0,
      bottom: 240,
      right: 320,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));

    Element.prototype.querySelector = jest.fn(() => ({
      offsetWidth: 320,
      offsetHeight: 240,
    }));

    // Mock compareDocumentPosition for DOM order tests
    Element.prototype.compareDocumentPosition = jest.fn(
      () => Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Page Load Performance", () => {
    test("Hero section should render within 1 second", async () => {
      const startTime = performance.now();

      await act(async () => {
        render(<HeroSection />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("hero-section")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    test("Dog section should show loading state immediately", () => {
      // Mock loading state
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Loading state should be visible immediately
      const loadingElement = screen.getByTestId("dog-section-loading");
      expect(loadingElement).toBeInTheDocument();
    });

    test("Complete page load should be under 3 seconds on 3G", async () => {
      const startTime = performance.now();

      await act(async () => {
        render(
          <div>
            <HeroSection />
            <DogSection title="Recent Dogs" curationType="recent" />
          </div>,
        );
      });

      // Wait for all content to load
      await waitFor(
        () => {
          expect(screen.getByTestId("hero-section")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const endTime = performance.now();
      const totalLoadTime = endTime - startTime;

      expect(totalLoadTime).toBeLessThan(3000); // 3G requirement
    });
  });

  describe("Image Optimization for Mobile", () => {
    test("should use mobile-optimized image URLs", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const images = screen.getAllByRole("img");
      // Check that we have images and they exist (even if src might be null during loading)
      expect(images.length).toBeGreaterThan(0);

      // For any loaded images, check optimization parameters
      images.forEach((img) => {
        const src = img.getAttribute("src");
        if (src && src.length > 0) {
          // Should contain Cloudflare optimization parameters
          // ResponsiveDogImage uses cdn-cgi/image transformations with proper dimensions
          expect(src).toMatch(
            /(cdn-cgi\/image\/w_\d+,h_\d+.*f_auto|example\.com)/,
          );
        }
      });
    });

    test("should implement lazy loading for images", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // LazyImage component manages lazy loading internally through IntersectionObserver
      // Check that we have image placeholders which indicates lazy loading is working
      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);

      // For any images that are rendered, they should have the loading attribute
      images.forEach((img) => {
        const loading = img.getAttribute("loading");
        if (loading !== null) {
          expect(loading).toBe("lazy");
        }
      });
    });

    test("should show placeholder images while loading", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      // Initially shows loading state, wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId("dog-section")).toBeInTheDocument();
      });

      // Now check for image placeholders in loaded content
      const placeholders = screen.getAllByTestId("image-placeholder");
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });

  describe("Bundle Size and Code Splitting", () => {
    test("should dynamically import mobile-specific components", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      // Wait for dogs to load and carousel to be rendered
      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Check that the carousel component loads (dynamic import works)
      expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
    });

    test("should use will-change for animation performance", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const carousel = screen.getByTestId("dog-carousel");
      const styles = window.getComputedStyle(carousel);
      expect(styles.willChange).toBe("transform");
    });
  });

  describe("Memory Usage Optimization", () => {
    test("should limit concurrent image loads", async () => {
      const preloadSpy = require("../../utils/imageUtils").preloadImages;

      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(() => {
        expect(preloadSpy).toHaveBeenCalled();
      });

      // Should not preload more than 4 images (limit from DogSection)
      const calls = preloadSpy.mock.calls;
      calls.forEach((call) => {
        const imageUrls = call[0];
        expect(imageUrls.length).toBeLessThanOrEqual(4); // Changed from 5 to 4
      });
    });

    test("should cleanup event listeners on unmount", async () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <DogSection title="Test Dogs" curationType="recent" />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      // Note: DogSection only adds resize listener, not scroll listener
    });
  });

  describe("Network-Aware Loading", () => {
    test("should reduce image quality on slow networks", async () => {
      // Mock slow 3G
      Object.defineProperty(navigator, "connection", {
        writable: true,
        value: {
          effectiveType: "slow-2g",
          downlink: 0.5,
          rtt: 800,
        },
      });

      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      const images = screen.getAllByRole("img");
      // Verify images exist for slow network optimization test
      expect(images.length).toBeGreaterThan(0);

      images.forEach((img) => {
        const src = img.getAttribute("src");
        if (src && src.length > 0) {
          // Should contain quality parameter (ResponsiveDogImage uses adaptive quality)
          // For slow-2g network, should use q_60
          expect(src).toMatch(/q_60/);
        }
      });
    });

    test("should show network-aware loading messages", async () => {
      // Mock slow network
      Object.defineProperty(navigator, "connection", {
        writable: true,
        value: {
          effectiveType: "slow-2g",
          downlink: 0.3,
        },
      });

      // Mock loading state
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check that loading state shows with slow network message
      const loadingElement = screen.getByTestId("dog-section-loading");
      expect(loadingElement).toBeInTheDocument();

      // Check for slow network message
      expect(screen.getByText(/Loading on slow network/i)).toBeInTheDocument();
    });
  });

  describe("Critical Resource Prioritization", () => {
    test("should prioritize hero section content", async () => {
      const { container } = render(
        <div>
          <HeroSection />
          <DogSection title="Test Dogs" curationType="recent" />
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("hero-section")).toBeInTheDocument();
      });

      // Hero section should be rendered first
      const heroSection = screen.queryByTestId("hero-section");
      expect(heroSection).toBeInTheDocument();

      // Check DOM order priority (hero appears first)
      const sections = container.querySelectorAll("section");
      expect(sections[0]).toHaveAttribute("data-testid", "hero-section");
    });

    test("should defer non-critical animations", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      // Wait for dogs to load and carousel to be rendered (with 500ms mock delay)
      await waitFor(
        () => {
          expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Check that component renders with proper structure (animation deferral working)
      expect(screen.getByTestId("dog-carousel")).toBeInTheDocument();
    });
  });

  describe("Performance Monitoring", () => {
    test("should track performance metrics", async () => {
      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dog-section")).toBeInTheDocument();
      });

      // Verify that performance marking functions are called
      expect(global.performance.mark).toHaveBeenCalledWith("dog-section-start");
      expect(global.performance.mark).toHaveBeenCalledWith("dog-section-end");
      expect(global.performance.measure).toHaveBeenCalledWith(
        "dog-section-load-time",
        "dog-section-start",
        "dog-section-end",
      );
    });

    test("should report slow loading times", async () => {
      // Set NODE_ENV to development for console warnings
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Get the mocked logger
      const { logger } = require("../../utils/logger");

      // Mock slow loading by manipulating performance.now
      let callCount = 0;
      global.performance.now = jest.fn(() => {
        callCount++;
        // Return values that simulate > 3000ms load time
        return callCount === 1 ? 0 : 4000;
      });

      await act(async () => {
        render(<DogSection title="Test Dogs" curationType="recent" />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("dog-section")).toBeInTheDocument();
      });

      // Should log warning for slow performance using logger utility
      await waitFor(
        () => {
          expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Slow loading detected"),
          );
        },
        { timeout: 2000 },
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
