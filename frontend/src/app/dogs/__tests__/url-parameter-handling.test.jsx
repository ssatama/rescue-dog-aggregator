// TDD Red Phase: Failing tests for URL parameter handling in dogs page
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import DogsPage from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock the services
jest.mock('../../../services/animalsService', () => ({
  getAnimals: jest.fn(() => Promise.resolve([])),
  getStandardizedBreeds: jest.fn(() => Promise.resolve([])),
  getLocationCountries: jest.fn(() => Promise.resolve([])),
  getAvailableCountries: jest.fn(() => Promise.resolve([])),
  getAvailableRegions: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../../services/organizationsService', () => ({
  getOrganizations: jest.fn(() => Promise.resolve([
    { id: null, name: "Any organization" },
    { id: 123, name: "REAN (Rescuing European Animals in Need)" },
    { id: 456, name: "Pets in Turkey" }
  ])),
}));

// Mock components to avoid complex rendering
jest.mock('../../../components/layout/Layout', () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock('../../../components/filters/DesktopFilters', () => {
  return function MockDesktopFilters({ organizationFilter }) {
    return (
      <div data-testid="filter-controls">
        Organization Filter: {organizationFilter}
      </div>
    );
  };
});

describe('DogsPage URL Parameter Handling', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParams.mockReturnValue(mockSearchParams);
  });

  describe('organization_id URL parameter', () => {
    it('should initialize organization filter from organization_id URL parameter', async () => {
      // Arrange
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'organization_id') return '123';
        return null;
      });

      // Act
      render(<DogsPage />);

      // Assert
      await waitFor(() => {
        const filterControls = screen.getByTestId('filter-controls');
        expect(filterControls).toHaveTextContent('Organization Filter: 123');
      });
    });

    it('should handle invalid organization_id gracefully', async () => {
      // Arrange
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'organization_id') return 'invalid-id';
        return null;
      });

      // Act
      render(<DogsPage />);

      // Assert
      await waitFor(() => {
        const filterControls = screen.getByTestId('filter-controls');
        // Should fallback to default "any" when organization doesn't exist
        expect(filterControls).toHaveTextContent('Organization Filter: any');
      });
    });

    it('should default to "any" when no organization_id parameter provided', async () => {
      // Arrange
      mockSearchParams.get.mockReturnValue(null);

      // Act
      render(<DogsPage />);

      // Assert
      await waitFor(() => {
        const filterControls = screen.getByTestId('filter-controls');
        expect(filterControls).toHaveTextContent('Organization Filter: any');
      });
    });

    it('should validate organization exists before setting filter', async () => {
      // Arrange
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'organization_id') return '999'; // Non-existent organization
        return null;
      });

      // Act
      render(<DogsPage />);

      // Assert
      await waitFor(() => {
        const filterControls = screen.getByTestId('filter-controls');
        // Should fallback to "any" for non-existent organization
        expect(filterControls).toHaveTextContent('Organization Filter: any');
      });
    });

    it('should handle organization_id parameter with valid existing organization', async () => {
      // Arrange
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'organization_id') return '456'; // Pets in Turkey
        return null;
      });

      // Act
      render(<DogsPage />);

      // Assert
      await waitFor(() => {
        const filterControls = screen.getByTestId('filter-controls');
        expect(filterControls).toHaveTextContent('Organization Filter: 456');
      });
    });

    it('should read URL parameters on component mount', () => {
      // Arrange
      mockSearchParams.get.mockReturnValue(null);

      // Act
      render(<DogsPage />);

      // Assert
      expect(mockSearchParams.get).toHaveBeenCalledWith('organization_id');
    });
  });
});