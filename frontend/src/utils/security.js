/**
 * Security utilities for content sanitization and XSS prevention
 */

import DOMPurify from "dompurify";

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "b",
    "i",
    "em",
    "strong",
    "a",
    "ul",
    "ol",
    "li",
    "img",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt"],
};

export function sanitizeHtml(html) {
  if (typeof html !== "string") return "";

  if (typeof window === "undefined") {
    // Server-side: strip all tags using iterative approach
    // This prevents bypass attacks with nested/malformed tags like <scri<script>pt>
    let result = html;
    let prev;
    do {
      prev = result;
      result = result.replace(/<[^>]*>?/g, "");
    } while (result !== prev);
    return result;
  }

  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}

// Escape HTML entities to prevent XSS
export function sanitizeText(text) {
  if (typeof text !== "string") return "";

  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (s) => entityMap[s]);
}

// Validate URLs to prevent dangerous protocols
export function validateUrl(url) {
  if (!url || typeof url !== "string") return false;

  try {
    const urlObj = new URL(url);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
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

  const {
    target = "_blank",
    rel = "noopener noreferrer",
    className = "",
  } = options;
  const safeText = sanitizeText(text);
  const safeUrl = encodeURI(url);

  return {
    href: safeUrl,
    text: safeText,
    target,
    rel,
    className,
  };
}

// Sanitize user input data
export function sanitizeUserInput(input) {
  if (typeof input === "string") {
    return sanitizeText(input.trim());
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUserInput(item));
  }

  if (input && typeof input === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeText(key)] = sanitizeUserInput(value);
    }
    return sanitized;
  }

  return input;
}

// Safe external URL validation with strict protocol checking
export function safeExternalUrl(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);
    // Only allow http and https for external URLs
    const allowedProtocols = ["http:", "https:"];

    if (!allowedProtocols.includes(urlObj.protocol.toLowerCase())) {
      console.warn(
        `[Security] Blocked dangerous URL protocol: ${urlObj.protocol} in ${url}`,
      );
      return null;
    }

    // Additional checks for malicious URLs
    if (
      urlObj.hostname === "localhost" ||
      urlObj.hostname.startsWith("127.") ||
      urlObj.hostname.startsWith("192.168.")
    ) {
      console.warn(`[Security] Blocked private network URL: ${url}`);
      return null;
    }

    return url;
  } catch (error) {
    console.warn(`[Security] Invalid URL format: ${url}`);
    return null;
  }
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Note: unsafe-inline should be removed in production
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  fontSrc: ["'self'", "fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

export function generateCSPHeader() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const camelToKebab = directive.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      return `${camelToKebab} ${sources.join(" ")}`;
    })
    .join("; ");
}
