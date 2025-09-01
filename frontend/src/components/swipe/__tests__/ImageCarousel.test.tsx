import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageCarousel } from '../ImageCarousel';

describe('ImageCarousel', () => {
  const mockImages = [
    'https://example.com/dog1.jpg',
    'https://example.com/dog2.jpg',
    'https://example.com/dog3.jpg'
  ];

  it('should render all images', () => {
    render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute('src', mockImages[0]);
    expect(images[0]).toHaveAttribute('alt', 'Buddy - Photo 1');
  });

  it('should show dot indicators for each image', () => {
    render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const dots = screen.getAllByRole('button', { name: /Go to image/i });
    expect(dots).toHaveLength(3);
  });

  it('should navigate between images on dot click', () => {
    const { container } = render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const dots = screen.getAllByRole('button', { name: /Go to image/i });
    
    const imageContainers = container.querySelectorAll('[class*="opacity"]');
    expect(imageContainers[0]).toHaveClass('opacity-100');
    expect(imageContainers[1]).toHaveClass('opacity-0');
    
    fireEvent.click(dots[1]);
    
    expect(imageContainers[0]).toHaveClass('opacity-0');
    expect(imageContainers[1]).toHaveClass('opacity-100');
  });

  it('should handle single image without dots', () => {
    render(<ImageCarousel images={[mockImages[0]]} dogName="Max" />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    
    const dots = screen.queryAllByRole('button', { name: /Go to image/i });
    expect(dots).toHaveLength(0);
  });

  it('should support swipe gestures', () => {
    const { container } = render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const carouselContainer = screen.getByTestId('carousel-container');
    
    const imageContainers = container.querySelectorAll('[class*="opacity"]');
    expect(imageContainers[0]).toHaveClass('opacity-100');
    
    fireEvent.touchStart(carouselContainer, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(carouselContainer, { touches: [{ clientX: 50 }] });
    fireEvent.touchEnd(carouselContainer, { changedTouches: [{ clientX: 50 }] });
    
    expect(imageContainers[0]).toHaveClass('opacity-0');
    expect(imageContainers[1]).toHaveClass('opacity-100');
  });

  it('should highlight active dot', () => {
    render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const dots = screen.getAllByRole('button', { name: /Go to image/i });
    
    expect(dots[0]).toHaveClass('bg-gray-800');
    expect(dots[1]).toHaveClass('bg-gray-300');
    expect(dots[2]).toHaveClass('bg-gray-300');
    
    fireEvent.click(dots[1]);
    
    expect(dots[0]).toHaveClass('bg-gray-300');
    expect(dots[1]).toHaveClass('bg-gray-800');
    expect(dots[2]).toHaveClass('bg-gray-300');
  });

  it('should handle empty image array gracefully', () => {
    render(<ImageCarousel images={[]} dogName="Buddy" />);
    
    const placeholder = screen.getByTestId('image-placeholder');
    expect(placeholder).toBeInTheDocument();
  });

  it('should apply proper aspect ratio', () => {
    render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const container = screen.getByTestId('carousel-container');
    expect(container).toHaveClass('aspect-square');
  });

  it('should lazy load images', () => {
    render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('loading', 'eager');
    expect(images[1]).toHaveAttribute('loading', 'lazy');
    expect(images[2]).toHaveAttribute('loading', 'lazy');
  });

  it('should handle keyboard navigation', () => {
    const { container } = render(<ImageCarousel images={mockImages} dogName="Buddy" />);
    
    const carouselContainer = screen.getByTestId('carousel-container');
    
    const imageContainers = container.querySelectorAll('[class*="opacity"]');
    expect(imageContainers[0]).toHaveClass('opacity-100');
    
    fireEvent.keyDown(carouselContainer, { key: 'ArrowRight' });
    expect(imageContainers[1]).toHaveClass('opacity-100');
    
    fireEvent.keyDown(carouselContainer, { key: 'ArrowLeft' });
    expect(imageContainers[0]).toHaveClass('opacity-100');
  });
});