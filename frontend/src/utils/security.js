/**
 * Security utilities for content sanitization and XSS prevention
 */

// Simple HTML sanitizer - removes dangerous tags and attributes
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  
  // Remove script tags and their content (including malformed ones)
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<script\b[^>]*>[\s\S]*$/gi, ''); // Handle unclosed script tags
  
  // Remove dangerous attributes (on* events, style with javascript, etc.)
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s+style\s*=\s*["'][^"']*javascript[^"']*["']/gi, '');
  
  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'link', 'meta', 'base'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    html = html.replace(regex, '');
  });
  
  return html;
}

// Escape HTML entities to prevent XSS
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (s) => entityMap[s]);
}

// Validate URLs to prevent dangerous protocols
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(urlObj.protocol.toLowerCase());
  } catch (error) {
    return false;
  }
}

// Safe link renderer that validates URLs
export function createSafeLink(url, text, options = {}) {
  if (!validateUrl(url)) {
    return text; // Return just text if URL is invalid
  }
  
  const { target = '_blank', rel = 'noopener noreferrer', className = '' } = options;
  const safeText = sanitizeText(text);
  const safeUrl = encodeURI(url);
  
  return {
    href: safeUrl,
    text: safeText,
    target,
    rel,
    className
  };
}

// Sanitize user input data
export function sanitizeUserInput(input) {
  if (typeof input === 'string') {
    return sanitizeText(input.trim());
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeUserInput(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeText(key)] = sanitizeUserInput(value);
    }
    return sanitized;
  }
  
  return input;
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Note: unsafe-inline should be removed in production
  styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
  fontSrc: ["'self'", 'fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"]
};

export function generateCSPHeader() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const camelToKebab = directive.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      return `${camelToKebab} ${sources.join(' ')}`;
    })
    .join('; ');
}