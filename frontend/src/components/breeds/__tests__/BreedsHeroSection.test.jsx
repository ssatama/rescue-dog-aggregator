import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BreedsHeroSection from '../BreedsHeroSection';

describe('BreedsHeroSection', () => {
  const mockMixedBreedData = {
    primary_breed: 'Mixed Breed',
    breed_slug: 'mixed-breed',
    count: 1462,
    sample_dogs: [
      {
        name: 'Luna',
        slug: 'luna-123',
        primary_image_url: 'https://example.com/luna.jpg',
        age_text: '2 years',
        sex: 'Female',
        personality_traits: ['Playful', 'Friendly']
      },
      {
        name: 'Max',
        slug: 'max-456',
        primary_image_url: 'https://example.com/max.jpg',
        age_text: '3 years',
        sex: 'Male',
        personality_traits: ['Calm', 'Loyal']
      },
      {
        name: 'Bella',
        slug: 'bella-789',
        primary_image_url: 'https://example.com/bella.jpg',
        age_text: '1 year',
        sex: 'Female',
        personality_traits: ['Energetic', 'Smart']
      }
    ]
  };

  it('renders hero section with title and subtitle', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    expect(screen.getByText('Every Dog is Unique')).toBeInTheDocument();
    expect(screen.getByText(/one-of-a-kind mixed breed companions/i)).toBeInTheDocument();
  });

  it('displays statistics correctly', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('Mixed Breeds')).toBeInTheDocument();
    
    expect(screen.getByText('54%')).toBeInTheDocument();
    expect(screen.getByText('Of All Dogs')).toBeInTheDocument();
    
    expect(screen.getByText('∞')).toBeInTheDocument();
    expect(screen.getByText('Unique Personalities')).toBeInTheDocument();
  });

  it('displays sample dog cards with images', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Bella')).toBeInTheDocument();
    
    const lunaImage = screen.getByAltText('Luna');
    expect(lunaImage).toHaveAttribute('src', expect.stringContaining('luna.jpg'));
    
    const maxImage = screen.getByAltText('Max');
    expect(maxImage).toHaveAttribute('src', expect.stringContaining('max.jpg'));
  });

  it('displays personality traits for each dog', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    expect(screen.getByText('Playful')).toBeInTheDocument();
    expect(screen.getByText('Friendly')).toBeInTheDocument();
    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(screen.getByText('Loyal')).toBeInTheDocument();
  });

  it('renders CTA button with correct link', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    const ctaButton = screen.getByRole('link', { name: /Explore Mixed Breeds/i });
    expect(ctaButton).toHaveAttribute('href', '/breeds/mixed');
  });

  it('handles missing sample dogs gracefully', () => {
    const dataWithoutDogs = {
      ...mockMixedBreedData,
      sample_dogs: []
    };
    
    render(<BreedsHeroSection mixedBreedData={dataWithoutDogs} totalDogs={2717} />);
    
    expect(screen.getByText('Every Dog is Unique')).toBeInTheDocument();
    expect(screen.getByText('1.5K')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    render(<BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />);
    
    const percentage = Math.round((1462 / 2717) * 100);
    expect(screen.getByText(`${percentage}%`)).toBeInTheDocument();
  });

  it('applies responsive classes for mobile', () => {
    const { container } = render(
      <BreedsHeroSection mixedBreedData={mockMixedBreedData} totalDogs={2717} />
    );
    
    const heroSection = container.querySelector('[data-testid="hero-section"]');
    expect(heroSection).toHaveClass('px-4', 'md:px-6');
  });
});