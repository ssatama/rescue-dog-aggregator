import React from 'react';
import { render, screen } from '@testing-library/react';
import AnimatedCounter from '../AnimatedCounter';

// TypeScript-specific test to verify proper prop typing
describe('AnimatedCounter TypeScript Tests', () => {
  test('accepts all props with proper typing', () => {
    const props = {
      value: 100,
      duration: 1500,
      label: 'Test Counter',
      className: 'custom-counter'
    };
    
    render(<AnimatedCounter {...props} />);
    
    const counter = screen.getByTestId('animated-counter');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveClass('custom-counter');
    // Counter starts at 0 and animates to target value
    expect(counter).toHaveAttribute('aria-label', 'Test Counter: 0');
  });

  test('accepts minimal props', () => {
    render(<AnimatedCounter value={50} />);
    
    const counter = screen.getByTestId('animated-counter');
    expect(counter).toBeInTheDocument();
  });

  test('handles optional props correctly', () => {
    render(<AnimatedCounter value={25} className="test-class" />);
    
    const counter = screen.getByTestId('animated-counter');
    expect(counter).toHaveClass('test-class');
  });

  test('properly types number props', () => {
    const value: number = 42;
    const duration: number = 1000;
    
    render(<AnimatedCounter value={value} duration={duration} />);
    
    const counter = screen.getByTestId('animated-counter');
    expect(counter).toBeInTheDocument();
  });

  test('properly types string props', () => {
    const label: string = 'Test Label';
    const className: string = 'test-class';
    
    render(<AnimatedCounter value={30} label={label} className={className} />);
    
    const counter = screen.getByTestId('animated-counter');
    expect(counter).toHaveClass(className);
  });
});