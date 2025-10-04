import { render, screen, fireEvent } from '@testing-library/react';
import { FontSizeControl } from '../FontSizeControl';
import { FontSizeProvider } from '@/contexts/FontSizeContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <FontSizeProvider>{children}</FontSizeProvider>
);

describe('FontSizeControl', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all font size buttons', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    expect(screen.getByTitle('Comfortable (16px)')).toBeInTheDocument();
    expect(screen.getByTitle('Large (18px)')).toBeInTheDocument();
    expect(screen.getByTitle('Extra Large (20px)')).toBeInTheDocument();
  });

  it('renders increase and decrease buttons', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Increase font size')).toBeInTheDocument();
    expect(screen.getByLabelText('Decrease font size')).toBeInTheDocument();
  });

  it('defaults to comfortable size', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const comfortableButton = screen.getByTitle('Comfortable (16px)');
    expect(comfortableButton).toHaveClass('bg-orange-500');
  });

  it('changes font size when clicking size buttons', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const largeButton = screen.getByTitle('Large (18px)');
    fireEvent.click(largeButton);

    expect(largeButton).toHaveClass('bg-orange-500');
  });

  it('increases font size with + button', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const increaseButton = screen.getByLabelText('Increase font size');
    fireEvent.click(increaseButton);

    const largeButton = screen.getByTitle('Large (18px)');
    expect(largeButton).toHaveClass('bg-orange-500');
  });

  it('decreases font size with - button', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    // First increase to large
    const increaseButton = screen.getByLabelText('Increase font size');
    fireEvent.click(increaseButton);

    // Then decrease back to comfortable
    const decreaseButton = screen.getByLabelText('Decrease font size');
    fireEvent.click(decreaseButton);

    const comfortableButton = screen.getByTitle('Comfortable (16px)');
    expect(comfortableButton).toHaveClass('bg-orange-500');
  });

  it('disables decrease button at minimum size', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const decreaseButton = screen.getByLabelText('Decrease font size');
    expect(decreaseButton).toBeDisabled();
  });

  it('disables increase button at maximum size', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    // Increase to max
    const increaseButton = screen.getByLabelText('Increase font size');
    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);

    expect(increaseButton).toBeDisabled();
  });

  it('persists font size to localStorage', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const largeButton = screen.getByTitle('Large (18px)');
    fireEvent.click(largeButton);

    expect(localStorage.getItem('guide-font-size')).toBe('large');
  });

  it('applies CSS variable to document root', () => {
    render(<FontSizeControl />, { wrapper: Wrapper });

    const largeButton = screen.getByTitle('Large (18px)');
    fireEvent.click(largeButton);

    expect(document.documentElement.style.getPropertyValue('--guide-font-size')).toBe('18px');
  });
});
