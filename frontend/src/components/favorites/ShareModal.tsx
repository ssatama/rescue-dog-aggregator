"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Copy,
  Mail,
  MessageCircle,
  MessageSquare,
  Shield,
} from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "../../contexts/ToastContext";

interface ShareModalProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

export function ShareModal({ isOpen, url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trap (basic implementation)
  useEffect(() => {
    if (!isOpen) return;

    const modal = document.getElementById("share-modal");
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    // Focus first element when modal opens
    setTimeout(() => firstElement?.focus(), 100);

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener("keydown", handleTabKey);
    return () => modal.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("success", "Link copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showToast("error", "Failed to copy link");
    }
  }, [url, showToast]);

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent("Check out my favorite rescue dogs");
    const body = encodeURIComponent(
      `I've collected some amazing rescue dogs that need homes! View them here: ${url}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [url]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(
      `Check out my favorite rescue dogs! 🐕 View them here: ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [url]);

  const handleSMSShare = useCallback(() => {
    const body = encodeURIComponent(
      `Check out my favorite rescue dogs! View them here: ${url}`,
    );
    // Note: SMS protocol support varies by device/OS
    window.open(`sms:?body=${body}`, "_blank");
  }, [url]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
        data-testid="modal-backdrop"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div
          id="share-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto animate-slide-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 id="share-modal-title" className="text-xl font-semibold">
              Share Your Favorites
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Share this collection with others who might help these dogs find
            homes.
          </p>

          {/* URL Display */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="bg-transparent flex-1 text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                aria-label="Copy link"
                className="shrink-0"
              >
                {copied ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <Copy size={16} />
                )}
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share via:
            </h3>

            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full justify-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Copy link"
              >
                <Copy size={18} />
                <span>Copy Link</span>
                {copied && (
                  <span className="ml-auto text-green-600 text-sm">
                    Copied!
                  </span>
                )}
              </Button>

              <Button
                onClick={handleEmailShare}
                variant="outline"
                className="w-full justify-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Share via Email"
              >
                <Mail size={18} />
                <span>Email</span>
              </Button>

              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="w-full justify-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Share via WhatsApp"
              >
                <MessageCircle size={18} />
                <span>WhatsApp</span>
              </Button>

              <Button
                onClick={handleSMSShare}
                variant="outline"
                className="w-full justify-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Share via SMS"
              >
                <MessageSquare size={18} />
                <span>Text Message</span>
              </Button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Shield
                size={16}
                className="text-blue-600 dark:text-blue-400 mt-0.5"
              />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Privacy Protected:</strong> No personal data is shared.
                Links only contain dog IDs, no user information.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <Button onClick={onClose} className="w-full" aria-label="Close">
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
