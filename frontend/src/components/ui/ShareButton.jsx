"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Icon } from './Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reportError } from '../../utils/logger';
import { validateUrl, sanitizeText } from '../../utils/security';
import { useToast } from './Toast';

export default function ShareButton({ 
  url, 
  title, 
  text,
  variant = "outline",
  size = "default",
  className = "" 
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // Sanitize and validate inputs
  const safeUrl = url && validateUrl(url) ? url : window.location.href;
  const safeTitle = sanitizeText(title || '');
  const safeText = sanitizeText(text || '');

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: safeTitle, text: safeText, url: safeUrl });
        showToast('Share successful!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          reportError('Error sharing', { error: err.message, url: safeUrl, title: safeTitle });
          showToast('Share failed. Please try again.', 'error');
        }
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      reportError('Failed to copy link', { error: err.message, url: safeUrl });
      showToast('Failed to copy link. Please try again.', 'error');
    }
  };

  const handleSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(safeUrl);
    const encodedText = encodeURIComponent(safeText);
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    };
    
    const platformNames = {
      facebook: 'Facebook',
      x: 'X (Twitter)',
      whatsapp: 'WhatsApp'
    };
    
    try {
      window.open(urls[platform], '_blank', 'width=600,height=400');
      showToast(`Opening share on ${platformNames[platform]}...`, 'info');
    } catch (err) {
      reportError('Failed to open social share', { error: err.message, platform });
      showToast('Failed to open share dialog. Please try again.', 'error');
    }
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