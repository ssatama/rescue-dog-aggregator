/**
 * Service Worker for Rescue Dogs Aggregator
 * Implements offline caching with smart network strategies
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `rescue-dogs-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dogs',
  '/organizations',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
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

  // API requests - Network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE, 5000) // 5 second timeout
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
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, falling back to cache:', error);
    
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
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
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
      caches.open(cacheName).then(cache => {
        cache.put(request, response.clone());
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
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
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