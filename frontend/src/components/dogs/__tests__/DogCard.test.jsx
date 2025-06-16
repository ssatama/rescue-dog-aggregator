import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DogCard from '../DogCard';

describe('DogCard Component', () => {
  test('renders dog card with correct information', () => {
    const mockDog = {
      id: 1,
      name: 'Buddy',
      standardized_breed: 'Labrador Retriever',
      breed: 'Lab Mix',
      breed_group: 'Sporting',
      age_text: '2 years',
      age_min_months: 24,
      sex: 'Male',
      standardized_size: 'Large',
      size: 'Large',
      primary_image_url: 'https://example.com/image.jpg',
      status: 'available'
      // Add organization if needed by the card display
      // organization: { city: 'Test City', country: 'TC' }
    };
    
    render(<DogCard dog={mockDog} />);
    
    // Check basic information
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    
    // Check that it uses standardized breed
    expect(screen.getByText('Labrador Retriever')).toBeInTheDocument();
    
    // Check that breed group is displayed
    // *** FIX: Look for "Sporting Group" instead of just "Sporting" ***
    expect(screen.getByText('Sporting Group')).toBeInTheDocument();
    
    // Check that size is displayed (Assuming size is also rendered, if not, remove this)
    // expect(screen.getByText('Large')).toBeInTheDocument(); // Uncomment if size is displayed
    
    // Check that "Adopt {name}" button/link is present
    const adoptButton = screen.getByText(`Adopt ${mockDog.name}`);
    expect(adoptButton).toBeInTheDocument();
    // Check if it's inside a link pointing to the correct dog page
    expect(adoptButton.closest('a')).toHaveAttribute('href', `/dogs/${mockDog.id}`);
  });
  
  test('handles missing data gracefully', () => {
    const incompleteData = {
      id: 2,
      name: 'Max',
      status: 'available', // Add status to avoid unknown status badge
      // Missing other fields like breed
    };
    
    render(<DogCard dog={incompleteData} />);
    
    // Should still render with fallback values
    expect(screen.getByText('Max')).toBeInTheDocument();
    // Should not show breed section when missing
    expect(screen.queryByText('Unknown Breed')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    // Check button text
    expect(screen.getByText('Adopt Max')).toBeInTheDocument();

  });

  test('hides breed when Unknown', () => {
    const dogWithUnknownBreed = {
      id: 3,
      name: 'Luna',
      standardized_breed: 'Unknown',
      breed: 'Unknown',
      status: 'available', // Specify status to avoid status badge interference
    };
    
    render(<DogCard dog={dogWithUnknownBreed} />);
    
    // Should render name
    expect(screen.getByText('Luna')).toBeInTheDocument();
    // Should not show breed line when it's Unknown
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
    // Should still have the adopt button
    expect(screen.getByText('Adopt Luna')).toBeInTheDocument();
  });

  // NEW TESTS FOR ENHANCED FEATURES
  describe('Hover Animations', () => {
    test('applies hover animation classes to card', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
      expect(card).toHaveClass('hover:scale-[1.02]');
      expect(card).toHaveClass('hover:-translate-y-1');
      expect(card).toHaveClass('hover:shadow-xl');
    });

    test('applies smooth transition effects', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
      expect(card).toHaveClass('ease-in-out');
    });
  });

  describe('Organization Badge', () => {
    test('shows organization badge on image when organization exists', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { name: 'Pets in Turkey', city: 'Istanbul', country: 'Turkey' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const orgBadge = screen.getByTestId('organization-badge');
      expect(orgBadge).toBeInTheDocument();
      expect(orgBadge).toHaveTextContent('Pets in Turkey');
      expect(orgBadge).toHaveClass('absolute');
      expect(orgBadge).toHaveClass('bottom-2');
      expect(orgBadge).toHaveClass('right-2');
      expect(orgBadge).toHaveClass('bg-white');
      expect(orgBadge).toHaveClass('text-gray-800');
    });

    test('does not show organization badge when organization is missing', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg'
        // No organization
      };
      
      render(<DogCard dog={mockDog} />);
      
      const orgBadge = screen.queryByTestId('organization-badge');
      expect(orgBadge).not.toBeInTheDocument();
    });

    test('handles long organization names with truncation', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { 
          name: 'Very Long Organization Name That Should Be Truncated',
          city: 'City',
          country: 'Country'
        }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const orgBadge = screen.getByTestId('organization-badge');
      expect(orgBadge).toHaveClass('truncate');
      expect(orgBadge).toHaveClass('max-w-[120px]');
    });
  });

  describe('NEW Badge for Recent Dogs', () => {
    test('shows NEW badge for dogs added within last 7 days', () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 days ago (within 7 days)
      
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: sevenDaysAgo.toISOString(),
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.getByTestId('new-badge');
      expect(newBadge).toBeInTheDocument();
      expect(newBadge).toHaveTextContent('NEW');
      expect(newBadge).toHaveClass('bg-green-500');
      expect(newBadge).toHaveClass('text-white');
      expect(newBadge).toHaveClass('absolute');
      expect(newBadge).toHaveClass('top-2');
      expect(newBadge).toHaveClass('left-2');
    });

    test('does not show NEW badge for dogs older than 7 days', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8); // 8 days ago (older than 7 days)
      
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: eightDaysAgo.toISOString(),
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.queryByTestId('new-badge');
      expect(newBadge).not.toBeInTheDocument();
    });

    test('does not show NEW badge when created_at is missing', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        // No created_at field
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.queryByTestId('new-badge');
      expect(newBadge).not.toBeInTheDocument();
    });

    test('handles invalid created_at dates gracefully', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: 'invalid-date',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.queryByTestId('new-badge');
      expect(newBadge).not.toBeInTheDocument();
    });
  });

  describe('Text Truncation and Consistent Heights', () => {
    test('truncates long dog names', () => {
      const mockDog = {
        id: 1,
        name: 'This is a very long dog name that should be truncated for consistent card heights',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const nameElement = screen.getByTestId('dog-name');
      expect(nameElement).toHaveClass('truncate');
    });

    test('truncates long breed names', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        standardized_breed: 'This is a very long breed name that should be truncated',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const breedElement = screen.getByTestId('dog-breed');
      expect(breedElement).toHaveClass('truncate');
    });

    test('applies consistent height classes to card', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      expect(card).toHaveClass('flex');
      expect(card).toHaveClass('flex-col');
      expect(card).toHaveClass('h-full');
    });
  });

  describe('Badge Positioning and Styling', () => {
    test('NEW badge and organization badge do not overlap', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2); // 2 days ago
      
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: recentDate.toISOString(),
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.getByTestId('new-badge');
      const orgBadge = screen.getByTestId('organization-badge');
      
      // NEW badge should be top-left
      expect(newBadge).toHaveClass('top-2');
      expect(newBadge).toHaveClass('left-2');
      
      // Organization badge should be bottom-right
      expect(orgBadge).toHaveClass('bottom-2');
      expect(orgBadge).toHaveClass('right-2');
    });

    test('badges have proper z-index for layering', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);
      
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: recentDate.toISOString(),
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.getByTestId('new-badge');
      const orgBadge = screen.getByTestId('organization-badge');
      
      expect(newBadge).toHaveClass('z-10');
      expect(orgBadge).toHaveClass('z-10');
    });
  });

  describe('Accessibility Enhancements for New Features', () => {
    test('badges have proper ARIA labels', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);
      
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        created_at: recentDate.toISOString(),
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const newBadge = screen.getByTestId('new-badge');
      const orgBadge = screen.getByTestId('organization-badge');
      
      expect(newBadge).toHaveAttribute('aria-label', 'Recently added dog');
      expect(orgBadge).toHaveAttribute('aria-label', 'Organization: Test Org');
    });

    test('hover animations do not interfere with keyboard navigation', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org', city: 'Test City', country: 'TC' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      const adoptLink = screen.getByText('Adopt Buddy').closest('a');
      
      // Focus should work normally
      adoptLink.focus();
      expect(adoptLink).toHaveFocus();
      
      // Card should still have hover classes
      expect(card).toHaveClass('hover:scale-[1.02]');
    });
  });
});