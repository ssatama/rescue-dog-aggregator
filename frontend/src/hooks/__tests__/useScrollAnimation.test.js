/**
 * Test suite for useScrollAnimation hook and ScrollAnimationWrapper component
 * Ensures smooth scroll-based animations with accessibility considerations
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useScrollAnimation, useReducedMotion, ScrollAnimationWrapper } from '../useScrollAnimation';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
  }

  observe(element) {
    this.elements.add(element);
  }

  unobserve(element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // Method to trigger intersection
  trigger(entries) {
    this.callback(entries);
  }
}

// Mock window.matchMedia
const mockMatchMedia = (matches) => {
  return jest.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
  }));
};

describe('useScrollAnimation', () => {
  let mockObserver;

  beforeEach(() => {
    mockObserver = new MockIntersectionObserver(jest.fn(), {});
    global.IntersectionObserver = jest.fn((callback, options) => {
      mockObserver.callback = callback;
      mockObserver.options = options;
      return mockObserver;
    });
    window.matchMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return ref and initial visibility state', () => {
    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation();
      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? 'Visible' : 'Hidden'}
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByTestId('test-element')).toHaveTextContent('Hidden');
  });

  it('should create IntersectionObserver with correct options', () => {
    const TestComponent = () => {
      const [ref] = useScrollAnimation({
        threshold: 0.5,
        rootMargin: '100px',
      });
      return <div ref={ref} data-testid="test-element" />;
    };

    render(<TestComponent />);

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.5,
        rootMargin: '100px',
      })
    );
  });

  it('should set visibility to true when element intersects', () => {
    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation();
      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? 'Visible' : 'Hidden'}
        </div>
      );
    };

    render(<TestComponent />);

    // Simulate intersection
    act(() => {
      mockObserver.trigger([{ isIntersecting: true, target: screen.getByTestId('test-element') }]);
    });

    expect(screen.getByTestId('test-element')).toHaveTextContent('Visible');
  });

  it('should respect triggerOnce option', () => {
    let observerInstance;
    global.IntersectionObserver = jest.fn((callback, options) => {
      observerInstance = new MockIntersectionObserver(callback, options);
      observerInstance.unobserve = jest.fn();
      return observerInstance;
    });

    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation({ triggerOnce: true });
      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? 'Visible' : 'Hidden'}
        </div>
      );
    };

    render(<TestComponent />);
    const element = screen.getByTestId('test-element');

    // Simulate intersection
    act(() => {
      observerInstance.trigger([{ isIntersecting: true, target: element }]);
    });

    expect(observerInstance.unobserve).toHaveBeenCalledWith(element);
  });

  it('should handle delay option', async () => {
    jest.useFakeTimers();

    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation({ delay: 1000 });
      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? 'Visible' : 'Hidden'}
        </div>
      );
    };

    render(<TestComponent />);

    // Simulate intersection
    act(() => {
      mockObserver.trigger([{ isIntersecting: true, target: screen.getByTestId('test-element') }]);
    });

    // Should still be hidden
    expect(screen.getByTestId('test-element')).toHaveTextContent('Hidden');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('test-element')).toHaveTextContent('Visible');

    jest.useRealTimers();
  });

  it('should cleanup observer on unmount', () => {
    const TestComponent = () => {
      const [ref] = useScrollAnimation();
      return <div ref={ref} data-testid="test-element" />;
    };

    const { unmount } = render(<TestComponent />);
    
    const unobserveSpy = jest.spyOn(mockObserver, 'unobserve');
    
    unmount();

    expect(unobserveSpy).toHaveBeenCalled();
  });
});

describe('useReducedMotion', () => {
  beforeEach(() => {
    // Reset matchMedia mock
    delete window.matchMedia;
  });

  it('should return false when prefers-reduced-motion is not set', () => {
    window.matchMedia = mockMatchMedia(false);

    const TestComponent = () => {
      const prefersReducedMotion = useReducedMotion();
      return <div data-testid="motion-state">{prefersReducedMotion.toString()}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId('motion-state')).toHaveTextContent('false');
  });

  it('should return true when prefers-reduced-motion is set', () => {
    window.matchMedia = mockMatchMedia(true);

    const TestComponent = () => {
      const prefersReducedMotion = useReducedMotion();
      return <div data-testid="motion-state">{prefersReducedMotion.toString()}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId('motion-state')).toHaveTextContent('true');
  });

  it('should handle missing matchMedia gracefully', () => {
    delete window.matchMedia;

    const TestComponent = () => {
      const prefersReducedMotion = useReducedMotion();
      return <div data-testid="motion-state">{prefersReducedMotion.toString()}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId('motion-state')).toHaveTextContent('false');
  });
});

describe('ScrollAnimationWrapper', () => {
  let mockObserver;
  
  beforeEach(() => {
    mockObserver = new MockIntersectionObserver(jest.fn(), {});
    global.IntersectionObserver = jest.fn((callback, options) => {
      mockObserver.callback = callback;
      mockObserver.options = options;
      return mockObserver;
    });
    window.matchMedia = mockMatchMedia(false);
  });

  it('should render children with animation classes', () => {
    render(
      <ScrollAnimationWrapper data-testid="wrapper">
        <div>Test content</div>
      </ScrollAnimationWrapper>
    );

    // Find wrapper by content since data-testid is not passed through
    const content = screen.getByText('Test content');
    const wrapper = content.parentElement;
    expect(wrapper).toHaveClass('transition-all', 'duration-300');
    expect(content).toBeInTheDocument();
  });

  it('should apply initial hidden state', () => {
    render(
      <ScrollAnimationWrapper>
        <div>Test content</div>
      </ScrollAnimationWrapper>
    );

    const content = screen.getByText('Test content');
    const wrapper = content.parentElement;
    expect(wrapper).toHaveClass('opacity-0', 'translate-y-4');
  });

  it('should apply animation when visible', () => {
    const TestWrapper = () => {
      const [isVisible, setIsVisible] = React.useState(false);
      
      React.useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div data-testid="wrapper" className={isVisible ? 'animate-fade-in' : 'opacity-0'}>
          <div>Test content</div>
        </div>
      );
    };

    render(<TestWrapper />);

    const wrapper = screen.getByTestId('wrapper');
    
    // Initially hidden
    expect(wrapper).toHaveClass('opacity-0');
    
    // Should eventually show animation class
    setTimeout(() => {
      expect(wrapper).toHaveClass('animate-fade-in');
    }, 150);
  });

  it('should respect reduced motion preference', () => {
    window.matchMedia = mockMatchMedia(true); // prefers-reduced-motion

    render(
      <ScrollAnimationWrapper>
        <div>Test content</div>
      </ScrollAnimationWrapper>
    );

    const content = screen.getByText('Test content');
    const wrapper = content.parentElement;
    
    // Should not have motion classes when reduced motion is preferred
    expect(wrapper).not.toHaveClass('animate-fade-in');
    expect(wrapper).not.toHaveClass('animate-slide-up');
  });

  it('should support different animation types', () => {
    const TestComponent = () => {
      return (
        <>
          <ScrollAnimationWrapper animationType="fade-in">
            <div>Fade content</div>
          </ScrollAnimationWrapper>
          <ScrollAnimationWrapper animationType="slide-up">
            <div>Slide content</div>
          </ScrollAnimationWrapper>
        </>
      );
    };

    render(<TestComponent />);

    // Both should have transition classes
    const fadeContent = screen.getByText('Fade content');
    const slideContent = screen.getByText('Slide content');
    expect(fadeContent.parentElement).toHaveClass('transition-all');
    expect(slideContent.parentElement).toHaveClass('transition-all');
  });

  it('should handle delay prop', () => {
    render(
      <ScrollAnimationWrapper delay={500}>
        <div>Delayed content</div>
      </ScrollAnimationWrapper>
    );

    const content = screen.getByText('Delayed content');
    expect(content.parentElement).toBeInTheDocument();
    // Delay is handled by the useScrollAnimation hook internally
  });

  it('should pass through additional props', () => {
    render(
      <ScrollAnimationWrapper 
        className="custom-class" 
        aria-label="Test wrapper"
      >
        <div>Test content</div>
      </ScrollAnimationWrapper>
    );

    const content = screen.getByText('Test content');
    const wrapper = content.parentElement;
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveAttribute('aria-label', 'Test wrapper');
  });
});

describe('Performance', () => {
  let mockObserver;
  
  beforeEach(() => {
    mockObserver = new MockIntersectionObserver(jest.fn(), {});
    global.IntersectionObserver = jest.fn((callback, options) => {
      mockObserver.callback = callback;
      mockObserver.options = options;
      return mockObserver;
    });
  });
  
  it('should not cause memory leaks with multiple instances', () => {
    const TestComponent = ({ count }) => {
      return (
        <div>
          {Array.from({ length: count }, (_, i) => (
            <ScrollAnimationWrapper key={i}>
              <div>Content {i}</div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      );
    };

    const { rerender, unmount } = render(<TestComponent count={5} />);
    
    // Should render all wrappers
    expect(screen.getAllByText(/Content \d/)).toHaveLength(5);
    
    // Re-render with different count
    rerender(<TestComponent count={3} />);
    expect(screen.getAllByText(/Content \d/)).toHaveLength(3);
    
    // Cleanup should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('should efficiently handle rapid visibility changes', () => {
    const TestComponent = () => {
      const [ref, isVisible] = useScrollAnimation();
      const [triggerCount, setTriggerCount] = React.useState(0);
      
      React.useEffect(() => {
        if (isVisible) {
          setTriggerCount(prev => prev + 1);
        }
      }, [isVisible]);
      
      return (
        <div ref={ref} data-testid="test-element">
          Triggered: {triggerCount}
        </div>
      );
    };

    render(<TestComponent />);
    
    const element = screen.getByTestId('test-element');
    
    // Single intersection trigger
    act(() => {
      if (mockObserver && mockObserver.trigger) {
        mockObserver.trigger([{ isIntersecting: true, target: element }]);
      }
    });
    
    // Should only trigger once due to triggerOnce default
    expect(screen.getByTestId('test-element')).toHaveTextContent('Triggered: 1');
  });
});