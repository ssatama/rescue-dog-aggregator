import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BreedStatistics from '../BreedStatistics';

describe('BreedStatistics', () => {
  const mockBreedData = {
    primary_breed: 'Golden Retriever',
    breed_slug: 'golden-retriever',
    count: 42,
    average_age_months: 36,
    sex_distribution: {
      male: 25,
      female: 17
    }
  };

  describe('Sex Distribution Visualization', () => {
    it('should display sex distribution card with both counts and percentages', () => {
      render(<BreedStatistics breedData={mockBreedData} />);
      
      // Should display the sex distribution section
      expect(screen.getByText('Sex Distribution')).toBeInTheDocument();
      
      // Should show male count and percentage
      const maleCount = screen.getByText('25');
      expect(maleCount).toBeInTheDocument();
      expect(screen.getAllByText(/60%/)[0]).toBeInTheDocument(); // male percentage
      
      // Should show female count and percentage  
      const femaleCount = screen.getByText('17');
      expect(femaleCount).toBeInTheDocument();
      expect(screen.getAllByText(/40%/)[0]).toBeInTheDocument(); // female percentage
    });

    it('should render a visual bar chart for sex distribution', () => {
      render(<BreedStatistics breedData={mockBreedData} />);
      
      // Should have visual bars for male and female
      const maleBar = screen.getByTestId('male-bar');
      const femaleBar = screen.getByTestId('female-bar');
      
      expect(maleBar).toBeInTheDocument();
      expect(femaleBar).toBeInTheDocument();
      
      // Bars should have width proportional to percentages
      expect(maleBar).toHaveStyle('width: 60%');
      expect(femaleBar).toHaveStyle('width: 40%');
    });

    it('should handle all-male edge case gracefully', () => {
      const allMaleData = {
        ...mockBreedData,
        count: 42,
        sex_distribution: {
          male: 42,
          female: 0
        }
      };
      
      render(<BreedStatistics breedData={allMaleData} />);
      
      // Check male stats
      const allTexts = screen.getAllByText('42');
      expect(allTexts.length).toBeGreaterThan(0); // Should have both count and male count
      const hundredPercentTexts = screen.getAllByText(/100%/);
      expect(hundredPercentTexts.length).toBeGreaterThan(0); // male percentage
      
      // Female should show 0
      const zeroTexts = screen.getAllByText('0');
      expect(zeroTexts.length).toBeGreaterThan(0);
      const zeroPercentTexts = screen.getAllByText(/0%/);
      expect(zeroPercentTexts.length).toBeGreaterThan(0); // female percentage
    });

    it('should handle all-female edge case gracefully', () => {
      const allFemaleData = {
        ...mockBreedData,
        count: 42,
        sex_distribution: {
          male: 0,
          female: 42
        }
      };
      
      render(<BreedStatistics breedData={allFemaleData} />);
      
      // Male should show 0
      const zeroTexts = screen.getAllByText('0');
      expect(zeroTexts.length).toBeGreaterThan(0);
      const zeroPercentTexts = screen.getAllByText(/0%/);
      expect(zeroPercentTexts.length).toBeGreaterThan(0); // male percentage
      
      // Check female stats
      const allTexts = screen.getAllByText('42');
      expect(allTexts.length).toBeGreaterThan(0); // Should have both count and female count
      const hundredPercentTexts = screen.getAllByText(/100%/);
      expect(hundredPercentTexts.length).toBeGreaterThan(0); // female percentage
    });

    it('should handle missing sex distribution data', () => {
      const noSexData = {
        ...mockBreedData,
        sex_distribution: undefined
      };
      
      render(<BreedStatistics breedData={noSexData} />);
      
      // Should not crash and should show fallback
      expect(screen.queryByText(/Sex Distribution/i)).not.toBeInTheDocument();
    });

    it('should use accessible labels for screen readers', () => {
      render(<BreedStatistics breedData={mockBreedData} />);
      
      expect(screen.getByLabelText(/25 males out of 42 dogs/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/17 females out of 42 dogs/i)).toBeInTheDocument();
    });
  });

  describe('Existing Statistics', () => {
    it('should display available dogs count', () => {
      render(<BreedStatistics breedData={mockBreedData} />);
      
      expect(screen.getByText('Available Dogs')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display average age', () => {
      render(<BreedStatistics breedData={mockBreedData} />);
      
      expect(screen.getByText('Avg. Age')).toBeInTheDocument();
      expect(screen.getByText('3 years')).toBeInTheDocument();
    });
  });
});