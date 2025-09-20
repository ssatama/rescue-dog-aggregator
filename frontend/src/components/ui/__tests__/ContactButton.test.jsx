import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactButton from '../ContactButton';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.location.href
delete window.location;
window.location = { href: jest.fn() };

describe('ContactButton', () => {
  const defaultProps = {
    email: 'rescuedogsme@gmail.com',
    buttonText: 'Contact Us',
    size: 'lg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.isSecureContext for tests
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true
    });
  });

  it('renders the button with correct text', () => {
    render(<ContactButton {...defaultProps} />);
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('has correct mailto link href', () => {
    render(<ContactButton {...defaultProps} />);
    const link = screen.getByRole('button', { name: /send email/i });
    expect(link).toHaveAttribute('href', 'mailto:rescuedogsme@gmail.com');
  });

  it('copies email to clipboard on click', async () => {
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('rescuedogsme@gmail.com');
    });
  });

  it('shows feedback message after copying', async () => {
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/email copied/i)).toBeInTheDocument();
    });
  });

  it('hides feedback message after timeout', async () => {
    jest.useFakeTimers();
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/email copied/i)).toBeInTheDocument();
    });
    
    jest.advanceTimersByTime(2500);
    
    await waitFor(() => {
      expect(screen.queryByText(/email copied/i)).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('handles clipboard API failure gracefully', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard API failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('accepts custom className prop', () => {
    const { container } = render(<ContactButton {...defaultProps} className="custom-class" />);
    const button = container.querySelector('a.custom-class');
    expect(button).toBeInTheDocument();
  });

  it('uses custom button text when provided', () => {
    render(<ContactButton {...defaultProps} buttonText="Get in Touch" />);
    expect(screen.getByText('Get in Touch')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('email'));
  });

  it('falls back to execCommand when clipboard API is not available', async () => {
    // Mock clipboard API not available
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: false
    });
    
    // Mock document.execCommand
    document.execCommand = jest.fn(() => true);
    
    render(<ContactButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /send email/i });
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });
});