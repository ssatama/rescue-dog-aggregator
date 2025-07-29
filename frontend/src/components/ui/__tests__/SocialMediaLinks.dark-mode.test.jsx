// src/components/ui/__tests__/SocialMediaLinks.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for SocialMediaLinks dark mode functionality

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialMediaLinks from '../SocialMediaLinks';

// Mock the Icon component
jest.mock('../Icon', () => ({
  Icon: function MockIcon({ name, size, className }) {
    return (
      <span 
        data-testid="icon" 
        data-name={name} 
        data-size={size}
        className={className}
      >
        {name}
      </span>
    );
  }
}));

describe('SocialMediaLinks Dark Mode', () => {
  const mockSocialMedia = {
    facebook: 'https://facebook.com/rescue',
    instagram: 'https://instagram.com/rescue',
    twitter: 'https://twitter.com/rescue'
  };

  describe('Social Link Icons Dark Mode', () => {
    test('social media links have dark mode text colors', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      const facebookLink = screen.getByLabelText('Visit our facebook page');
      const instagramLink = screen.getByLabelText('Visit our instagram page');
      const twitterLink = screen.getByLabelText('Visit our twitter page');
      
      [facebookLink, instagramLink, twitterLink].forEach(link => {
        expect(link).toHaveClass('text-gray-600');
        expect(link).toHaveClass('dark:text-gray-400');
        expect(link).toHaveClass('hover:text-orange-600');
        expect(link).toHaveClass('dark:hover:text-orange-400');
      });
    });

    test('facebook icon has proper dark mode styling', () => {
      render(<SocialMediaLinks socialMedia={{ facebook: 'https://facebook.com/test' }} />);
      
      const facebookIcon = screen.getByTestId('icon');
      expect(facebookIcon).toHaveAttribute('data-name', 'facebook');
      expect(facebookIcon).toHaveClass('h-5');
      expect(facebookIcon).toHaveClass('w-5');
      expect(facebookIcon).toHaveClass('text-gray-600');
      expect(facebookIcon).toHaveClass('dark:text-gray-400');
    });

    test('instagram icon has proper dark mode styling', () => {
      render(<SocialMediaLinks socialMedia={{ instagram: 'https://instagram.com/test' }} />);
      
      const instagramIcon = screen.getByTestId('icon');
      expect(instagramIcon).toHaveAttribute('data-name', 'instagram');
      expect(instagramIcon).toHaveClass('h-5');
      expect(instagramIcon).toHaveClass('w-5');
      expect(instagramIcon).toHaveClass('text-gray-600');
      expect(instagramIcon).toHaveClass('dark:text-gray-400');
    });

    test('twitter/x icon has dark mode styling', () => {
      render(<SocialMediaLinks socialMedia={{ twitter: 'https://twitter.com/test' }} />);
      
      const twitterLink = screen.getByLabelText('Visit our twitter page');
      expect(twitterLink).toHaveClass('text-gray-600');
      expect(twitterLink).toHaveClass('dark:text-gray-400');
      
      const twitterIcon = twitterLink.querySelector('svg');
      expect(twitterIcon).toHaveClass('h-5');
      expect(twitterIcon).toHaveClass('w-5');
      expect(twitterIcon).toHaveClass('text-gray-600');
      expect(twitterIcon).toHaveClass('dark:text-gray-400');
    });

    test('x platform variant has dark mode styling', () => {
      render(<SocialMediaLinks socialMedia={{ x: 'https://x.com/test' }} />);
      
      const xLink = screen.getByLabelText('Visit our x page');
      expect(xLink).toHaveClass('text-gray-600');
      expect(xLink).toHaveClass('dark:text-gray-400');
      
      const xIcon = xLink.querySelector('svg');
      expect(xIcon).toHaveClass('h-5');
      expect(xIcon).toHaveClass('w-5');
      expect(xIcon).toHaveClass('text-gray-600');
      expect(xIcon).toHaveClass('dark:text-gray-400');
    });

    test('fallback globe icon has dark mode styling', () => {
      render(<SocialMediaLinks socialMedia={{ website: 'https://example.com' }} />);
      
      const websiteLink = screen.getByLabelText('Visit our website page');
      expect(websiteLink).toHaveClass('text-gray-600');
      expect(websiteLink).toHaveClass('dark:text-gray-400');
      
      const globeIcon = screen.getByTestId('icon');
      expect(globeIcon).toHaveAttribute('data-name', 'globe');
      expect(globeIcon).toHaveClass('h-5');
      expect(globeIcon).toHaveClass('w-5');
      expect(globeIcon).toHaveClass('text-gray-600');
      expect(globeIcon).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Container Dark Mode', () => {
    test('container maintains custom className with dark mode support', () => {
      render(
        <SocialMediaLinks 
          socialMedia={mockSocialMedia} 
          className="justify-center lg:justify-start"
        />
      );
      
      const container = screen.getByLabelText('Visit our facebook page').closest('.flex');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('gap-3');
      expect(container).toHaveClass('justify-center');
      expect(container).toHaveClass('lg:justify-start');
    });

    test('empty social media returns null in dark mode', () => {
      const { container } = render(<SocialMediaLinks socialMedia={{}} />);
      expect(container.firstChild).toBeNull();
    });

    test('undefined social media returns null in dark mode', () => {
      const { container } = render(<SocialMediaLinks />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Icon Size Variants Dark Mode', () => {
    test('maintains size consistency across platforms in dark mode', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      // All icons should have consistent sizing
      const icons = screen.getAllByTestId('icon');
      icons.forEach(icon => {
        expect(icon).toHaveClass('h-5');
        expect(icon).toHaveClass('w-5');
      });
      
      // Twitter custom SVG should match
      const twitterIcon = document.querySelector('svg');
      expect(twitterIcon).toHaveClass('h-5');
      expect(twitterIcon).toHaveClass('w-5');
    });

    test('icon sizing adapts to different contexts in dark mode', () => {
      // Test with a larger size class that could be passed through
      render(
        <SocialMediaLinks 
          socialMedia={{ facebook: 'https://facebook.com/test' }}
          className="text-lg"
        />
      );
      
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('w-5');
    });
  });

  describe('Hover States Dark Mode', () => {
    test('hover states work properly in dark mode', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      const facebookLink = screen.getByLabelText('Visit our facebook page');
      expect(facebookLink).toHaveClass('transition-colors');
      expect(facebookLink).toHaveClass('hover:text-orange-600');
      expect(facebookLink).toHaveClass('dark:hover:text-orange-400');
    });

    test('focus states maintain accessibility in dark mode', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('transition-colors');
        // Links should be focusable
        expect(link).toHaveAttribute('href');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Multiple Platforms Dark Mode', () => {
    test('handles multiple platforms with consistent dark mode styling', () => {
      const multiplePlatforms = {
        facebook: 'https://facebook.com/rescue',
        instagram: 'https://instagram.com/rescue',
        twitter: 'https://twitter.com/rescue',
        x: 'https://x.com/rescue',
        linkedin: 'https://linkedin.com/rescue',
        website: 'https://rescue.org'
      };

      render(<SocialMediaLinks socialMedia={multiplePlatforms} />);
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(6);
      
      links.forEach(link => {
        expect(link).toHaveClass('text-gray-600');
        expect(link).toHaveClass('dark:text-gray-400');
        expect(link).toHaveClass('hover:text-orange-600');
        expect(link).toHaveClass('dark:hover:text-orange-400');
      });
    });

    test('platform icons maintain individual styling in dark mode', () => {
      const platforms = {
        facebook: 'https://facebook.com/test',
        instagram: 'https://instagram.com/test',
        twitter: 'https://twitter.com/test'
      };

      render(<SocialMediaLinks socialMedia={platforms} />);
      
      // Should have proper icons for each platform
      const icons = screen.getAllByTestId('icon');
      expect(icons).toHaveLength(2); // Facebook and Instagram use Icon component
      expect(icons[0]).toHaveAttribute('data-name', 'facebook');
      expect(icons[1]).toHaveAttribute('data-name', 'instagram');
      
      // Twitter should use custom SVG
      const twitterSvg = document.querySelector('svg');
      expect(twitterSvg).toBeInTheDocument();
      expect(twitterSvg).toHaveClass('h-5');
      expect(twitterSvg).toHaveClass('w-5');
    });
  });

  describe('Accessibility in Dark Mode', () => {
    test('maintains proper ARIA labels in dark mode', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      expect(screen.getByLabelText('Visit our facebook page')).toBeInTheDocument();
      expect(screen.getByLabelText('Visit our instagram page')).toBeInTheDocument();
      expect(screen.getByLabelText('Visit our twitter page')).toBeInTheDocument();
    });

    test('links have proper attributes for external navigation', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    test('icons maintain semantic meaning in dark mode', () => {
      render(<SocialMediaLinks socialMedia={{ facebook: 'https://facebook.com/test' }} />);
      
      const twitterIcon = document.querySelector('svg');
      if (twitterIcon) {
        expect(twitterIcon).toHaveAttribute('aria-hidden', 'true');
      }
    });

    test('maintains color contrast ratios in dark mode', () => {
      render(<SocialMediaLinks socialMedia={mockSocialMedia} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        // Gray-600 in light mode provides good contrast
        expect(link).toHaveClass('text-gray-600');
        // Gray-400 in dark mode provides good contrast on dark backgrounds
        expect(link).toHaveClass('dark:text-gray-400');
        // Orange hover states maintain theme consistency
        expect(link).toHaveClass('hover:text-orange-600');
        expect(link).toHaveClass('dark:hover:text-orange-400');
      });
    });
  });
});