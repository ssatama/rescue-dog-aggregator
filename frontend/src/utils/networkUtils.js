/**
 * Network Utilities
 * 
 * Utilities for detecting network conditions and adapting image loading
 * strategies for better performance on slow connections.
 */

/**
 * Get network connection information
 * @returns {Object} Network connection details
 */
export function getNetworkInfo() {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return {
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }

  const connection = navigator.connection;
  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false
  };
}

/**
 * Determine if connection is slow
 * @returns {boolean} True if connection is considered slow
 */
export function isSlowConnection() {
  const { effectiveType, downlink, saveData } = getNetworkInfo();
  
  // User has explicitly enabled data saver
  if (saveData) {
    return true;
  }
  
  // Check effective connection type
  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return true;
  }
  
  // Check downlink speed (< 1 Mbps is considered slow)
  if (downlink !== null && downlink < 1) {
    return true;
  }
  
  return false;
}

/**
 * Get adaptive image quality based on network conditions
 * @returns {string} Cloudflare quality parameter
 */
export function getAdaptiveImageQuality() {
  const { effectiveType, downlink, saveData } = getNetworkInfo();
  
  // Data saver mode - use lowest quality
  if (saveData) {
    return 'q_60';
  }
  
  // Slow connections - use lower quality
  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return 'q_60';
  }
  
  // Very slow downlink - use lower quality
  if (downlink !== null && downlink < 0.5) {
    return 'q_60';
  }
  
  // Moderate connections - use medium quality
  if (effectiveType === '3g' || (downlink !== null && downlink < 2)) {
    return 'q_75';
  }
  
  // Fast connections - use auto quality
  return 'q_auto';
}

/**
 * Get adaptive image dimensions based on network conditions
 * @param {string} context - Image context ('hero', 'catalog', 'thumbnail')
 * @returns {Object} Width and height parameters
 */
export function getAdaptiveImageDimensions(context = 'catalog') {
  const isSlowNet = isSlowConnection();
  
  const dimensions = {
    hero: {
      fast: { width: 900, height: 400 },
      slow: { width: 675, height: 300 }
    },
    catalog: {
      fast: { width: 400, height: 300 },
      slow: { width: 300, height: 225 }
    },
    thumbnail: {
      fast: { width: 200, height: 200 },
      slow: { width: 150, height: 150 }
    }
  };
  
  const contextDimensions = dimensions[context] || dimensions.catalog;
  return isSlowNet ? contextDimensions.slow : contextDimensions.fast;
}

/**
 * Get timeout duration based on network conditions
 * @returns {number} Timeout in milliseconds
 */
export function getAdaptiveTimeout() {
  const { effectiveType, rtt } = getNetworkInfo();
  
  // Base timeout
  let timeout = 15000; // 15 seconds
  
  // Adjust based on connection type
  switch (effectiveType) {
    case 'slow-2g':
      timeout = 30000; // 30 seconds
      break;
    case '2g':
      timeout = 25000; // 25 seconds
      break;
    case '3g':
      timeout = 20000; // 20 seconds
      break;
    case '4g':
      timeout = 10000; // 10 seconds
      break;
  }
  
  // Adjust based on RTT (round trip time)
  if (rtt !== null) {
    if (rtt > 1000) {
      timeout += 10000; // Add 10 seconds for high latency
    } else if (rtt < 100) {
      timeout = Math.max(timeout - 5000, 5000); // Reduce timeout for low latency
    }
  }
  
  return timeout;
}

/**
 * Determine if progressive loading should be used
 * @returns {boolean} True if progressive loading is recommended
 */
export function shouldUseProgressiveLoading() {
  const { saveData } = getNetworkInfo();
  
  // Don't use progressive loading on data saver (extra requests)
  if (saveData) {
    return false;
  }
  
  // Use progressive loading on slow connections for perceived performance
  return isSlowConnection();
}

/**
 * Get retry configuration based on network conditions
 * @returns {Object} Retry configuration
 */
export function getAdaptiveRetryConfig() {
  const isSlowNet = isSlowConnection();
  const { effectiveType } = getNetworkInfo();
  
  return {
    maxRetries: isSlowNet ? 3 : 2, // More retries on slow connections
    baseDelay: effectiveType === '2g' ? 2000 : 1000, // Longer delays on very slow connections
    backoffMultiplier: 2
  };
}

/**
 * Monitor network changes and call callback when network conditions change
 * @param {Function} callback - Function to call when network changes
 * @returns {Function} Cleanup function
 */
export function onNetworkChange(callback) {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return () => {}; // No cleanup needed
  }
  
  const connection = navigator.connection;
  
  const handleChange = () => {
    callback(getNetworkInfo());
  };
  
  connection.addEventListener('change', handleChange);
  
  return () => {
    connection.removeEventListener('change', handleChange);
  };
}

/**
 * Preload critical images with network-aware strategy
 * @param {Array<string>} urls - Image URLs to preload
 * @param {string} context - Image context
 */
export function preloadImagesAdaptive(urls, context = 'catalog') {
  if (!Array.isArray(urls) || urls.length === 0) return;
  
  const isSlowNet = isSlowConnection();
  
  // Don't preload on very slow connections to save bandwidth
  if (isSlowNet) {
    return;
  }
  
  // Limit number of preloaded images based on connection
  const maxPreload = getNetworkInfo().effectiveType === '4g' ? urls.length : Math.min(urls.length, 3);
  
  urls.slice(0, maxPreload).forEach(url => {
    if (!url || typeof url !== 'string') return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      
      // Add responsive image hints for better caching
      if (context === 'hero') {
        link.setAttribute('imagesizes', '(max-width: 768px) 100vw, 800px');
      }
      
      document.head.appendChild(link);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.warn('Preload failed for:', url);
    }
  });
}

/**
 * Get loading strategy based on network conditions
 * @param {string} context - Image context
 * @returns {Object} Loading strategy configuration
 */
export function getLoadingStrategy(context = 'catalog') {
  const isSlowNet = isSlowConnection();
  const { saveData } = getNetworkInfo();
  
  return {
    // Use lazy loading more aggressively on slow connections
    loading: (context === 'hero' && !isSlowNet) ? 'eager' : 'lazy',
    
    // Use progressive loading on slow connections for perceived performance
    useProgressive: shouldUseProgressiveLoading(),
    
    // Adjust quality based on network
    quality: getAdaptiveImageQuality(),
    
    // Adjust dimensions based on network
    dimensions: getAdaptiveImageDimensions(context),
    
    // Adjust timeout based on network
    timeout: getAdaptiveTimeout(),
    
    // Adjust retry configuration
    retry: getAdaptiveRetryConfig(),
    
    // Skip non-critical optimizations on data saver
    skipOptimizations: saveData
  };
}