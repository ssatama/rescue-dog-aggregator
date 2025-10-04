import { renderHook } from '@testing-library/react';
import { useActiveSection } from '../useActiveSection';

describe('useActiveSection', () => {
  let mockObserve: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    mockObserve = jest.fn();
    mockDisconnect = jest.fn();

    global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: jest.fn(),
      takeRecords: jest.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns first section ID as initial active section', () => {
    const sectionIds = ['intro', 'benefits', 'conclusion'];
    const { result } = renderHook(() => useActiveSection(sectionIds));
    expect(result.current).toBe('intro');
  });

  it('creates IntersectionObserver with correct rootMargin', () => {
    const sectionIds = ['intro', 'benefits'];
    renderHook(() => useActiveSection(sectionIds));

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { rootMargin: '-20% 0% -35% 0%' }
    );
  });

  it('observes all section elements', () => {
    const sectionIds = ['intro', 'benefits', 'conclusion'];

    // Mock DOM elements
    sectionIds.forEach(id => {
      const element = document.createElement('div');
      element.id = id;
      document.body.appendChild(element);
    });

    renderHook(() => useActiveSection(sectionIds));

    expect(mockObserve).toHaveBeenCalledTimes(3);
  });

  it('disconnects observer on unmount', () => {
    const sectionIds = ['intro'];
    const { unmount } = renderHook(() => useActiveSection(sectionIds));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('handles empty section IDs array', () => {
    const { result } = renderHook(() => useActiveSection([]));
    expect(result.current).toBe('');
  });
});
