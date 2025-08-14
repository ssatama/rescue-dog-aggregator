/**
 * TDD Test Suite for Service Worker Registration Component
 * Tests the registration and update handling of the service worker
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ServiceWorkerRegistration from '../../components/ServiceWorkerRegistration';
import '@testing-library/jest-dom';

describe('ServiceWorkerRegistration Component', () => {
  let originalNavigator;
  let mockRegister;
  let mockServiceWorker;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Mock service worker registration
    mockRegister = jest.fn();
    mockServiceWorker = {
      register: mockRegister,
      ready: Promise.resolve(),
    };

    // Mock navigator with service worker
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorker,
      },
      writable: true,
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore original navigator
    global.navigator = originalNavigator;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Service Worker Registration', () => {
    test('FAILING TEST: should register service worker on mount in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockRegister.mockResolvedValue({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
      });

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      expect(console.log).toHaveBeenCalledWith('[SW] Service Worker registered successfully');

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should not register service worker in development', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<ServiceWorkerRegistration />);

      expect(mockRegister).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should handle registration errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Registration failed');
      mockRegister.mockRejectedValue(error);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('[SW] Service Worker registration failed:', error);
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should handle browsers without service worker support', () => {
      // Remove service worker from navigator
      Object.defineProperty(global, 'navigator', {
        value: {
          ...originalNavigator,
          serviceWorker: undefined,
        },
        writable: true,
      });

      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<ServiceWorkerRegistration />);

      expect(console.log).toHaveBeenCalledWith('[SW] Service Workers not supported');

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should handle service worker updates', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUpdate = jest.fn();
      const registration = {
        installing: null,
        waiting: { postMessage: jest.fn() },
        active: { state: 'activated' },
        update: mockUpdate,
        addEventListener: jest.fn(),
      };

      mockRegister.mockResolvedValue(registration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      // Should listen for updates
      expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should skip waiting when new service worker is available', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockPostMessage = jest.fn();
      const registration = {
        installing: null,
        waiting: { 
          postMessage: mockPostMessage,
          state: 'installed'
        },
        active: null,
        addEventListener: jest.fn(),
      };

      mockRegister.mockResolvedValue(registration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      // Should send skip waiting message to waiting worker
      expect(mockPostMessage).toHaveBeenCalledWith({ action: 'skipWaiting' });

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should reload page when service worker controller changes', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      const registration = {
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        addEventListener: jest.fn(),
      };

      mockRegister.mockResolvedValue(registration);

      // Add controllerchange event listener mock
      mockServiceWorker.addEventListener = jest.fn();

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      // Should listen for controller changes
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));

      // Simulate controller change
      const controllerChangeHandler = mockServiceWorker.addEventListener.mock.calls[0][1];
      controllerChangeHandler();

      expect(mockReload).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should check for updates periodically', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      jest.useFakeTimers();

      const mockUpdate = jest.fn();
      const registration = {
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        update: mockUpdate,
        addEventListener: jest.fn(),
      };

      mockRegister.mockResolvedValue(registration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      // Fast-forward 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(mockUpdate).toHaveBeenCalled();

      jest.useRealTimers();
      process.env.NODE_ENV = originalEnv;
    });

    test('FAILING TEST: should not render any visible UI', () => {
      const { container } = render(<ServiceWorkerRegistration />);
      
      // Component should not render anything visible
      expect(container.firstChild).toBeNull();
    });
  });
});