import { render, screen } from '@testing-library/react';
import { RelatedGuides } from '../RelatedGuides';
import * as guidesLib from '@/lib/guides';

// Mock the guides library
jest.mock('@/lib/guides');

const mockGuides = [
  {
    slug: 'european-rescue-guide',
    frontmatter: {
      title: 'European Rescue Guide',
      description: 'Guide to European rescue dogs',
      heroImage: '/hero1.jpg',
      heroImageAlt: 'Hero 1',
      readTime: 10,
      category: 'adoption',
      keywords: ['rescue'],
      lastUpdated: '2025-10-03',
      author: 'Test Author',
      slug: 'european-rescue-guide',
      relatedGuides: [],
    },
    content: '',
    serializedContent: undefined,
  },
  {
    slug: 'first-time-owner-guide',
    frontmatter: {
      title: 'First Time Owner Guide',
      description: 'Guide for first-time dog owners',
      heroImage: '/hero2.jpg',
      heroImageAlt: 'Hero 2',
      readTime: 8,
      category: 'adoption',
      keywords: ['owner'],
      lastUpdated: '2025-10-03',
      author: 'Test Author',
      slug: 'first-time-owner-guide',
      relatedGuides: [],
    },
    content: '',
    serializedContent: undefined,
  },
];

describe('RelatedGuides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders related guides when slugs match', async () => {
    (guidesLib.getAllGuides as jest.Mock).mockResolvedValue(mockGuides);

    const { container } = render(
      await RelatedGuides({ relatedSlugs: ['european-rescue-guide', 'first-time-owner-guide'] })
    );

    expect(screen.getByText('Related Guides')).toBeInTheDocument();
    expect(screen.getByText('European Rescue Guide')).toBeInTheDocument();
    expect(screen.getByText('First Time Owner Guide')).toBeInTheDocument();
  });

  it('returns null when no related slugs provided', async () => {
    const { container } = render(await RelatedGuides({ relatedSlugs: [] }));
    expect(container.firstChild).toBeNull();
  });

  it('returns null when related slugs do not match any guides', async () => {
    (guidesLib.getAllGuides as jest.Mock).mockResolvedValue(mockGuides);

    const { container } = render(await RelatedGuides({ relatedSlugs: ['non-existent-guide'] }));
    expect(container.firstChild).toBeNull();
  });

  it('renders only matching guides', async () => {
    (guidesLib.getAllGuides as jest.Mock).mockResolvedValue(mockGuides);

    const { container } = render(
      await RelatedGuides({ relatedSlugs: ['european-rescue-guide'] })
    );

    expect(screen.getByText('European Rescue Guide')).toBeInTheDocument();
    expect(screen.queryByText('First Time Owner Guide')).not.toBeInTheDocument();
  });

  it('renders guides in a grid layout', async () => {
    (guidesLib.getAllGuides as jest.Mock).mockResolvedValue(mockGuides);

    const { container } = render(
      await RelatedGuides({ relatedSlugs: ['european-rescue-guide', 'first-time-owner-guide'] })
    );

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
  });

  it('applies proper styling to footer section', async () => {
    (guidesLib.getAllGuides as jest.Mock).mockResolvedValue(mockGuides);

    const { container } = render(
      await RelatedGuides({ relatedSlugs: ['european-rescue-guide'] })
    );

    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('mt-12', 'pt-8', 'border-t');
  });
});
