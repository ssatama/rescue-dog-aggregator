// Update src/app/dogs/[id]/__tests__/page.test.jsx:
import React from 'react';
import { render, screen } from '@testing-library/react';
import DogDetailPage from '../page';
import { getDogById } from '../../../../services/dogsService';

// Mock the dogsService
jest.mock('../../../../services/dogsService', () => ({
  getDogById: jest.fn()
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
  useRouter: () => ({ back: jest.fn() })
}));

describe('DogDetailPage Component', () => {
  test('shows loading state initially', () => {
    // Mock the API call but don't resolve it yet
    getDogById.mockImplementation(() => new Promise(() => {}));
    
    render(<DogDetailPage />);
    
    // Should show loading state
    expect(screen.getByTestId('mock-loading')).toBeInTheDocument();
  });
});