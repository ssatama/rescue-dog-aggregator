import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DogDescription from '../DogDescription';

// Mock the security utils
jest.mock('../../../utils/security', () => ({
  sanitizeText: jest.fn((text) => text),
  sanitizeHtml: jest.fn((html) => {
    // Remove script tags for security testing
    return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  })
}));

describe('DogDescription', () => {
  const mockProps = {
    dogName: 'Buddy',
    organizationName: 'Happy Paws Rescue',
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Short Description Enhancement (<50 characters)', () => {
    it('should enhance short descriptions with contact prompt', () => {
      const shortDescription = 'Ready to fly!';
      render(
        <DogDescription 
          {...mockProps}
          description={shortDescription}
        />
      );

      // Should show original short description
      expect(screen.getByText('Ready to fly!')).toBeInTheDocument();
      
      // Should show enhanced prompt
      expect(screen.getByText(/Want to learn more about Buddy/)).toBeInTheDocument();
      expect(screen.getByText(/Contact Happy Paws Rescue/)).toBeInTheDocument();
      expect(screen.getByText(/personality, needs, and adoption requirements/)).toBeInTheDocument();
    });

    it('should handle very short descriptions properly', () => {
      const veryShortDescription = 'Sweet!';
      render(
        <DogDescription 
          {...mockProps}
          description={veryShortDescription}
        />
      );

      expect(screen.getByText('Sweet!')).toBeInTheDocument();
      expect(screen.getByText(/Want to learn more about Buddy/)).toBeInTheDocument();
    });

    it('should mark enhanced content for accessibility', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Ready to fly!"
        />
      );

      const enhancedSection = screen.getByTestId('enhanced-description');
      expect(enhancedSection).toBeInTheDocument();
      expect(enhancedSection).toHaveAttribute('aria-label', 'Additional information about Buddy');
    });

    it('should apply enhanced styling for short descriptions', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Ready to fly!"
        />
      );

      const container = screen.getByTestId('description-container');
      expect(container).toHaveClass('text-lg', 'leading-relaxed', 'text-gray-700', 'max-w-prose');
    });
  });

  describe('Empty Description Fallback', () => {
    it('should show engaging fallback when no description provided', () => {
      render(
        <DogDescription 
          {...mockProps}
          description=""
        />
      );

      expect(screen.getByText(/Buddy is looking for a loving forever home/)).toBeInTheDocument();
      expect(screen.getByText(/Contact Happy Paws Rescue/)).toBeInTheDocument();
      expect(screen.getByText(/wonderful dog's personality, needs/)).toBeInTheDocument();
      expect(screen.getByText(/perfect home/)).toBeInTheDocument();
    });

    it('should show fallback for null description', () => {
      render(
        <DogDescription 
          {...mockProps}
          description={null}
        />
      );

      expect(screen.getByText(/Buddy is looking for a loving forever home/)).toBeInTheDocument();
    });

    it('should show fallback for undefined description', () => {
      render(
        <DogDescription 
          {...mockProps}
          description={undefined}
        />
      );

      expect(screen.getByText(/Buddy is looking for a loving forever home/)).toBeInTheDocument();
    });

    it('should mark fallback content for accessibility', () => {
      render(
        <DogDescription 
          {...mockProps}
          description=""
        />
      );

      const fallbackContent = screen.getByTestId('fallback-description');
      expect(fallbackContent).toBeInTheDocument();
      expect(fallbackContent).toHaveAttribute('aria-label', 'Default information about Buddy');
    });
  });

  describe('Normal Description Functionality (>50 characters)', () => {
    const longDescription = 'This is a wonderful dog with an amazing personality. He loves to play, is great with kids, and enjoys long walks in the park. He would make a perfect addition to any family looking for a loyal and loving companion. This dog has been well-trained and is ready for a new home. He is very social and gets along well with other dogs and cats. The perfect family pet that will bring joy and happiness to your home for many years to come.';

    it('should show full description when under read-more threshold', () => {
      const mediumDescription = 'This is a medium length description that is longer than 50 characters but under 200.';
      
      render(
        <DogDescription 
          {...mockProps}
          description={mediumDescription}
        />
      );

      expect(screen.getByText(mediumDescription)).toBeInTheDocument();
      expect(screen.queryByTestId('read-more-button')).not.toBeInTheDocument();
    });

    it('should show truncated description with read more button for long content', () => {
      render(
        <DogDescription 
          {...mockProps}
          description={longDescription}
        />
      );

      // Should show truncated content
      expect(screen.getByTestId('description-content')).toBeInTheDocument();
      
      // Should show read more button
      expect(screen.getByTestId('read-more-button')).toBeInTheDocument();
      expect(screen.getByText('Read more')).toBeInTheDocument();
    });

    it('should expand description when read more is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <DogDescription 
          {...mockProps}
          description={longDescription}
        />
      );

      const readMoreButton = screen.getByTestId('read-more-button');
      await user.click(readMoreButton);

      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('should collapse description when show less is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <DogDescription 
          {...mockProps}
          description={longDescription}
        />
      );

      // Expand first
      const readMoreButton = screen.getByTestId('read-more-button');
      await user.click(readMoreButton);
      
      // Then collapse
      const showLessButton = screen.getByText('Show less');
      await user.click(showLessButton);

      expect(screen.getByText('Read more')).toBeInTheDocument();
    });
  });

  describe('Typography and Styling', () => {
    it('should apply improved typography classes', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Some description text"
        />
      );

      const container = screen.getByTestId('description-container');
      expect(container).toHaveClass('text-lg', 'leading-relaxed', 'text-gray-700', 'max-w-prose');
    });

    it('should apply custom className when provided', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Some description text"
          className="custom-class"
        />
      );

      const container = screen.getByTestId('description-container');
      expect(container).toHaveClass('custom-class');
    });

    it('should maintain prose styling for optimal readability', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Some description text"
        />
      );

      const proseContainer = screen.getByTestId('prose-container');
      expect(proseContainer).toHaveClass('prose', 'max-w-none');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing dog name gracefully', () => {
      render(
        <DogDescription 
          {...mockProps}
          dogName=""
          description=""
        />
      );

      // Should still show fallback but handle missing name
      expect(screen.getByTestId('fallback-description')).toBeInTheDocument();
    });

    it('should handle missing organization name gracefully', () => {
      render(
        <DogDescription 
          {...mockProps}
          organizationName=""
          description=""
        />
      );

      // Should still show fallback but handle missing organization
      expect(screen.getByTestId('fallback-description')).toBeInTheDocument();
    });

    it('should sanitize HTML content properly', () => {
      const htmlDescription = '<script>alert("xss")</script><p>Safe content</p>';
      
      render(
        <DogDescription 
          {...mockProps}
          description={htmlDescription}
        />
      );

      // Should not contain script tags
      expect(document.querySelector('script')).toBeNull();
    });

    it('should handle special characters in names', () => {
      render(
        <DogDescription 
          {...mockProps}
          dogName="Buddy & Friends"
          organizationName="Happy Paws & More"
          description=""
        />
      );

      expect(screen.getByTestId('fallback-description')).toBeInTheDocument();
    });
  });

  describe('Performance and Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DogDescription 
          {...mockProps}
          description="Some description"
        />
      );

      const container = screen.getByTestId('description-container');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Dog description');
    });

    it('should support keyboard navigation for read more button', () => {
      const veryLongDescription = 'This is a very long description that should trigger the read more functionality and needs to be longer than 200 characters to properly test the truncation and expansion behavior. This text continues to make sure we definitely exceed the 200 character limit for triggering the read more button. Adding even more text to ensure this works properly in all test environments.';
      
      render(
        <DogDescription 
          {...mockProps}
          description={veryLongDescription}
        />
      );

      const readMoreButton = screen.getByTestId('read-more-button');
      expect(readMoreButton).toHaveAttribute('tabIndex', '0');
    });

    it('should maintain focus management during expansion', () => {
      const veryLongDescription = 'This is a very long description that should trigger the read more functionality and needs to be longer than 200 characters to properly test the truncation and expansion behavior. This text continues to make sure we definitely exceed the 200 character limit for triggering the read more button. Adding even more text to ensure this works properly in all test environments.';
      
      render(
        <DogDescription 
          {...mockProps}
          description={veryLongDescription}
        />
      );

      const readMoreButton = screen.getByTestId('read-more-button');
      readMoreButton.focus();
      
      fireEvent.click(readMoreButton);
      
      // Focus should remain on the toggle button
      expect(document.activeElement).toBe(screen.getByTestId('read-more-button'));
    });
  });
});