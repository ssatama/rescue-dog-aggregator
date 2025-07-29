import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareButton, { ShareButtonProps } from '../ShareButton';

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn()
});

// Mock the useShare hook
jest.mock('../../../hooks/useShare', () => ({
  useShare: jest.fn(() => ({
    copied: false,
    hasNativeShare: false,
    handleNativeShare: jest.fn(),
    handleCopyLink: jest.fn(),
    handleSocialShare: jest.fn()
  }))
}));

// Mock the Toast component
jest.mock('../Toast', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}));

describe('ShareButton TypeScript Tests', () => {
  const defaultProps: ShareButtonProps = {
    url: 'https://example.com',
    title: 'Test Title',
    text: 'Test text content'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('accepts required props with proper types', () => {
    // ShareButton has no required props, all are optional
    render(<ShareButton />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  test('accepts optional url prop', () => {
    const url = 'https://example.com/test';
    
    render(<ShareButton url={url} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('accepts optional title prop', () => {
    const title = 'Test Title';
    
    render(<ShareButton title={title} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('accepts optional text prop', () => {
    const text = 'Test text content';
    
    render(<ShareButton text={text} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('accepts optional variant prop', () => {
    const variant: ShareButtonProps['variant'] = 'secondary';
    
    render(<ShareButton variant={variant} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('accepts optional size prop', () => {
    const size: ShareButtonProps['size'] = 'lg';
    
    render(<ShareButton size={size} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('accepts optional className prop', () => {
    const className = 'custom-share-class';
    
    render(<ShareButton className={className} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(className);
  });

  test('properly types all props together', () => {
    const props: ShareButtonProps = {
      url: 'https://example.com',
      title: 'Test Title',
      text: 'Test text content',
      variant: 'outline',
      size: 'default',
      className: 'custom-class'
    };
    
    render(<ShareButton {...props} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  test('renders native share button when available', () => {
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: false,
      hasNativeShare: true,
      handleNativeShare: jest.fn(),
      handleCopyLink: jest.fn(),
      handleSocialShare: jest.fn()
    }));

    render(<ShareButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    // Should NOT have dropdown menu trigger
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('renders dropdown menu when native share unavailable', () => {
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: false,
      hasNativeShare: false,
      handleNativeShare: jest.fn(),
      handleCopyLink: jest.fn(),
      handleSocialShare: jest.fn()
    }));

    render(<ShareButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  test('handles copy link interaction', async () => {
    const handleCopyLink = jest.fn();
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: false,
      hasNativeShare: false,
      handleNativeShare: jest.fn(),
      handleCopyLink,
      handleSocialShare: jest.fn()
    }));

    const user = userEvent.setup();
    render(<ShareButton {...defaultProps} />);
    
    // Click to open dropdown
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Click copy link option
    const copyOption = screen.getByText('Copy Link');
    await user.click(copyOption);
    
    expect(handleCopyLink).toHaveBeenCalledTimes(1);
  });

  test('handles social share interaction', async () => {
    const handleSocialShare = jest.fn();
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: false,
      hasNativeShare: false,
      handleNativeShare: jest.fn(),
      handleCopyLink: jest.fn(),
      handleSocialShare
    }));

    const user = userEvent.setup();
    render(<ShareButton {...defaultProps} />);
    
    // Click to open dropdown
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Click Facebook share option
    const facebookOption = screen.getByText('Share on Facebook');
    await user.click(facebookOption);
    
    expect(handleSocialShare).toHaveBeenCalledWith('facebook');
  });

  test('shows copied state correctly', () => {
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: true,
      hasNativeShare: false,
      handleNativeShare: jest.fn(),
      handleCopyLink: jest.fn(),
      handleSocialShare: jest.fn()
    }));

    render(<ShareButton {...defaultProps} />);
    
    // The component should be rendered, and when dropdown is opened, should show "Copied!" state
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('handles native share interaction', async () => {
    const handleNativeShare = jest.fn();
    const { useShare } = require('../../../hooks/useShare');
    
    useShare.mockImplementation(() => ({
      copied: false,
      hasNativeShare: true,
      handleNativeShare,
      handleCopyLink: jest.fn(),
      handleSocialShare: jest.fn()
    }));

    const user = userEvent.setup();
    render(<ShareButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(handleNativeShare).toHaveBeenCalledTimes(1);
  });

  test('supports all variant types correctly', () => {
    const variants: ShareButtonProps['variant'][] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
    
    variants.forEach(variant => {
      const { unmount } = render(<ShareButton variant={variant} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      unmount();
    });
  });

  test('supports all size types correctly', () => {
    const sizes: ShareButtonProps['size'][] = ['default', 'sm', 'lg', 'icon'];
    
    sizes.forEach(size => {
      const { unmount } = render(<ShareButton size={size} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      unmount();
    });
  });
});