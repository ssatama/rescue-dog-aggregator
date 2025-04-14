require('@testing-library/jest-dom');

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