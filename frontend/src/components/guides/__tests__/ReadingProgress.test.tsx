import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReadingProgress } from '../ReadingProgress';

describe('ReadingProgress', () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 3000,
    });

    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('renders progress bar', () => {
    const { container } = render(<ReadingProgress />);
    const progressBar = container.querySelector('.fixed.top-0');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows 0% progress at top of page', () => {
    window.scrollY = 0;
    const { container } = render(<ReadingProgress />);

    // Trigger scroll event
    fireEvent.scroll(window);

    const progressFill = container.querySelector('.bg-orange-500');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('updates progress on scroll', async () => {
    const { container } = render(<ReadingProgress />);

    // Scroll to 50% (1000 pixels down, with 2000 total scrollable)
    window.scrollY = 1000;
    fireEvent.scroll(window);

    await waitFor(() => {
      const progressFill = container.querySelector('.bg-orange-500');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });
  });

  it('shows 100% progress at bottom of page', async () => {
    const { container } = render(<ReadingProgress />);

    // Scroll to bottom (scrollHeight - innerHeight = 2000)
    window.scrollY = 2000;
    fireEvent.scroll(window);

    await waitFor(() => {
      const progressFill = container.querySelector('.bg-orange-500');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });
  });

  it('has smooth transition classes', () => {
    const { container } = render(<ReadingProgress />);
    const progressFill = container.querySelector('.bg-orange-500');

    expect(progressFill).toHaveClass('transition-all');
    expect(progressFill).toHaveClass('duration-150');
  });

  it('is fixed at top of viewport', () => {
    const { container } = render(<ReadingProgress />);
    const progressContainer = container.querySelector('.fixed.top-0');

    expect(progressContainer).toHaveClass('fixed');
    expect(progressContainer).toHaveClass('top-0');
    expect(progressContainer).toHaveClass('w-full');
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ReadingProgress />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
