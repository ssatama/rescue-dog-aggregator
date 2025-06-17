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
    countries: [
      { country: 'Turkey', count: 150 },
      { country: 'United States', count: 87 }
    ],
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
        expect(screen.getByText('Pets in Turkey')).toBeInTheDocument();
        expect(screen.getByText('45 dogs')).toBeInTheDocument();
        expect(screen.getByText('Berlin Rescue')).toBeInTheDocument();
        expect(screen.getByText('23 dogs')).toBeInTheDocument();
        expect(screen.getByText('Tierschutz EU')).toBeInTheDocument();
        expect(screen.getByText('32 dogs')).toBeInTheDocument();
        expect(screen.getByText('Happy Tails')).toBeInTheDocument();
        expect(screen.getByText('18 dogs')).toBeInTheDocument();
      });
    });

    test('should show expand button for additional organizations', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        expect(screen.getByText('+ 4 more organizations')).toBeInTheDocument();
      });
    });

    test('should make organization names clickable links', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const petsInTurkeyCard = screen.getByText('Pets in Turkey').closest('a');
        expect(petsInTurkeyCard).toHaveAttribute('href', '/organizations/1');
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

      expect(screen.getByTestId('trust-stats-skeleton')).toBeInTheDocument();
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

  describe('Visual Enhancement', () => {
    test('should have dot pattern background', async () => {
      await act(async () => {
        render(<TrustSection />);
      });
      
      const section = screen.getByTestId('trust-section');
      expect(section).toHaveClass('bg-dot-pattern');
    });

    test('should display organization cards with icons', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const orgCards = screen.getAllByTestId('organization-card');
        expect(orgCards.length).toBeGreaterThan(0);
        
        // Each card should have building icon
        orgCards.forEach(card => {
          expect(card.querySelector('[data-testid="building-icon"]')).toBeInTheDocument();
        });
      });
    });

    test('should have proper hover states for organization cards', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const firstCard = screen.getAllByTestId('organization-card')[0];
        expect(firstCard).toHaveClass('hover:border-blue-500', 'hover:shadow-md');
        expect(firstCard).toHaveClass('transition-all', 'duration-300');
      });
    });

    test('should show organization cards in responsive grid', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const grid = screen.getByTestId('organizations-grid');
        expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');
      });
    });

    test('should have proper touch targets for accessibility', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const orgCards = screen.getAllByTestId('organization-card');
        orgCards.forEach(card => {
          expect(card).toHaveClass('min-h-[48px]');
        });
      });
    });

    test('should link to filtered dog pages', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const firstCard = screen.getAllByTestId('organization-card')[0];
        const link = firstCard.closest('a');
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).toMatch(/\/organizations\/\d+/);
      });
    });

    test('should have top border gradient', async () => {
      await act(async () => {
        render(<TrustSection />);
      });

      const section = screen.getByTestId('trust-section');
      expect(section).toHaveClass('relative');
      
      // Check for the gradient border element
      const gradientBorder = section.querySelector('.absolute.top-0');
      expect(gradientBorder).toBeInTheDocument();
    });

    test('should limit to top 8 organizations in grid', async () => {
      // Mock more organizations
      const manyOrgsStats = {
        ...mockStatistics,
        organizations: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          name: `Organization ${i + 1}`,
          dog_count: 50 - i
        }))
      };

      require('../../../services/animalsService').getStatistics.mockResolvedValue(manyOrgsStats);

      await act(async () => {
        render(<TrustSection />);
      });

      await waitFor(() => {
        const orgCards = screen.getAllByTestId('organization-card');
        expect(orgCards).toHaveLength(8); // Should limit to 8
        
        // Should show remaining count
        expect(screen.getByText('+ 7 more organizations')).toBeInTheDocument();
      });
    });
  });
});