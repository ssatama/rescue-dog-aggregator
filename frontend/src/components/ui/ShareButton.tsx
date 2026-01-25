"use client";
import React, { memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "./Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShare } from "../../hooks/useShare";

export interface ShareButtonProps {
  /** URL to share */
  url?: string;
  /** Title of the content */
  title?: string;
  /** Text content to share */
  text?: string;
  /** Button variant */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Custom button text */
  children?: React.ReactNode;
  /** Compact mode for cards (icon only) */
  compact?: boolean;
}

const ShareButton = memo(
  function ShareButton({
    url,
    title,
    text,
    variant = "outline",
    size = "default",
    className = "",
    children = "Share",
    compact = false,
  }: ShareButtonProps) {
    const shareOptions = useMemo(() => ({ url, title, text }), [url, title, text]);
    const {
      copied,
      hasNativeShare,
      handleNativeShare,
      handleCopyLink,
      handleSocialShare,
      safeUrl,
      safeTitle,
      safeText,
    } = useShare(shareOptions);

    const handleEmailShare = useCallback(() => {
      const subject = encodeURIComponent(safeTitle);
      const body = encodeURIComponent(`${safeText}\n\n${safeUrl}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }, [safeTitle, safeText, safeUrl]);

  // Determine button size and content based on compact mode
  const buttonSize = compact ? "icon" : size;
  const buttonContent = compact ? (
    <Icon name="share" size="small" className="text-current" />
  ) : (
    <>
      <Icon name="share" size="small" className="mr-2 text-current" />
      {children}
    </>
  );

  // Mobile: Use native share if available, otherwise show dropdown
  if (hasNativeShare) {
    return (
      <Button
        variant={variant}
        size={buttonSize}
        onClick={handleNativeShare}
        className={className}
        data-testid="share-button"
        data-share-mode="native"
        aria-label={compact ? "Share" : undefined}
      >
        {buttonContent}
      </Button>
    );
  }

  // Desktop: Show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={buttonSize}
          className={className}
          data-testid="share-button"
          data-share-mode="dropdown"
          aria-label={compact ? "Share" : undefined}
        >
          {buttonContent}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        data-testid="social-media-links"
      >
        <DropdownMenuItem
          onClick={() => handleSocialShare("facebook")}
          data-testid="share-facebook"
        >
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("x")}
          data-testid="share-twitter"
        >
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("whatsapp")}
          data-testid="share-whatsapp"
        >
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailShare} data-testid="share-email">
          Share via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <>
              <Icon name="check-circle" size="small" className="mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Icon name="copy" size="small" className="mr-2" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  },
  (prevProps, nextProps) =>
    prevProps.url === nextProps.url &&
    prevProps.title === nextProps.title &&
    prevProps.text === nextProps.text &&
    prevProps.variant === nextProps.variant &&
    prevProps.compact === nextProps.compact
);

export default ShareButton;
