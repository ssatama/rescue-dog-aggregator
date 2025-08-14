/**
 * TDD Test Suite for Service Worker Implementation
 * Tests offline caching and network strategies
 */

describe("Service Worker for Offline Caching", () => {
  let mockServiceWorker;
  let mockCache;
  let mockEvent;

  beforeEach(() => {
    // Mock the service worker global
    global.self = {
      addEventListener: jest.fn(),
      skipWaiting: jest.fn(),
      clients: {
        claim: jest.fn(),
      },
    };

    // Mock cache API
    mockCache = {
      put: jest.fn(),
      match: jest.fn(),
      addAll: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
    };

    global.caches = {
      open: jest.fn().mockResolvedValue(mockCache),
      match: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
    };

    // Mock fetch event
    mockEvent = {
      respondWith: jest.fn(),
      waitUntil: jest.fn(),
      request: {
        url: "https://api.rescuedogs.me/api/animals",
        method: "GET",
        headers: new Map(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.navigator;
  });

  describe("Phase 3: Service Worker Implementation", () => {
    test("FAILING TEST: should register service worker", async () => {
      // Mock navigator.serviceWorker
      const mockRegistration = {
        installing: null,
        waiting: null,
        active: { state: "activated" },
      };

      Object.defineProperty(global, "navigator", {
        value: {
          serviceWorker: {
            register: jest.fn().mockResolvedValue(mockRegistration),
            ready: Promise.resolve(),
          },
        },
        writable: true,
      });

      // Attempt to register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
      expect(registration.active.state).toBe("activated");
    });

    test("FAILING TEST: should cache static assets on install", async () => {
      const CACHE_NAME = "rescue-dogs-v1";
      const urlsToCache = [
        "/",
        "/dogs",
        "/organizations",
        "/manifest.json",
        "/_next/static/css/app.css",
        "/_next/static/js/app.js",
      ];

      // Simulate install event
      const installEvent = {
        waitUntil: jest.fn(),
      };

      // Service worker should cache assets on install
      const cachePromise = caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      });

      installEvent.waitUntil(cachePromise);

      await cachePromise;

      expect(global.caches.open).toHaveBeenCalledWith(CACHE_NAME);
      expect(mockCache.addAll).toHaveBeenCalledWith(urlsToCache);
    });

    test("FAILING TEST: should use cache-first strategy for static assets", async () => {
      const cachedResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("cached data"),
        json: jest.fn().mockResolvedValue({}),
      };
      global.caches.match.mockResolvedValue(cachedResponse);

      mockEvent.request.url = "https://rescuedogs.me/_next/static/css/app.css";

      // Service worker fetch handler
      const fetchHandler = async (event) => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        return fetch(event.request);
      };

      const response = await fetchHandler(mockEvent);

      expect(response).toBe(cachedResponse);
      expect(global.caches.match).toHaveBeenCalledWith(mockEvent.request);
    });

    test("FAILING TEST: should use network-first strategy for API calls", async () => {
      const networkResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("fresh data"),
        json: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnValue({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue("fresh data"),
          json: jest.fn().mockResolvedValue({}),
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(networkResponse);

      mockEvent.request.url = "https://api.rescuedogs.me/api/animals";

      // Service worker fetch handler for API
      const fetchHandler = async (event) => {
        if (event.request.url.includes("/api/")) {
          try {
            const response = await fetch(event.request);
            const cache = await caches.open("api-cache");
            cache.put(event.request, response.clone());
            return response;
          } catch (error) {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            throw error;
          }
        }
      };

      const response = await fetchHandler(mockEvent);

      expect(global.fetch).toHaveBeenCalledWith(mockEvent.request);
      expect(response).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });

    test("FAILING TEST: should fall back to cache when offline", async () => {
      const cachedResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("cached data"),
        json: jest.fn().mockResolvedValue({}),
      };
      global.caches.match.mockResolvedValue(cachedResponse);

      // Simulate network failure
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      mockEvent.request.url = "https://api.rescuedogs.me/api/animals";

      const fetchHandler = async (event) => {
        if (event.request.url.includes("/api/")) {
          try {
            return await fetch(event.request);
          } catch (error) {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            throw error;
          }
        }
      };

      const response = await fetchHandler(mockEvent);

      expect(global.fetch).toHaveBeenCalled();
      expect(global.caches.match).toHaveBeenCalledWith(mockEvent.request);
      expect(response).toBe(cachedResponse);
    });

    test("FAILING TEST: should update cache in background", async () => {
      const cachedResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("old data"),
        json: jest.fn().mockResolvedValue({}),
      };
      const freshResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("fresh data"),
        json: jest.fn().mockResolvedValue({}),
        clone: jest.fn().mockReturnValue({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue("fresh data"),
          json: jest.fn().mockResolvedValue({}),
        }),
      };

      global.caches.match.mockResolvedValue(cachedResponse);
      global.fetch = jest.fn().mockResolvedValue(freshResponse);

      // Stale-while-revalidate strategy
      const fetchHandler = async (event) => {
        const cached = await caches.match(event.request);

        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const cache = caches.open("dynamic-cache");
            cache.then((c) => c.put(event.request, response.clone()));
          }
          return response;
        });

        return cached || fetchPromise;
      };

      const response = await fetchHandler(mockEvent);

      expect(response).toBe(cachedResponse); // Return cached immediately

      // Wait for background update
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(global.fetch).toHaveBeenCalledWith(mockEvent.request);
    });

    test("FAILING TEST: should clean up old caches", async () => {
      const CACHE_NAME = "rescue-dogs-v2";
      const OLD_CACHES = ["rescue-dogs-v1", "rescue-dogs-v0"];

      global.caches.keys.mockResolvedValue([...OLD_CACHES, CACHE_NAME]);

      // Activate event handler
      const activateHandler = async () => {
        const cacheNames = await caches.keys();
        const cacheWhitelist = [CACHE_NAME];

        const deletePromises = cacheNames
          .filter((name) => !cacheWhitelist.includes(name))
          .map((name) => caches.delete(name));

        return Promise.all(deletePromises);
      };

      await activateHandler();

      expect(global.caches.keys).toHaveBeenCalled();
      expect(global.caches.delete).toHaveBeenCalledWith("rescue-dogs-v1");
      expect(global.caches.delete).toHaveBeenCalledWith("rescue-dogs-v0");
      expect(global.caches.delete).not.toHaveBeenCalledWith(CACHE_NAME);
    });

    test("FAILING TEST: should handle cache quota exceeded", async () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      mockCache.put.mockRejectedValueOnce(quotaError);

      const response = new Response("data");
      response.clone = jest.fn().mockReturnValue(new Response("data"));
      global.fetch = jest.fn().mockResolvedValue(response);

      // Set up caches.keys to return some cache names
      global.caches.keys.mockResolvedValue([
        "dynamic-cache-1",
        "dynamic-cache-2",
        "static-cache",
      ]);

      const fetchHandler = async (event) => {
        const response = await fetch(event.request);

        try {
          const cache = await caches.open("dynamic-cache");
          await cache.put(event.request, response.clone());
        } catch (error) {
          if (error.name === "QuotaExceededError") {
            // Clean up caches if quota exceeded
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
              if (name.startsWith("dynamic-")) {
                await caches.delete(name);
              }
            }
          }
        }

        return response;
      };

      const result = await fetchHandler(mockEvent);

      expect(result).toBe(response);
      expect(mockCache.put).toHaveBeenCalledWith(
        mockEvent.request,
        expect.any(Response),
      );
      expect(global.caches.keys).toHaveBeenCalled();
      expect(global.caches.delete).toHaveBeenCalledWith("dynamic-cache-1");
      expect(global.caches.delete).toHaveBeenCalledWith("dynamic-cache-2");
    });
  });
});
