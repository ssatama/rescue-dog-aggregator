"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Share2, Copy, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ShareButton({ 
  url, 
  title, 
  text,
  variant = "outline",
  size = "default",
  className = "" 
}) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  // Mobile: Use native share if available, otherwise show dropdown
  if (navigator.share) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleNativeShare}
        className={className}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
    );
  }

  // Desktop: Show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className="h-4 w-4 mr-2" />
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
              <CheckCircle className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}