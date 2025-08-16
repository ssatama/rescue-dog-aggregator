import { useState, useCallback } from "react";
import { reportError } from "../utils/logger";
import { validateUrl, sanitizeText } from "../utils/security";
import { useToast } from "../contexts/ToastContext";

export interface UseShareOptions {
  /** URL to share */
  url?: string;
  /** Title of the content */
  title?: string;
  /** Text content to share */
  text?: string;
}

export interface UseShareReturn {
  /** Whether link was recently copied */
  copied: boolean;
  /** Safe sanitized URL */
  safeUrl: string;
  /** Safe sanitized title */
  safeTitle: string;
  /** Safe sanitized text */
  safeText: string;
  /** Whether native share is available */
  hasNativeShare: boolean;
  /** Native share handler */
  handleNativeShare: () => Promise<void>;
  /** Copy link handler */
  handleCopyLink: () => Promise<void>;
  /** Social share handler */
  handleSocialShare: (platform: "facebook" | "x" | "whatsapp") => void;
}

/**
 * Hook for sharing functionality with native and social share support
 */
export function useShare(options: UseShareOptions = {}): UseShareReturn {
  const { url, title, text } = options;
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // Sanitize and validate inputs
  const safeUrl =
    url && validateUrl(url)
      ? url
      : typeof window !== "undefined"
        ? window.location.href
        : "";
  const safeTitle = sanitizeText(title || "");
  const safeText = sanitizeText(text || "");

  // Check if native share is available
  const hasNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  const handleNativeShare = useCallback(async () => {
    if (hasNativeShare) {
      try {
        await navigator.share({
          title: safeTitle,
          text: safeText,
          url: safeUrl,
        });
        showToast("success", "Share successful!");
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          reportError("Error sharing", {
            error: err.message,
            url: safeUrl,
            title: safeTitle,
          });
          showToast("error", "Share failed. Please try again.");
        }
      }
    }
  }, [hasNativeShare, safeTitle, safeText, safeUrl, showToast]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      showToast("success", "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      reportError("Failed to copy link", { error: errorMessage, url: safeUrl });
      showToast("error", "Failed to copy link. Please try again.");
    }
  }, [safeUrl, showToast]);

  const handleSocialShare = useCallback(
    (platform: "facebook" | "x" | "whatsapp") => {
      const encodedUrl = encodeURIComponent(safeUrl);
      const encodedText = encodeURIComponent(safeText);

      const urls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      };

      const platformNames = {
        facebook: "Facebook",
        x: "X (Twitter)",
        whatsapp: "WhatsApp",
      };

      try {
        window.open(urls[platform], "_blank", "width=600,height=400");
        showToast("success", `Opening share on ${platformNames[platform]}...`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        reportError("Failed to open social share", {
          error: errorMessage,
          platform,
        });
        showToast("error", "Failed to open share dialog. Please try again.");
      }
    },
    [safeUrl, safeText, showToast],
  );

  return {
    copied,
    safeUrl,
    safeTitle,
    safeText,
    hasNativeShare,
    handleNativeShare,
    handleCopyLink,
    handleSocialShare,
  };
}
