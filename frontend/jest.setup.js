import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: '1' }),
  useSearchParams: () => ({ get: jest.fn() }),
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