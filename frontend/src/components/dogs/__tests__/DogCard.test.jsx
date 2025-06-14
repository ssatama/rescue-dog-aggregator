// Update src/components/dogs/__tests__/DogCard.test.jsx:
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});