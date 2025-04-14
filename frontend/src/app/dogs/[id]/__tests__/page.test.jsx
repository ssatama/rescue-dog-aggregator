// Update src/app/dogs/[id]/__tests__/page.test.jsx:
import React from 'react';
import { render, screen } from '@testing-library/react';
import DogDetailPage from '../page';
// *** FIX: Import correct function name ***
import { getAnimalById } from '../../../../services/animalsService'; // Changed from dogsService and getDogById

// *** FIX: Mock correct service file path ***
jest.mock('../../../../services/animalsService', () => ({ // Changed from dogsService
  // *** FIX: Mock correct function name ***
  getAnimalById: jest.fn() // Changed from getDogById
}));

// Mock the Loading component
jest.mock('../../../../components/ui/Loading', () => {
  return function MockLoading() {
    return <div data-testid="mock-loading">Loading...</div>;
  };
});

// Mock useParams
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: jest.fn(() => '/dogs/1'), // <<< Add mock for usePathname
}));

describe('DogDetailPage Component', () => {
  test('shows loading state initially', () => {
    // *** FIX: Mock correct function name ***
    getAnimalById.mockImplementation(() => new Promise(() => {})); // Changed from getDogById
    
    render(<DogDetailPage />);
    
    // Should show loading state
    expect(screen.getByTestId('mock-loading')).toBeInTheDocument();
  });

  // Add other tests as needed...
});