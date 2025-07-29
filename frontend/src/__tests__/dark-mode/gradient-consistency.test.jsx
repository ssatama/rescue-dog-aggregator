/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrustSection from '../../components/home/TrustSection';
import HeroSection from '../../components/home/HeroSection';

// Mock the animals service
jest.mock('../../services/animalsService', () => ({
  getStatistics: jest.fn().mockResolvedValue({
    total_dogs: 1250,
    total_organizations: 25,
    countries: ['DE', 'TR', 'GB'],
    organizations: []
  }),
  getGeneralStatistics: jest.fn().mockResolvedValue({
    totalDogs: 1250,
    totalOrganizations: 25,
    totalCountries: 15
  })
}));

// Mock OrganizationCard
jest.mock('../../components/organizations/OrganizationCard', () => {
  return function MockOrganizationCard() {
    return <div>Organization Card</div>;
  };
});

// Mock Button
jest.mock('@/components/ui/button', () => ({
  Button: function MockButton({ children, ...props }) {
    return <button {...props}>{children}</button>;
  }
}));

describe('Gradient Consistency Dark Mode', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  test('TrustSection should use clean background without dots in dark mode', async () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<TrustSection />);
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const trustSection = screen.getByTestId('trust-section');
    
    // Should NOT have bg-dot-pattern class which creates dots
    expect(trustSection).not.toHaveClass('bg-dot-pattern');
    
    // Should use semantic background class
    expect(trustSection).toHaveClass('bg-muted');
    
    // Verify dark class is applied
    expect(document.documentElement).toHaveClass('dark');
  });

  test('TrustSection should not use dot pattern background', async () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<TrustSection />);
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const trustSection = screen.getByTestId('trust-section');
    
    // Should NOT have the problematic bg-dot-pattern
    expect(trustSection).not.toHaveClass('bg-dot-pattern');
    
    // Should use semantic background class instead of hard-coded colors
    expect(trustSection).toHaveClass('bg-muted');
  });

  test('verify bg-dot-pattern is not used in TrustSection', () => {
    // Read the TrustSection source to verify bg-dot-pattern is removed
    const fs = require('fs');
    const path = require('path');
    
    const trustSectionPath = path.resolve(__dirname, '../../components/home/TrustSection.jsx');
    const trustSectionContent = fs.readFileSync(trustSectionPath, 'utf8');
    
    // Should NOT contain bg-dot-pattern
    expect(trustSectionContent).not.toContain('bg-dot-pattern');
    
    // Should use semantic background classes
    expect(trustSectionContent).toContain('bg-muted');
  });
});