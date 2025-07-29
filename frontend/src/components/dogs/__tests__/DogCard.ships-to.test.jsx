import React from 'react';
import { render, screen } from '@testing-library/react';
import DogCard from '../DogCard';

describe('DogCard Adoption Availability Feature', () => {
  const mockDogWithSingleCountry = {
    id: 1,
    name: 'Lucky',
    status: 'available',
    primary_image_url: 'https://example.com/lucky.jpg',
    organization: {
      name: 'REAN',
      ships_to: ['UK']
    }
  };

  const mockDogWithMultipleCountries = {
    id: 2,
    name: 'Max',
    status: 'available',
    primary_image_url: 'https://example.com/max.jpg',
    organization: {
      name: 'Berlin Rescue',
      ships_to: ['DE', 'NL', 'BE', 'FR', 'IT', 'ES']
    }
  };

  const mockDogWithoutShipsTo = {
    id: 3,
    name: 'Bella',
    status: 'available',
    primary_image_url: 'https://example.com/bella.jpg',
    organization: {
      name: 'Local Shelter'
      // No ships_to field
    }
  };

  test('displays single shipping country', () => {
    render(<DogCard dog={mockDogWithSingleCountry} />);
    
    const shipsToElement = screen.getByTestId('ships-to-display');
    expect(shipsToElement).toBeInTheDocument();
    expect(shipsToElement).toHaveTextContent('Adoptable to:');
    expect(shipsToElement).toHaveTextContent('United Kingdom');
  });

  test('displays multiple shipping countries with "more" indicator', () => {
    render(<DogCard dog={mockDogWithMultipleCountries} />);
    
    const shipsToElement = screen.getByTestId('ships-to-display');
    expect(shipsToElement).toBeInTheDocument();
    expect(shipsToElement).toHaveTextContent('Adoptable to:');
    expect(shipsToElement).toHaveTextContent('Germany');
    expect(shipsToElement).toHaveTextContent('Netherlands');
    expect(shipsToElement).toHaveTextContent('Belgium');
    expect(shipsToElement).toHaveTextContent('+3 more');
  });

  test('does not display ships-to section when no shipping data', () => {
    render(<DogCard dog={mockDogWithoutShipsTo} />);
    
    const shipsToElement = screen.queryByTestId('ships-to-display');
    expect(shipsToElement).not.toBeInTheDocument();
  });

  test('renders country flags for shipping destinations', () => {
    const { container } = render(<DogCard dog={mockDogWithMultipleCountries} />);
    
    const flags = container.querySelectorAll('img[alt*="flag"]');
    expect(flags.length).toBe(3); // Only first 3 countries show flags
    
    expect(flags[0]).toHaveAttribute('src', 'https://flagcdn.com/20x15/de.png');
    expect(flags[0]).toHaveAttribute('alt', 'Germany flag');
    
    expect(flags[1]).toHaveAttribute('src', 'https://flagcdn.com/20x15/nl.png');
    expect(flags[1]).toHaveAttribute('alt', 'Netherlands flag');
    
    expect(flags[2]).toHaveAttribute('src', 'https://flagcdn.com/20x15/be.png');
    expect(flags[2]).toHaveAttribute('alt', 'Belgium flag');
  });

  test('ships-to section has proper styling and layout', () => {
    render(<DogCard dog={mockDogWithSingleCountry} />);
    
    const shipsToElement = screen.getByTestId('ships-to-display');
    expect(shipsToElement).toHaveClass('flex', 'items-start', 'gap-2', 'text-xs');
    
    const label = Array.from(shipsToElement.querySelectorAll('*')).find(
      el => el.textContent === 'Adoptable to:'
    );
    expect(label).toHaveTextContent('Adoptable to:');
    expect(label).toHaveClass('mt-1', 'whitespace-nowrap');
  });
});