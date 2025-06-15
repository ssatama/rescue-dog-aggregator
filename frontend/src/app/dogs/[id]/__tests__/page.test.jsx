import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// mock DogDescription component with read more simulation
jest.mock('../../../../components/dogs/DogDescription', () => ({ description, dogName, organizationName }) => {
  const React = require('react');
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (!description) {
    return (
      <div data-testid="dog-description">
        {`${dogName} is looking for a loving forever home. Contact ${organizationName || 'the rescue organization'} to learn more.`}
      </div>
    );
  }
  
  // Simple length check for read more functionality
  const isLong = description.length > 200;
  const displayText = isLong && !isExpanded ? description.substring(0, 200) + '...' : description;
  
  return (
    <div data-testid="dog-description">
      <div data-testid="description-content">{displayText}</div>
      {isLong && (
        <button 
          data-testid="read-more-button" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
});

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
      properties: { 
        weight: '20 lbs', 
        neutered_spayed: true,
        description: 'A wonderful dog looking for a home.'
      },
      sex: 'Male',
      organization: { name: 'Happy Paws Rescue' },
      // …add whatever else you render…
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    // Wait past loading
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Basic assertions - check for main heading specifically
    expect(screen.getByRole('heading', { level: 1, name: /Rover/i })).toBeInTheDocument();
    // image (should be transformed for optimization)
    const imageElement = screen.getByRole('img', { name: /Rover/i });
    const imageSrc = imageElement.getAttribute('src');
    // Should either be the original URL or a Cloudinary-optimized version
    expect(imageSrc).toBeTruthy();
    expect(imageSrc.length).toBeGreaterThan(0);
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
    
    // Should show skeleton loading state
    expect(screen.getByTestId('dog-detail-skeleton')).toBeInTheDocument();
  });
});

describe('DogDetailPage – organization integration', () => {
  it('renders page successfully with organization integration in place', async () => {
    // arrange: return a dog similar to successful tests
    getAnimalById.mockResolvedValue({
      id: 1,
      name: 'Rover',
      standardized_breed: 'Beagle',
      breed_group: 'Hound',
      primary_image_url: 'https://img/rover.jpg',
      status: 'available',
      properties: {},
      sex: 'Male'
    });

    render(<DogDetailPage />);

    // wait for loading to disappear
    await waitFor(() =>
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    );

    // Verify page renders correctly (this proves organization section integration didn't break anything)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /About Rover/i })).toBeInTheDocument();
  });

  it('handles missing organization data gracefully', async () => {
    getAnimalById.mockResolvedValue({
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      sex: 'Male',
      standardized_breed: 'Beagle',
      breed_group: 'Hound',
      properties: {}
      // no organization data at all
    });

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    );

    // Page should render successfully without organization
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    
    // Organization section should not be rendered when no organization data
    expect(screen.queryByTestId('organization-section')).not.toBeInTheDocument();
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

    // Check for favorite button (now uses FavoriteButton component)
    const favoriteButton = screen.getByTestId('header-favorite-button');
    expect(favoriteButton).toBeInTheDocument();

    // Check for share icon (should be in the action bar, not at bottom)
    const actionBar = screen.getByTestId('action-bar');
    expect(actionBar).toBeInTheDocument();
    
    // Both favorite button and share button should be in the action bar
    expect(actionBar).toContainElement(favoriteButton);
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
    expect(screen.getByText('Unknown')).toBeInTheDocument(); // Age (age_text: 'Unknown')
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
    expect(metadataCards).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');

    // Action bar should use flexbox for proper icon alignment
    const actionBar = container.querySelector('[data-testid="action-bar"]');
    expect(actionBar).toHaveClass('flex', 'items-center');
  });
});

describe('DogDetailPage - Enhanced Description Section', () => {
  it('always displays About section with proper header', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should always show About section
    const aboutSection = screen.getByTestId('about-section');
    expect(aboutSection).toBeInTheDocument();
    
    // Should have proper header
    expect(screen.getByRole('heading', { level: 2, name: 'About Rover' })).toBeInTheDocument();
  });

  it('displays description content when description exists', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: 'A lovely dog who loves to play' },
      sex: 'Male',
      organization: { name: 'Test Rescue' }
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should display description content using new component
    const descriptionComponent = screen.getByTestId('dog-description');
    expect(descriptionComponent).toBeInTheDocument();
    expect(descriptionComponent).toHaveTextContent('A lovely dog who loves to play');
  });

  it('shows empty state message when no description exists', async () => {
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: {}, // No description
      sex: 'Male',
      organization: { name: 'Test Rescue' }
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should show fallback message using new component
    const descriptionComponent = screen.getByTestId('dog-description');
    expect(descriptionComponent).toBeInTheDocument();
    expect(descriptionComponent).toHaveTextContent(/Rover is looking for a loving forever home/);
  });

  it('shows read more button for long descriptions', async () => {
    const longDescription = 'A lovely dog who loves to play and run around. '.repeat(10); // > 200 chars
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: longDescription },
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should show read more button
    const readMoreButton = screen.getByTestId('read-more-button');
    expect(readMoreButton).toBeInTheDocument();
    expect(readMoreButton).toHaveTextContent('Read more');
  });

  it('does not show read more button for short descriptions', async () => {
    const shortDescription = 'A lovely dog'; // < 200 chars
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: shortDescription },
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should not show read more button
    const readMoreButton = screen.queryByTestId('read-more-button');
    expect(readMoreButton).not.toBeInTheDocument();
  });

  it('expands and collapses description when read more is clicked', async () => {
    const longDescription = 'A lovely dog who loves to play and run around. '.repeat(10);
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: longDescription },
      sex: 'Male',
    };
    getAnimalById.mockResolvedValue(mockDog);

    const user = userEvent.setup();

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    const readMoreButton = screen.getByTestId('read-more-button');
    
    // Initially should show "Read more"
    expect(readMoreButton).toHaveTextContent('Read more');
    
    // Click to expand
    await user.click(readMoreButton);
    
    // Should now show "Show less"
    expect(readMoreButton).toHaveTextContent('Show less');
    
    // Click to collapse
    await user.click(readMoreButton);
    
    // Should show "Read more" again
    expect(readMoreButton).toHaveTextContent('Read more');
  });

  it('handles HTML content safely in descriptions', async () => {
    const htmlDescription = '<p>A lovely <strong>dog</strong> who loves to play</p>';
    const mockDog = {
      id: 1,
      name: 'Rover',
      primary_image_url: 'https://img.test/rover.jpg',
      status: 'available',
      properties: { description: htmlDescription },
      sex: 'Male',
      organization: { name: 'Test Rescue' }
    };
    getAnimalById.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Should display content using new component (with HTML tags shown in mock)
    const descriptionComponent = screen.getByTestId('dog-description');
    expect(descriptionComponent).toBeInTheDocument();
    expect(descriptionComponent).toHaveTextContent('<p>A lovely <strong>dog</strong> who loves to play</p>');
  });
});

describe('DogDetailPage - CTA Button Placement (TDD)', () => {
  it('displays CTA button immediately after About section', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
      adoption_url: 'https://example.com/adopt/shadow'
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Find About section and CTA button
    const aboutSection = screen.getByTestId('about-section');
    const ctaButton = screen.getByRole('link', { name: /Start Adoption Process/i });
    
    expect(aboutSection).toBeInTheDocument();
    expect(ctaButton).toBeInTheDocument();

    // CTA button should come after About section in DOM order
    expect(aboutSection.compareDocumentPosition(ctaButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('displays CTA button before Organization section', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
      adoption_url: 'https://example.com/adopt/shadow',
      organization: { name: 'Test Rescue', id: 1 },
      organization_id: 1
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Find CTA button and organization section
    const ctaButton = screen.getByRole('link', { name: /Start Adoption Process/i });
    const organizationSection = screen.getByTestId('organization-section');
    
    expect(ctaButton).toBeInTheDocument();
    expect(organizationSection).toBeInTheDocument();

    // CTA button should come before organization section in DOM order
    expect(ctaButton.compareDocumentPosition(organizationSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('displays CTA button before Related Dogs section', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
      adoption_url: 'https://example.com/adopt/shadow',
      organization: { name: 'Test Rescue', id: 1 },
      organization_id: 1
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Find CTA button and related dogs section
    const ctaButton = screen.getByRole('link', { name: /Start Adoption Process/i });
    const relatedDogsSection = screen.getByTestId('related-dogs-section');
    
    expect(ctaButton).toBeInTheDocument();
    expect(relatedDogsSection).toBeInTheDocument();

    // CTA button should come before related dogs section in DOM order
    expect(ctaButton.compareDocumentPosition(relatedDogsSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has proper spacing around CTA button', async () => {
    const mockDog = {
      id: 1,
      name: 'Shadow',
      primary_image_url: 'https://img.test/shadow.jpg',
      status: 'available',
      properties: { description: 'A lovely dog' },
      sex: 'Male',
      adoption_url: 'https://example.com/adopt/shadow'
    };
    getAnimalById.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    // Find CTA container - should have proper margin classes
    const ctaContainer = container.querySelector('[data-testid="cta-section"]');
    expect(ctaContainer).toBeInTheDocument();
    expect(ctaContainer).toHaveClass('mb-8');
  });
});