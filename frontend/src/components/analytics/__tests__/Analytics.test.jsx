import { render } from '@testing-library/react';
import Analytics from '../Analytics';

// Mock Vercel Analytics
jest.mock('@vercel/analytics/react', () => ({
  Analytics: function MockAnalytics() {
    return <div data-testid="vercel-analytics" />;
  }
}));

describe('Analytics Component', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  it('renders Analytics component in production', () => {
    process.env.NODE_ENV = 'production';
    
    const { getByTestId } = render(<Analytics />);
    
    expect(getByTestId('vercel-analytics')).toBeInTheDocument();
  });

  it('renders Analytics component in Vercel environment', () => {
    process.env.VERCEL_ENV = 'production';
    
    const { getByTestId } = render(<Analytics />);
    
    expect(getByTestId('vercel-analytics')).toBeInTheDocument();
  });

  it('renders Analytics component in preview environment', () => {
    process.env.VERCEL_ENV = 'preview';
    
    const { getByTestId } = render(<Analytics />);
    
    expect(getByTestId('vercel-analytics')).toBeInTheDocument();
  });

  it('does not render Analytics component in development', () => {
    process.env.NODE_ENV = 'development';
    
    const { queryByTestId } = render(<Analytics />);
    
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument();
  });

  it('does not render Analytics component when no environment is set', () => {
    const { queryByTestId } = render(<Analytics />);
    
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument();
  });

  it('is a client component', () => {
    // This test ensures the component is marked as client-side
    // We test this indirectly by checking it renders without SSR issues
    expect(() => render(<Analytics />)).not.toThrow();
  });
});