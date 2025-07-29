/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CountryFlag from '../../components/ui/CountryFlag';

describe('CountryFlag Dark Mode', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  test('placeholder has dark mode styling when country code is invalid', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<CountryFlag countryCode="INVALID" countryName="Invalid Country" />);
    
    // Find the placeholder element
    const placeholder = screen.getByRole('img');
    expect(placeholder).toBeInTheDocument();
    
    // Should have dark mode background and text
    expect(placeholder).toHaveClass('bg-gray-200');
    expect(placeholder).toHaveClass('dark:bg-gray-700');
    expect(placeholder).toHaveClass('text-gray-600');
    expect(placeholder).toHaveClass('dark:text-gray-300');
    
    // Should contain the invalid country code
    expect(placeholder).toHaveTextContent('INVALID');
    
    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass('dark');
  });

  test('placeholder has light mode styling in light mode', () => {
    // Light mode (default)
    render(<CountryFlag countryCode="INVALID" countryName="Invalid Country" />);
    
    const placeholder = screen.getByRole('img');
    expect(placeholder).toHaveClass('bg-gray-200');
    expect(placeholder).toHaveClass('text-gray-600');
    
    // Verify dark class is NOT applied to document
    expect(document.documentElement).not.toHaveClass('dark');
  });

  test('component renders with valid country code', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<CountryFlag countryCode="DE" countryName="Germany" />);
    
    // Should not render a placeholder when valid
    const placeholder = screen.queryByText('DE');
    expect(placeholder).not.toBeInTheDocument();
    
    // Should render an image instead (though it may not load in tests)
    const image = screen.getByAltText('Germany flag');
    expect(image).toBeInTheDocument();
  });

  test('different sizes work in dark mode', () => {
    document.documentElement.classList.add('dark');
    
    const { rerender } = render(
      <CountryFlag countryCode="INVALID" countryName="Test" size="small" />
    );
    
    let placeholder = screen.getByRole('img');
    expect(placeholder).toHaveClass('dark:bg-gray-700');
    expect(placeholder).toHaveClass('dark:text-gray-300');
    
    rerender(
      <CountryFlag countryCode="INVALID" countryName="Test" size="medium" />
    );
    
    placeholder = screen.getByRole('img');
    expect(placeholder).toHaveClass('dark:bg-gray-700');
    expect(placeholder).toHaveClass('dark:text-gray-300');
    
    rerender(
      <CountryFlag countryCode="INVALID" countryName="Test" size="large" />
    );
    
    placeholder = screen.getByRole('img');
    expect(placeholder).toHaveClass('dark:bg-gray-700');
    expect(placeholder).toHaveClass('dark:text-gray-300');
  });
});