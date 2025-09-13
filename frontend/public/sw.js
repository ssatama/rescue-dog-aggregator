/**
 * Service Worker for Rescue Dogs Aggregator
 * Implements offline caching with smart network strategies
 */

// Import Sentry for error reporting
importScripts('https://browser.sentry-cdn.com/7.118.0/bundle.min.js');

const CACHE_VERSION = 'v1';
const CACHE_NAME = `rescue-dogs-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;

// Get API base URL from environment or fallback to production
const getApiDomain = () => {
  if (typeof self !== 'undefined' && self.location) {
    const hostname = self.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost:8000';
    }
  }
  return 'api.rescuedogs.me';
};

const API_DOMAIN = getApiDomain();

// Initialize Sentry in service worker - using environment DSN
if (typeof Sentry !== 'undefined') {
  // Get DSN from message from main thread (safer than hardcoding)
  let sentryDsn = null;
  
  // Listen for configuration from main thread
  self.addEventListener('message', (event) => {
    if (event.data?.action === 'configureSentry' && event.data?.dsn) {
      sentryDsn = event.data.dsn;
      initializeSentry();
    }
  });
  
  function initializeSentry() {
    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        environment: self.location.hostname === 'www.rescuedogs.me' ? 'production' : 'development',
        integrations: [],
        beforeSend(event) {
          // Add service worker context
          event.tags = event.tags || {};
          event.tags.source = 'service_worker';
          event.tags.cache_version = CACHE_VERSION;
          return event;
        }
      });
    }
  }
}

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dogs',
  '/organizations',
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return (name.startsWith('rescue-dogs-') && name !== CACHE_NAME) ||
                   (name.startsWith('api-cache-') && name !== API_CACHE) ||
                   (name.startsWith('image-cache-') && name !== IMAGE_CACHE) ||
                   (name.startsWith('dynamic-cache-') && name !== DYNAMIC_CACHE);
          })
          .map(name => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip browser extensions and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip chrome-extension and other browser extension schemes
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:' || url.protocol === 'safari-extension:') {
    return;
  }

  // API requests - Network first, fall back to cache
  if (url.pathname.startsWith('/api/') || url.hostname === API_DOMAIN) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE, 8000) // 8 second timeout for Safari compatibility
    );
    return;
  }

  // Image requests - Cache first, then network
  if (isImageRequest(request)) {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // Next.js static assets - Cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      cacheFirstStrategy(request, CACHE_NAME)
    );
    return;
  }

  // HTML pages - Network first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      networkFirstStrategy(request, DYNAMIC_CACHE, 3000) // 3 second timeout
    );
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(
    staleWhileRevalidate(request, DYNAMIC_CACHE)
  );
});

// Network first strategy with timeout
async function networkFirstStrategy(request, cacheName, timeout = 5000) {
  try {
    const networkResponse = await fetchWithTimeout(request, timeout);
    
    if (networkResponse.ok) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('[ServiceWorker] Cache put failed:', cacheError);
        // Continue without caching
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, falling back to cache:', error);
    
    // Report Safari-specific network errors to Sentry
    if (typeof Sentry !== 'undefined') {
      const userAgent = self.navigator?.userAgent || 'unknown';
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      
      Sentry.captureException(error, {
        tags: {
          source: 'service_worker_network',
          browser: isSafari ? 'safari' : 'other',
          url: request.url,
          timeout: timeout
        },
        extra: {
          requestUrl: request.url,
          userAgent: userAgent,
          cacheName: cacheName,
          timeoutMs: timeout
        }
      });
    }
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html') || 
             new Response('Offline - Please check your connection', {
               status: 503,
               headers: { 'Content-Type': 'text/plain' }
             });
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cacheName);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('[ServiceWorker] Cache put failed:', cacheError);
        // Continue without caching
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed for:', request.url);
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      // Clone the response before using it since we need it both for cache and return
      const responseToCache = response.clone();
      caches.open(cacheName).then(cache => {
        return cache.put(request, responseToCache);
      }).catch(cacheError => {
        console.log('[ServiceWorker] Cache put failed:', cacheError);
        // Silent fail for background updates
      });
    }
    return response;
  }).catch(error => {
    console.log('[ServiceWorker] Revalidation failed:', error);
    return cachedResponse || error;
  });
  
  return cachedResponse || fetchPromise;
}

// Fetch with timeout
function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);
    
    fetch(request)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Fetch and cache in background
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
      } catch (cacheError) {
        console.log('[ServiceWorker] Background cache put failed:', cacheError);
        // Silent fail for background updates
      }
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Check if request is for an image
function isImageRequest(request) {
  const url = new URL(request.url);
  return url.hostname === 'images.rescuedogs.me' ||
         url.hostname === 'flagcdn.com' ||
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

// Handle quota exceeded errors
async function cleanupCaches() {
  const cacheNames = await caches.keys();
  const dynamicCaches = cacheNames.filter(name => name.startsWith('dynamic-'));
  
  // Delete oldest dynamic caches first
  for (const name of dynamicCaches) {
    await caches.delete(name);
  }
  
  // Clear old entries from image cache
  const imageCache = await caches.open(IMAGE_CACHE);
  const requests = await imageCache.keys();
  
  // Keep only the most recent 50 images
  if (requests.length > 50) {
    const toDelete = requests.slice(0, requests.length - 50);
    for (const request of toDelete) {
      await imageCache.delete(request);
    }
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data?.action === 'cleanupCaches') {
    cleanupCaches();
  }
});