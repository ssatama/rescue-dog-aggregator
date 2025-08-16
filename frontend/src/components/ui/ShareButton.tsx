"use client";
import React from "react";
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
}

export default function ShareButton({
  url,
  title,
  text,
  variant = "outline",
  size = "default",
  className = "",
  children = "Share",
}: ShareButtonProps) {
  const {
    copied,
    hasNativeShare,
    handleNativeShare,
    handleCopyLink,
    handleSocialShare,
    safeUrl,
    safeTitle,
    safeText,
  } = useShare({ url, title, text });

  const handleEmailShare = () => {
    const subject = encodeURIComponent(safeTitle);
    const body = encodeURIComponent(`${safeText}\n\n${safeUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Mobile: Use native share if available, otherwise show dropdown
  if (hasNativeShare) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleNativeShare}
        className={className}
        data-testid="share-button"
        data-share-mode="native"
      >
        <Icon name="share" size="small" className="mr-2" />
        {children}
      </Button>
    );
  }

  // Desktop: Show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          data-testid="share-button"
          data-share-mode="dropdown"
        >
          <Icon name="share" size="small" className="mr-2" />
          {children}
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
}
