// frontend/src/components/home/__tests__/TrustBand.test.tsx

import React from 'react';
import { render, screen, waitFor } from '../../../test-utils';
import TrustBand from '../TrustBand';
import { getOrganizations } from '../../../services/organizationsService';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock organizations service
jest.mock('../../../services/organizationsService');

const mockGetOrganizations = getOrganizations as jest.MockedFunction<typeof getOrganizations>;

describe('TrustBand', () => {
  const mockOrganizations = [
    { id: 1, name: 'Rescue Org 1', logo_url: '/logos/org1.png' },
    { id: 2, name: 'Rescue Org 2', logo_url: '/logos/org2.png' },
    { id: 3, name: 'Rescue Org 3', logo_url: '/logos/org3.png' },
    { id: 4, name: 'Rescue Org 4', logo_url: '/logos/org4.png' },
    { id: 5, name: 'Rescue Org 5', logo_url: '/logos/org5.png' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    test('should show loading skeleton while fetching', () => {
      mockGetOrganizations.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TrustBand />);

      // Should show loading placeholders
      const placeholders = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-pulse')
      );
      expect(placeholders.length).toBeGreaterThan(0);
    });

    test('should display default count during loading', () => {
      mockGetOrganizations.mockImplementation(
        () => new Promise(() => {})
      );

      render(<TrustBand />);

      expect(
        screen.getByText(/Aggregating rescue dogs from 13 organizations/)
      ).toBeInTheDocument();
    });
  });

  describe('Successful Data Loading', () => {
    test('should render text with organization count', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        expect(
          screen.getByText(/Aggregating rescue dogs from 5 organizations across Europe & UK/)
        ).toBeInTheDocument();
      });
    });

    test('should call getOrganizations service', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        expect(mockGetOrganizations).toHaveBeenCalledTimes(1);
      });
    });

    test('should display organization logos', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        const logo1 = screen.getByAltText('Rescue Org 1');
        expect(logo1).toBeInTheDocument();
        expect(logo1).toHaveAttribute('src', '/logos/org1.png');
      });
    });

    test('should show max 5 logos', async () => {
      const manyOrgs = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Org ${i}`,
        logo_url: `/logo${i}.png`,
      }));

      mockGetOrganizations.mockResolvedValueOnce(manyOrgs);

      render(<TrustBand />);

      await waitFor(() => {
        const logos = screen.getAllByRole('img');
        expect(logos).toHaveLength(5);
      });
    });

    test('should apply grayscale filter to logos', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        const logo = screen.getByAltText('Rescue Org 1');
        expect(logo).toHaveClass('grayscale', 'opacity-60');
      });
    });

    test('should have hover effect on logos', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        const logo = screen.getByAltText('Rescue Org 1');
        expect(logo).toHaveClass('hover:opacity-100', 'hover:grayscale-0', 'transition-all');
      });
    });

    test('should update total count from API', async () => {
      const customOrgs = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Org ${i}`,
        logo_url: `/logo${i}.png`,
      }));

      mockGetOrganizations.mockResolvedValueOnce(customOrgs);

      render(<TrustBand />);

      await waitFor(() => {
        expect(
          screen.getByText(/Aggregating rescue dogs from 20 organizations/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      mockGetOrganizations.mockRejectedValueOnce(new Error('Network error'));

      render(<TrustBand />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to fetch organizations:',
          expect.any(Error)
        );
      });

      // Should still show default text
      expect(
        screen.getByText(/Aggregating rescue dogs from 13 organizations/)
      ).toBeInTheDocument();

      consoleError.mockRestore();
    });

    test('should handle empty organizations array', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);

      render(<TrustBand />);

      await waitFor(() => {
        const logos = screen.queryAllByRole('img');
        expect(logos).toHaveLength(0);
      });
    });

    test('should handle missing logo_url', async () => {
      const orgsWithoutLogos = [
        { id: 1, name: 'Org 1' }, // No logo_url
        { id: 2, name: 'Org 2', logo_url: '/logo.png' },
      ];

      mockGetOrganizations.mockResolvedValueOnce(orgsWithoutLogos);

      render(<TrustBand />);

      await waitFor(() => {
        const logos = screen.queryAllByRole('img');
        expect(logos).toHaveLength(1); // Only the one with logo_url
      });
    });
  });

  describe('Responsive Design', () => {
    test('should have responsive padding', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      const section = container.querySelector('section');
      expect(section).toHaveClass('py-12');
    });

    test('should have centered layout', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toHaveClass('mx-auto', 'px-4', 'text-center');
    });

    test('should allow logos to wrap on smaller screens', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      await waitFor(() => {
        const logosContainer = container.querySelector('.flex-wrap');
        expect(logosContainer).toBeInTheDocument();
      });
    });
  });

  describe('Dark Mode', () => {
    test('should have dark mode classes', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      const section = container.querySelector('section');
      expect(section).toHaveClass('bg-gray-100', 'dark:bg-gray-800');
    });

    test('should have dark mode text colors', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        const text = screen.getByText(/Aggregating rescue dogs from/);
        expect(text).toHaveClass('text-gray-700', 'dark:text-gray-300');
      });
    });
  });

  describe('Accessibility', () => {
    test('should use semantic section element', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    test('should have aria-label on section', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      const { container } = render(<TrustBand />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-label', 'Partner rescue organizations');
    });

    test('should have alt text for all logos', async () => {
      mockGetOrganizations.mockResolvedValueOnce(mockOrganizations);

      render(<TrustBand />);

      await waitFor(() => {
        mockOrganizations.forEach((org) => {
          const logo = screen.getByAltText(org.name);
          expect(logo).toBeInTheDocument();
        });
      });
    });
  });
});