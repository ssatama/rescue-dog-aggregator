"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "./button";

const ContactButton = ({
  email = "rescuedogsme@gmail.com",
  buttonText = "Contact Us",
  size = "lg",
  className = "",
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = async (e) => {
    e.preventDefault();

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    let copySuccess = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
        copySuccess = true;
        setShowCopied(true);
        timeoutRef.current = setTimeout(() => {
          setShowCopied(false);
          timeoutRef.current = null;
        }, 2500);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = email;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          copySuccess = true;
          setShowCopied(true);
          timeoutRef.current = setTimeout(() => {
            setShowCopied(false);
            timeoutRef.current = null;
          }, 2500);
        } catch (err) {
          console.error("Fallback copy failed:", err);
        } finally {
          document.body.removeChild(textArea);
        }
      }

      // Only try to open mailto if copy failed or if not Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      );
      if (!copySuccess || !isSafari) {
        // For non-Safari browsers or if copy failed, try mailto
        setTimeout(() => {
          window.location.href = `mailto:${email}`;
        }, 100);
      }
    } catch (err) {
      console.error("Failed to copy email:", err);
      // Still try mailto as fallback
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        asChild
        size={size}
        className={className}
        aria-label={`Send email to ${email}`}
      >
        <a href={`mailto:${email}`} onClick={handleClick} role="button">
          {buttonText}
        </a>
      </Button>

      {showCopied && (
        <div
          className="absolute -top-14 left-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none animate-fadeInUp"
          style={{
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Email copied: {email}</span>
          </div>
          <div
            className="absolute left-1/2 top-full w-0 h-0"
            style={{
              transform: "translateX(-50%)",
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgb(17 24 39)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ContactButton;
