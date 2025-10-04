import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb';

describe('Breadcrumb', () => {
  it('renders all breadcrumb items', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByText('How to Adopt a Dog')).toBeInTheDocument();
  });

  it('renders Home link with correct href', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders Guides link with correct href', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const guidesLink = screen.getByText('Guides').closest('a');
    expect(guidesLink).toHaveAttribute('href', '/guides');
  });

  it('renders current guide name without link', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const guideName = screen.getByText('How to Adopt a Dog');
    expect(guideName.closest('a')).toBeNull();
    expect(guideName).toHaveAttribute('aria-current', 'page');
  });

  it('applies orange-500 styling to links', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const homeLink = screen.getByText('Home').closest('a');
    const guidesLink = screen.getByText('Guides').closest('a');

    expect(homeLink).toHaveClass('text-orange-500');
    expect(guidesLink).toHaveClass('text-orange-500');
  });

  it('renders structured data script', () => {
    const { container } = render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const structuredData = JSON.parse(script?.textContent || '{}');
    expect(structuredData['@type']).toBe('BreadcrumbList');
    expect(structuredData.itemListElement).toHaveLength(3);
  });

  it('includes correct URLs in structured data', () => {
    const { container } = render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const script = container.querySelector('script[type="application/ld+json"]');
    const structuredData = JSON.parse(script?.textContent || '{}');

    expect(structuredData.itemListElement[0].item).toBe('https://rescuedogs.me/');
    expect(structuredData.itemListElement[1].item).toBe('https://rescuedogs.me/guides');
    expect(structuredData.itemListElement[2].item).toBeUndefined(); // Current page has no URL
  });

  it('sets correct positions in structured data', () => {
    const { container } = render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const script = container.querySelector('script[type="application/ld+json"]');
    const structuredData = JSON.parse(script?.textContent || '{}');

    expect(structuredData.itemListElement[0].position).toBe(1);
    expect(structuredData.itemListElement[1].position).toBe(2);
    expect(structuredData.itemListElement[2].position).toBe(3);
  });

  it('renders ChevronRight separators between items', () => {
    const { container } = render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const chevrons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(chevrons).toHaveLength(2); // Two separators for three items
  });

  it('has proper aria-label for navigation', () => {
    render(<Breadcrumb guideName="How to Adopt a Dog" />);

    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav).toBeInTheDocument();
  });
});
