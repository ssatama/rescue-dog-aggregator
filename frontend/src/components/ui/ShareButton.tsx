"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Icon } from './Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShare } from '../../hooks/useShare';

export interface ShareButtonProps {
  /** URL to share */
  url?: string;
  /** Title of the content */
  title?: string;
  /** Text content to share */
  text?: string;
  /** Button variant */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
}

export default function ShareButton({ 
  url, 
  title, 
  text,
  variant = "outline",
  size = "default",
  className = "" 
}: ShareButtonProps) {
  const {
    copied,
    hasNativeShare,
    handleNativeShare,
    handleCopyLink,
    handleSocialShare
  } = useShare({ url, title, text });

  // Mobile: Use native share if available, otherwise show dropdown
  if (hasNativeShare) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleNativeShare}
        className={className}
      >
        <Icon name="share" size="small" className="mr-2" />
        Share
      </Button>
    );
  }

  // Desktop: Show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Icon name="share" size="small" className="mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleSocialShare('facebook')}>
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialShare('x')}>
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialShare('whatsapp')}>
          Share on WhatsApp
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