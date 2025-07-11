require("@testing-library/jest-dom");

// Load environment variables for tests from actual .env.local
// Do NOT hardcode any secrets or cloud names here
require("dotenv").config({ path: ".env.local" });

// Polyfill for PointerEvent methods not implemented in JSDOM
if (typeof window !== "undefined") {
  if (!window.Element.prototype.hasPointerCapture) {
    window.Element.prototype.hasPointerCapture = function (pointerId) {
      // Basic mock implementation - adjust if needed for more complex scenarios
      return false;
    };
  }
  if (!window.Element.prototype.releasePointerCapture) {
    window.Element.prototype.releasePointerCapture = function (pointerId) {
      // Basic mock implementation
    };
  }
  // *** ADD Polyfill for scrollIntoView ***
  if (!window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = function () {
      // Basic mock implementation - does nothing, but prevents the error
    };
  }

  // Mock IntersectionObserver for lazy loading tests
  const mockIntersectionObserver = jest
    .fn()
    .mockImplementation((callback, options) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
      root: null,
      rootMargin: "0px",
      thresholds: [0],
    }));

  window.IntersectionObserver = mockIntersectionObserver;
  global.IntersectionObserver = mockIntersectionObserver;

  // Mock matchMedia for responsive design tests
  if (!window.matchMedia) {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  }

  // Mock requestAnimationFrame and cancelAnimationFrame for animation tests
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = jest.fn((cb) => {
      return setTimeout(cb, 16); // 60fps = 16ms
    });
  }

  if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = jest.fn((id) => {
      clearTimeout(id);
    });
  }
}

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(), // Added prefetch just in case
  }),
  useParams: () => ({ id: "1" }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: jest.fn(() => "/dogs"), // Keep or adjust as needed
}));

// Simple mocks for Next.js components
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, ...props }) => <img {...props} />, // Filter out Next.js-specific props
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  HeartIcon: ({ className, ...props }) => (
    <svg className={className} {...props} data-testid="building-icon" />
  ),
}));

// Suppress React act() warnings for startTransition in tests
// These warnings occur because startTransition is async but test environment
// doesn't always wait for all transitions to complete
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: An update to") &&
      args[0].includes("was not wrapped in act")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
