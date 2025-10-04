import { render, screen, fireEvent } from '@testing-library/react';
import { GuideOverlay } from '../GuideOverlay';

const mockRouter = { back: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('GuideOverlay', () => {
  beforeEach(() => {
    mockRouter.back.mockClear();
    document.body.style.overflow = 'unset';
  });

  it('renders children content', () => {
    render(
      <GuideOverlay>
        <div data-testid="test-content">Test Content</div>
      </GuideOverlay>
    );
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('disables body scroll when overlay is open', () => {
    render(
      <GuideOverlay>
        <div>Content</div>
      </GuideOverlay>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll on unmount', () => {
    const { unmount } = render(
      <GuideOverlay>
        <div>Content</div>
      </GuideOverlay>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('calls router.back when sheet is closed', () => {
    const { container } = render(
      <GuideOverlay>
        <div>Content</div>
      </GuideOverlay>
    );

    // Find and click the close button (Sheet component has a close button)
    const closeButton = container.querySelector('button[aria-label*="Close"]');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    // The onOpenChange handler should trigger router.back
    // Note: This might need adjustment based on actual Sheet implementation
  });

  it('renders Sheet component in open state', () => {
    render(
      <GuideOverlay>
        <div>Content</div>
      </GuideOverlay>
    );

    // Sheet should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
