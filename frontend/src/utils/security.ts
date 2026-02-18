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

export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";

  if (typeof window === "undefined") {
    let result = html;
    let prev: string;
    do {
      prev = result;
      result = result.replace(/<[^>]*>?/g, "");
    } while (result !== prev);
    return result;
  }

  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}

export function sanitizeText(text: string | null | undefined): string {
  if (typeof text !== "string") return "";

  const entityMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (s) => entityMap[s]);
}

export function validateUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    const urlObj = new URL(url);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
    return allowedProtocols.includes(urlObj.protocol.toLowerCase());
  } catch {
    return false;
  }
}

interface SafeLinkOptions {
  target?: string;
  rel?: string;
  className?: string;
}

interface SafeLinkResult {
  href: string;
  text: string;
  target: string;
  rel: string;
  className: string;
}

export function createSafeLink(
  url: string,
  text: string,
  options: SafeLinkOptions = {},
): string | SafeLinkResult {
  if (!validateUrl(url)) {
    return text;
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

export function sanitizeUserInput(input: unknown): unknown {
  if (typeof input === "string") {
    return sanitizeText(input.trim());
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUserInput(item));
  }

  if (input && typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeText(key)] = sanitizeUserInput(value);
    }
    return sanitized;
  }

  return input;
}

export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);
    const allowedProtocols = ["http:", "https:"];

    if (!allowedProtocols.includes(urlObj.protocol.toLowerCase())) {
      console.warn(
        `[Security] Blocked dangerous URL protocol: ${urlObj.protocol} in ${url}`,
      );
      return null;
    }

    if (
      urlObj.hostname === "localhost" ||
      urlObj.hostname.startsWith("127.") ||
      urlObj.hostname.startsWith("192.168.")
    ) {
      console.warn(`[Security] Blocked private network URL: ${url}`);
      return null;
    }

    return url;
  } catch {
    console.warn(`[Security] Invalid URL format: ${url}`);
    return null;
  }
}

export const CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  fontSrc: ["'self'", "fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

export function generateCSPHeader(): string {
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
