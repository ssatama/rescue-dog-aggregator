import { render, screen } from '@testing-library/react';
import GuidesPage from '../page';

// Mock the guides utilities
jest.mock('@/lib/guides', () => ({
  getAllGuides: jest.fn(() => [
    {
      slug: 'test-guide-1',
      frontmatter: {
        title: 'Test Guide 1',
        description: 'Description 1',
        readTime: 5,
        category: 'test',
        heroImage: '/test.jpg',
        keywords: ['test'],
        lastUpdated: '2025-10-03',
        author: 'Test',
        slug: 'test-guide-1',
        relatedGuides: [],
      },
      content: '',
    },
    {
      slug: 'test-guide-2',
      frontmatter: {
        title: 'Test Guide 2',
        description: 'Description 2',
        readTime: 10,
        category: 'test',
        heroImage: '/test2.jpg',
        keywords: ['test'],
        lastUpdated: '2025-10-03',
        author: 'Test',
        slug: 'test-guide-2',
        relatedGuides: [],
      },
      content: '',
    },
  ]),
}));

describe('GuidesPage', () => {
  it('renders guides listing page title', async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText('Adoption Guides')).toBeInTheDocument();
  });

  it('renders all guide cards', async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText('Test Guide 1')).toBeInTheDocument();
    expect(screen.getByText('Test Guide 2')).toBeInTheDocument();
  });

  it('displays guide descriptions', async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('displays read time for guides', async () => {
    const page = await GuidesPage();
    render(page);
    expect(screen.getByText(/5 min read/)).toBeInTheDocument();
    expect(screen.getByText(/10 min read/)).toBeInTheDocument();
  });
});
