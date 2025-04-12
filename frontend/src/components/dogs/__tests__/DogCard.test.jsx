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
    };
    
    render(<DogCard dog={mockDog} />);
    
    // Check basic information
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    
    // Check that it uses standardized breed
    expect(screen.getByText('Labrador Retriever')).toBeInTheDocument();
    
    // Check that breed group is displayed
    expect(screen.getByText('Sporting')).toBeInTheDocument();
    
    // Check that size is displayed
    expect(screen.getByText('Large')).toBeInTheDocument();
    
    // Check that "View Details" link is present
    const detailsLink = screen.getByText('View Details');
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink.closest('a')).toHaveAttribute('href', '/dogs/1');
  });
  
  test('handles missing data gracefully', () => {
    const incompleteData = {
      id: 2,
      name: 'Max',
      // Missing other fields
    };
    
    render(<DogCard dog={incompleteData} />);
    
    // Should still render with fallback values
    expect(screen.getByText('Max')).toBeInTheDocument();
  });
});