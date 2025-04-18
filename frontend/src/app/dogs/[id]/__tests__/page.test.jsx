// first, mock the service so getAnimalById is a jest.fn()
jest.mock('../../../../services/animalsService', () => ({
  getAnimalById: jest.fn()
}));

// next, mock Loading
jest.mock('../../../../components/ui/Loading', () => () => <div data-testid="loading"/>);

// and mock next/navigation (must include usePathname so Header won't crash)
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => '/dogs/1',
  useSearchParams: () => ({ get: () => null }),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DogDetailPage from '../page';
import { getAnimalById } from '../../../../services/animalsService';
import '@testing-library/jest-dom';

// suppress React/console error noise during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

describe('DogDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders full animal details when API succeeds', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      standardized_breed: 'Beagle',
      breed_group: 'Hound',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { weight: '20 lbs', neutered_spayed: true },
      sex: 'Male',
      // …add whatever else you render…
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    // Wait past loading
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Basic assertions
    expect(screen.getByRole('heading', { name: /Rover/i })).toBeInTheDocument();
    // image
    expect(screen.getByRole('img', { name: /Rover/i })).toHaveAttribute('src', mockDog.primary_image_url);
    // breed + group
    expect(screen.getByText('Beagle')).toBeInTheDocument();
    expect(screen.getByText('Hound Group')).toBeInTheDocument();
    // weight & sex
    expect(screen.getByText(/20 lbs/i)).toBeInTheDocument();
    expect(screen.getByText(/Male/i)).toBeInTheDocument();
  });

  it('shows an error message when API returns 404', async () => {
    // simulate any rejection
    getAnimalById.mockRejectedValue(new Error('Not Found'));

    render(<DogDetailPage />);

    await waitFor(() => {
      // The page’s AlertTitle is "Dog Not Found"
      expect(screen.getByText(/Dog Not Found/i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    getAnimalById.mockImplementation(() => new Promise(() => {}));
    
    render(<DogDetailPage />);
    
    // Should show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});