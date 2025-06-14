import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DogDetailPage from '../page';
import { getAnimalById } from '../../../../services/animalsService';

// mock the service
jest.mock('../../../../services/animalsService', () => ({
  getAnimalById: jest.fn()
}));

// mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => '/dogs/1',
  useSearchParams: () => ({ get: () => null }),
}));

// mock Loading
jest.mock('../../../../components/ui/Loading', () => () => <div data-testid="loading"/>);

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
    // breed + group (may appear in multiple places now)
    expect(screen.getAllByText('Beagle').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hound Group')).toBeInTheDocument();
    // sex (appears in metadata cards)
    expect(screen.getAllByText(/Male/i).length).toBeGreaterThanOrEqual(1);
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

describe('DogDetailPage – share buttons', () => {
  it('renders SocialMediaLinks with the org social_media URLs', async () => {
    // arrange: return a dog whose organization.social_media has two links
    getAnimalById.mockResolvedValueOnce({
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img/rover.jpg',
      status: 'available',
      sex: 'Male',
      standardized_breed: 'Beagle',
      breed_group: 'Hound',
      properties: {},
      organization: {
        id: 2,
        name: 'Pets in Turkey',
        social_media: {
          facebook: 'https://fb.test/pets',
          instagram: 'https://insta.test/pets'
        }
      }
    });

    render(<DogDetailPage />);

    // wait for loading to disappear
    await waitFor(() =>
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    );

    // now the share links should be in the document
    expect(
      screen.getByRole('link', { name: /facebook/i })
    ).toHaveAttribute('href', 'https://fb.test/pets');

    expect(
      screen.getByRole('link', { name: /instagram/i })
    ).toHaveAttribute('href', 'https://insta.test/pets');
  });

  it('does not render share links when organization.social_media is empty', async () => {
    getAnimalById.mockResolvedValueOnce({
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      sex: 'Male',
      standardized_breed: 'Beagle',
      breed_group: 'Hound',
      properties: {},
      organization: {
        id: 2,
        name: 'Pets in Turkey',
        social_media: {}   // ← empty
      }
    });

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    );

    // no social links
    expect(screen.queryByRole('link', { name: /facebook/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /instagram/i })).toBeNull();
  });
});

describe('DogDetailPage - Breed Display', () => {
  it('hides breed section when breed is Unknown', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      breed: 'Unknown',
      standardized_breed: 'Unknown',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should not show breed section at all when Unknown
    expect(screen.queryByText('Breed')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('hides breed section when breed is missing', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      breed: null,
      standardized_breed: null,
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should not show breed section when breed is missing
    expect(screen.queryByText('Breed')).not.toBeInTheDocument();
  });

  it('shows known breed normally', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      breed: 'Golden Retriever',
      standardized_breed: 'Golden Retriever',
      breed_group: 'Sporting',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should show actual breed (may appear in multiple places now)
    expect(screen.getAllByText('Golden Retriever').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sporting Group')).toBeInTheDocument();
  });
});

describe('DogDetailPage - Hero Layout', () => {
  it('displays hero image above content in vertical layout', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      breed: 'Golden Retriever',
      standardized_breed: 'Golden Retriever',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
      organization: { name: 'Test Rescue', id: 1 }
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Check that main content container uses vertical layout (flex-col)
    const mainContent = container.querySelector('.flex.flex-col');
    expect(mainContent).toBeInTheDocument();

    // Hero image should come before text content
    const image = screen.getByRole('img', { name: /Rover/i });
    const heading = screen.getByRole('heading', { level: 1, name: /Rover/i });
    
    // Image should come before heading in DOM order
    expect(image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses full-width hero image container', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Hero image container should be full width
    const heroContainer = container.querySelector('[data-testid="hero-image-container"]');
    expect(heroContainer).toBeInTheDocument();
    expect(heroContainer).toHaveClass('w-full');
  });

  it('displays breadcrumb navigation above hero image', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Check breadcrumb navigation - look within the breadcrumb nav specifically
    const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumbNav).toBeInTheDocument();
    
    // Within the breadcrumb, check for the links and text
    const homeLinks = screen.getAllByText('Home');
    const findDogsLinks = screen.getAllByText('Find Dogs');
    const shadowTexts = screen.getAllByText('Shadow');
    
    // There should be at least one of each (breadcrumb + possibly header)
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(findDogsLinks.length).toBeGreaterThanOrEqual(1);
    expect(shadowTexts.length).toBeGreaterThanOrEqual(1);

    // Check specific breadcrumb links by finding within breadcrumb nav
    const homeLink = screen.getByRole('link', { name: 'Home' });
    const dogsLinks = screen.getAllByRole('link', { name: 'Find Dogs' });
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(dogsLinks[0]).toHaveAttribute('href', '/dogs');
  });

  it('displays heart and share icons in top-right of content area', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Check for heart icon
    const heartIcon = screen.getByTestId('heart-icon');
    expect(heartIcon).toBeInTheDocument();

    // Check for share icon (should be in the action bar, not at bottom)
    const actionBar = screen.getByTestId('action-bar');
    expect(actionBar).toBeInTheDocument();
    
    // Both icons should be in the action bar
    expect(actionBar).toContainElement(heartIcon);
  });

  it('displays metadata cards with icons in new layout', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
      age_text: 'Unknown',
      standardized_breed: 'Terrier Mix',
      standardized_size: 'Medium Size',
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Check for metadata cards container
    const metadataCards = container.querySelector('[data-testid="metadata-cards"]');
    expect(metadataCards).toBeInTheDocument();

    // Check for individual metadata badges - using getAllByText for items that appear multiple times
    expect(screen.getByText('Unknown')).toBeInTheDocument(); // Age
    expect(screen.getByText('Male')).toBeInTheDocument(); // Gender
    expect(screen.getAllByText('Terrier Mix').length).toBeGreaterThanOrEqual(1); // Breed (appears in multiple places)
    expect(screen.getByText('Medium Size')).toBeInTheDocument(); // Size
  });

  it('maintains responsive layout structure on all screen sizes', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: {},
      sex: 'Male',
      standardized_breed: 'Terrier Mix',
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Hero image should always be full width
    const heroContainer = container.querySelector('[data-testid="hero-image-container"]');
    expect(heroContainer).toHaveClass('w-full');

    // Main layout should be flex-col (vertical) on all screen sizes
    const mainLayout = container.querySelector('.flex.flex-col.gap-8');
    expect(mainLayout).toBeInTheDocument();

    // Metadata cards should use grid layout
    const metadataCards = container.querySelector('[data-testid="metadata-cards"]');
    expect(metadataCards).toHaveClass('grid', 'grid-cols-2');

    // Action bar should use flexbox for proper icon alignment
    const actionBar = container.querySelector('[data-testid="action-bar"]');
    expect(actionBar).toHaveClass('flex', 'items-center');
  });
});