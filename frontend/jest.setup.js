require('@testing-library/jest-dom');

// Load environment variables for tests from actual .env.local
// Do NOT hardcode any secrets or cloud names here
require('dotenv').config({ path: '.env.local' });

// Polyfill for PointerEvent methods not implemented in JSDOM
if (typeof window !== 'undefined') {
  if (!window.Element.prototype.hasPointerCapture) {
    window.Element.prototype.hasPointerCapture = function(pointerId) {
      // Basic mock implementation - adjust if needed for more complex scenarios
      return false;
    };
  }
  if (!window.Element.prototype.releasePointerCapture) {
    window.Element.prototype.releasePointerCapture = function(pointerId) {
      // Basic mock implementation
    };
  }
  // *** ADD Polyfill for scrollIntoView ***
  if (!window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = function() {
      // Basic mock implementation - does nothing, but prevents the error
    };
  }

  // Mock IntersectionObserver for lazy loading tests
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }

  // Mock matchMedia for responsive design tests
  if (!window.matchMedia) {
    window.matchMedia = jest.fn().mockImplementation(query => ({
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(), // Added prefetch just in case
  }),
  useParams: () => ({ id: '1' }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: jest.fn(() => '/dogs'), // Keep or adjust as needed
}));

// Simple mocks for Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} /> // Using JSX here is fine
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>
}));