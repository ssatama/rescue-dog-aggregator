import { render, screen } from '@testing-library/react';
import { GuideContent } from '../GuideContent';

// Mock MDXRemote
jest.mock('next-mdx-remote', () => ({
  MDXRemote: ({ children }: any) => <div data-testid="mdx-content">{children}</div>,
}));

const mockGuide = {
  slug: 'test-guide',
  frontmatter: {
    title: 'Test Guide',
    description: 'Test description',
    heroImage: '/test.jpg',
    readTime: 5,
    category: 'test',
    keywords: ['test'],
    lastUpdated: '2025-10-03',
    author: 'Test Author',
    slug: 'test-guide',
    relatedGuides: [],
  },
  content: '## Test Content',
  serializedContent: {
    compiledSource: 'return function() { return <div>Test</div> }',
    frontmatter: {},
    scope: {},
  },
};

describe('GuideContent', () => {
  it('renders guide title', () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText('Test Guide')).toBeInTheDocument();
  });

  it('renders guide description', () => {
    render(<GuideContent guide={mockGuide} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders MDX content', () => {
    render(<GuideContent guide={mockGuide} />);
    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
  });

  it('applies prose styling classes', () => {
    render(<GuideContent guide={mockGuide} />);
    const proseContainer = document.querySelector('.prose');
    expect(proseContainer).toBeInTheDocument();
    expect(proseContainer).toHaveClass('prose-lg');
    expect(proseContainer).toHaveClass('dark:prose-invert');
  });
});
