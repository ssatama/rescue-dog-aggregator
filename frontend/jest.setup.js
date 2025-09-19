require("@testing-library/jest-dom");

// Set NODE_ENV to test to disable development console logs that cause infinite renders
process.env.NODE_ENV = 'test';

// Load environment variables for tests from actual .env.local
// Do NOT hardcode any secrets or cloud names here
require("dotenv").config({ path: ".env.local" });

// Mock React cache function for server components in tests
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn) => fn, // Simple pass-through for tests since cache is RSC-only
}));

// Polyfill for TextEncoder/TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for fetch for Node.js environment (needed for Next.js route testing)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
  });
}

if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers);
    }
  };
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class MockHeaders {
    constructor(init = {}) {
      this._headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.set(key, value);
        });
      }
    }
    set(name, value) { this._headers.set(name.toLowerCase(), value); }
    get(name) { return this._headers.get(name.toLowerCase()); }
    has(name) { return this._headers.has(name.toLowerCase()); }
    delete(name) { this._headers.delete(name.toLowerCase()); }
  };
}

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

  // Mock matchMedia for responsive design tests - default to desktop viewport
  window.matchMedia = jest.fn().mockImplementation((query) => {
    // Default to desktop viewport (1024px+) for consistent test behavior
    // This ensures tests don't accidentally render mobile/tablet views
    const matches = 
      query.includes("min-width: 1024px") || // Desktop
      query.includes("min-width: 768px") ||  // Tablet and up
      query.includes("min-width: 375px");    // Mobile and up
    
    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });

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
    forward: jest.fn(),
    prefetch: jest.fn(), // Added prefetch just in case
  }),
  useParams: () => ({ id: "1" }),
  useSearchParams: () => {
    const searchParams = new URLSearchParams();
    return searchParams;
  },
  usePathname: jest.fn(() => "/dogs"), // Keep or adjust as needed
}));

// Simple mocks for Next.js components
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ 
    priority, 
    sizes, 
    quality, 
    placeholder, 
    blurDataURL, 
    fill, 
    loader, 
    unoptimized,
    style,
    className,
    ...props 
  }) => {
    // When fill is true, Next.js Image applies position styles and sizing
    const fillStyles = fill ? {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    } : {};
    
    // Add CSS classes that Next.js Image typically adds for fill behavior
    const fillClasses = fill ? 'w-full h-full object-cover' : '';
    const combinedClassName = [className, fillClasses].filter(Boolean).join(' ');
    
    return <img 
      {...props}
      style={{ ...style, ...fillStyles }}
      className={combinedClassName}
    />;
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, prefetch, ...props }) => (
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

// Mock Vercel Analytics and Speed Insights
jest.mock("@vercel/analytics/react", () => ({
  Analytics: function MockAnalytics() {
    return <div data-testid="vercel-analytics" />;
  }
}));

jest.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: function MockSpeedInsights() {
    return <div data-testid="vercel-speed-insights" />;
  }
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
    // Suppress swipe handler warnings from react-swipeable
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Unknown event handler property") &&
        (args[0].includes("onSwipedLeft") ||
         args[0].includes("onSwipedRight") ||
         args[0].includes("onSwiped") ||
         args[0].includes("onSwiping")))
    ) {
      return;
    }
    // fetchPriority warning fixed by using correct lowercase 'fetchpriority' attribute
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});