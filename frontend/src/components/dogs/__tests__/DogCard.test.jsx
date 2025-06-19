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
    
    // Check that "Learn More →" button/link is present
    const ctaButton = screen.getByText('Learn More →');
    expect(ctaButton).toBeInTheDocument();
    // Check if it's inside a link pointing to the correct dog page
    expect(ctaButton.closest('a')).toHaveAttribute('href', `/dogs/${mockDog.id}`);
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
    expect(screen.getByText('Learn More →')).toBeInTheDocument();

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
    // Should still have the learn more button
    expect(screen.getByText('Learn More →')).toBeInTheDocument();
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
      // Check for new animation system classes
      expect(card).toHaveClass('animate-card-hover');
      expect(card).toHaveClass('will-change-transform');
      expect(card).toHaveClass('group');
      expect(card).toHaveClass('rounded-lg');
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
      // Test that the new animation classes are present
      expect(card).toHaveClass('animate-card-hover');
      expect(card).toHaveClass('will-change-transform');
      // The CSS transitions are defined in globals.css via .animate-card-hover
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
      const ctaLink = screen.getByText('Learn More →').closest('a');
      
      // Focus should work normally
      ctaLink.focus();
      expect(ctaLink).toHaveFocus();
      
      // Card should have animation classes (shadow effects are in CSS)
      expect(card).toHaveClass('animate-card-hover');
    });
  });

  // NEW TESTS FOR ENHANCED FEATURES (Session 5)
  describe('Enhanced Card Features', () => {
    test('displays larger image with correct dimensions', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      // Image might be in placeholder state, check for either real image or placeholder
      const imageContainer = screen.getByTestId('image-placeholder') || screen.getByAltText('Buddy');
      expect(imageContainer).toBeInTheDocument();
      
      // Check for height classes on the actual image or placeholder
      const hasCorrectClasses = imageContainer.className.includes('h-50') && 
                               imageContainer.className.includes('sm:h-50') && 
                               imageContainer.className.includes('md:h-60');
      expect(hasCorrectClasses).toBeTruthy();
    });

    test('displays dog name prominently', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const nameElement = screen.getByTestId('dog-name');
      expect(nameElement).toHaveClass('text-xl');
      expect(nameElement).toHaveClass('font-semibold');
    });

    test('displays age category with formatted age', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        age_min_months: 18, // Should be categorized as 'Young'
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      expect(screen.getByTestId('age-category')).toHaveTextContent('Young');
      expect(screen.getByTestId('formatted-age')).toHaveTextContent('1 year, 6 months');
    });

    test('displays gender with icon', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        sex: 'Male',
        age_min_months: 24, // Need age for the age/gender row to display
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const genderElement = screen.getByTestId('gender-display');
      expect(genderElement).toHaveTextContent('♂️Male');
    });

    test('displays organization name as location proxy', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Pets in Turkey', city: 'Istanbul', country: 'Turkey' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const locationElement = screen.getByTestId('location-display');
      expect(locationElement).toHaveTextContent('Pets in Turkey');
    });

    test('displays ships-to countries with flags', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { 
          name: 'Test Org',
          ships_to: ['DE', 'NL', 'BE', 'FR'] 
        }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const shipsToElement = screen.getByTestId('ships-to-display');
      expect(shipsToElement).toBeInTheDocument();
      // Flags should be rendered as part of the ships-to component
    });

    test('displays Learn More CTA button', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const ctaButton = screen.getByText('Learn More →');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton.closest('a')).toHaveAttribute('href', '/dogs/1');
    });
  });

  describe('Enhanced Card Responsive Design', () => {
    test('applies mobile-specific classes for smaller screens', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      // Image might be in placeholder state
      const imageElement = screen.queryByAltText('Buddy') || screen.getByTestId('image-placeholder');
      expect(imageElement).toBeInTheDocument();
      expect(imageElement.className).toContain('object-cover');
    });

    test('maintains aspect ratio for images', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      // Image might be in placeholder state
      const imageElement = screen.queryByAltText('Buddy') || screen.getByTestId('image-placeholder');
      expect(imageElement.className).toContain('object-cover');
    });
  });

  describe('Enhanced Hover Effects', () => {
    test('applies enhanced hover effects to image and card', () => {
      const mockDog = {
        id: 1,
        name: 'Buddy',
        status: 'available',
        primary_image_url: 'https://example.com/image.jpg',
        organization: { name: 'Test Org' }
      };
      
      render(<DogCard dog={mockDog} />);
      
      const card = screen.getByTestId('dog-card');
      
      // Card should have new animation system classes
      expect(card).toHaveClass('animate-card-hover');
      expect(card).toHaveClass('will-change-transform');
      
      // Image should have hover scale effect (check placeholder if image not loaded)
      const imageElement = screen.queryByAltText('Buddy') || screen.getByTestId('image-placeholder');
      expect(imageElement.className).toContain('group-hover:scale-102');
      expect(imageElement.className).toContain('transition-transform');
    });
  });
});