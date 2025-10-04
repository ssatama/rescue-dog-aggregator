import { render, screen } from '@testing-library/react';
import { GuideCard } from '../GuideCard';
import type { Guide } from '@/types/guide';

const mockGuide: Guide = {
  slug: 'test-guide',
  frontmatter: {
    title: 'Test Guide Title',
    slug: 'test-guide',
    description: 'This is a test guide description',
    heroImage: '/test-hero.jpg',
    heroImageAlt: 'Test hero image',
    readTime: 10,
    category: 'Getting Started',
    keywords: ['test', 'guide'],
    lastUpdated: '2025-10-03',
    author: 'Test Author',
    relatedGuides: [],
  },
  content: '',
};

describe('GuideCard', () => {
  it('renders guide title', () => {
    render(<GuideCard guide={mockGuide} />);
    expect(screen.getByText('Test Guide Title')).toBeInTheDocument();
  });

  it('renders guide description', () => {
    render(<GuideCard guide={mockGuide} />);
    expect(screen.getByText('This is a test guide description')).toBeInTheDocument();
  });

  it('displays read time', () => {
    render(<GuideCard guide={mockGuide} />);
    expect(screen.getByText(/10 min read/i)).toBeInTheDocument();
  });

  it('displays category badge', () => {
    render(<GuideCard guide={mockGuide} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('displays last updated date', () => {
    render(<GuideCard guide={mockGuide} />);
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();
  });

  it('links to correct guide page', () => {
    render(<GuideCard guide={mockGuide} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/guides/test-guide');
  });

  it('has proper accessibility attributes', () => {
    render(<GuideCard guide={mockGuide} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('group');
  });

  it('renders hero image with alt text', () => {
    render(<GuideCard guide={mockGuide} />);
    const image = screen.getByAltText('Test hero image');
    expect(image).toBeInTheDocument();
  });
});
