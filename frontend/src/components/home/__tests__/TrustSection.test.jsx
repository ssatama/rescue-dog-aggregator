import { render, screen, waitFor, act } from '@testing-library/react';
import TrustSection from '../TrustSection';

// Mock the statistics service
jest.mock('../../../services/animalsService', () => ({
  getStatistics: jest.fn()
}));

describe('TrustSection', () => {
  const mockStatistics = {
    total_dogs: 237,
    total_organizations: 12,
    total_countries: 2,
    countries: ['Turkey', 'United States'],
    organizations: [
      { id: 1, name: 'Pets in Turkey', dog_count: 45 },
      { id: 2, name: 'Berlin Rescue', dog_count: 23 },
      { id: 3, name: 'Tierschutz EU', dog_count: 32 },
      { id: 4, name: 'Happy Tails', dog_count: 18 },
      { id: 5, name: 'Rescue Org 5', dog_count: 15 },
      { id: 6, name: 'Rescue Org 6', dog_count: 12 },
      { id: 7, name: 'Rescue Org 7', dog_count: 10 },
      { id: 8, name: 'Rescue Org 8', dog_count: 8 },
      { id: 9, name: 'Rescue Org 9', dog_count: 7 },
      { id: 10, name: 'Rescue Org 10', dog_count: 6 },
      { id: 11, name: 'Rescue Org 11', dog_count: 5 },
      { id: 12, name: 'Rescue Org 12', dog_count: 4 }
    ]
  };

  beforeEach(() => {
    require('../../../services/animalsService').getStatistics.mockResolvedValue(mockStatistics);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Statistics Display', () => {
    test('should render main statistics with correct values', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('237')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      expect(screen.getByText('Rescue Organizations')).toBeInTheDocument();
      expect(screen.getByText('Dogs Available')).toBeInTheDocument();
      expect(screen.getByText('Countries')).toBeInTheDocument();
    });

    test('should display statistics with icons', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('trust-section')).toBeInTheDocument();
      });

      // Check for icon presence (data-testid for icons)
      expect(screen.getByTestId('organizations-icon')).toBeInTheDocument();
      expect(screen.getByTestId('dogs-icon')).toBeInTheDocument();
      expect(screen.getByTestId('countries-icon')).toBeInTheDocument();
    });
  });

  describe('Organization List', () => {
    test('should display top organizations with counts', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByText('Pets in Turkey (45)')).toBeInTheDocument();
        expect(screen.getByText('Berlin Rescue (23)')).toBeInTheDocument();
        expect(screen.getByText('Tierschutz EU (32)')).toBeInTheDocument();
        expect(screen.getByText('Happy Tails (18)')).toBeInTheDocument();
      });
    });

    test('should show expand button for additional organizations', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByText('+ 8 more organizations')).toBeInTheDocument();
      });
    });

    test('should make organization names clickable links', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const petsInTurkeyLink = screen.getByText('Pets in Turkey (45)').closest('a');
        expect(petsInTurkeyLink).toHaveAttribute('href', '/dogs?organization=pets-in-turkey');
      });
    });
  });

  describe('Loading and Error States', () => {
    test('should show loading state initially', async () => {
      // Mock delayed response
      require('../../../services/animalsService').getStatistics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockStatistics), 100))
      );

      await act(async () => {
        render(<TrustSection />);
      });

      expect(screen.getByTestId('trust-loading')).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      require('../../../services/animalsService').getStatistics.mockRejectedValue(
        new Error('API Error')
      );

      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load statistics/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and semantic structure', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('should render properly on mobile', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const trustSection = screen.getByTestId('trust-section');
        expect(trustSection).toBeInTheDocument();
        
        // Check container inside section has responsive classes
        const container = trustSection.querySelector('.max-w-7xl');
        expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4');
      });
    });
  });
});