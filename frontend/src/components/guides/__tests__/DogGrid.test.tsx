import { render, screen, waitFor } from '@testing-library/react';
import { DogGrid } from '../DogGrid';
import * as serverAnimalsService from '@/services/serverAnimalsService';
import { ToastProvider } from '@/contexts/ToastContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';

// Mock the serverAnimalsService
jest.mock('@/services/serverAnimalsService');

// Wrapper with required providers (ToastProvider must be outer since FavoritesProvider uses useToast)
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <FavoritesProvider>{children}</FavoritesProvider>
  </ToastProvider>
);

const mockDogs = [
  {
    id: 1,
    name: 'Buddy',
    slug: 'buddy',
    breed: 'Galgo',
    size: 'large',
    age_category: 'adult',
    location_country: 'ES',
    images: [{ image_url: '/buddy.jpg' }],
  },
  {
    id: 2,
    name: 'Luna',
    slug: 'luna',
    breed: 'Podenco',
    size: 'medium',
    age_category: 'young',
    location_country: 'ES',
    images: [{ image_url: '/luna.jpg' }],
  },
];

describe('DogGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeletons initially', () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<DogGrid breed="galgo" limit={4} />);

    // Should show 4 skeleton loaders
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('fetches and displays dogs', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue(mockDogs);

    render(<DogGrid breed="galgo" limit={2} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Buddy')).toBeInTheDocument();
      expect(screen.getByText('Luna')).toBeInTheDocument();
    });
  });

  it('passes correct API parameters', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(
      <DogGrid
        breed="galgo"
        location_country="ES"
        size="large"
        age="adult"
        limit={4}
      />
    );

    await waitFor(() => {
      expect(serverAnimalsService.getAnimals).toHaveBeenCalledWith({
        breed: 'galgo',
        location_country: 'ES',
        size: 'large',
        age: 'adult',
        limit: 4,
        status: 'available',
      });
    });
  });

  it('shows empty state when no dogs match', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid breed="rare-breed" limit={4} />);

    await waitFor(() => {
      expect(screen.getByText(/Currently no rare-breed available/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse all rare-breed/i)).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<DogGrid breed="galgo" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load dogs/i)).toBeInTheDocument();
    });
  });

  it('displays caption when provided', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue(mockDogs);

    render(<DogGrid breed="galgo" caption="Galgos available for adoption" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Galgos available for adoption')).toBeInTheDocument();
    });
  });

  it('renders in grid layout by default', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue(mockDogs);

    const { container } = render(<DogGrid breed="galgo" />, { wrapper: Wrapper });

    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });
  });

  it('renders in carousel layout when specified', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue(mockDogs);

    const { container } = render(<DogGrid breed="galgo" layout="carousel" />, { wrapper: Wrapper });

    await waitFor(() => {
      const carousel = container.querySelector('.flex.gap-4.overflow-x-auto');
      expect(carousel).toBeInTheDocument();
    });
  });

  it('provides fallback link in empty state', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid breed="galgo" />);

    await waitFor(() => {
      const link = screen.getByText(/Browse all/i);
      expect(link).toHaveAttribute('href', '/breeds/galgo');
    });
  });

  it('uses generic fallback link when no breed specified', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid size="small" />);

    await waitFor(() => {
      const link = screen.getByText(/Browse all/i);
      expect(link).toHaveAttribute('href', '/dogs');
    });
  });

  it('defaults to available status', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid breed="galgo" />);

    await waitFor(() => {
      expect(serverAnimalsService.getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'available' })
      );
    });
  });

  it('supports custom status parameter', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid breed="galgo" status="all" />);

    await waitFor(() => {
      expect(serverAnimalsService.getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'all' })
      );
    });
  });

  it('only includes defined parameters in API call', async () => {
    (serverAnimalsService.getAnimals as jest.Mock).mockResolvedValue([]);

    render(<DogGrid breed="galgo" limit={4} />);

    await waitFor(() => {
      const call = (serverAnimalsService.getAnimals as jest.Mock).mock.calls[0][0];
      expect(call).toHaveProperty('breed', 'galgo');
      expect(call).toHaveProperty('limit', 4);
      expect(call).toHaveProperty('status', 'available');
      expect(call).not.toHaveProperty('size');
      expect(call).not.toHaveProperty('age');
    });
  });
});
