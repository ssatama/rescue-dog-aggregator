'use client';

import React, { useState } from 'react';
import { Button } from './button';

const ContactButton = ({ 
  email = 'rescuedogsme@gmail.com', 
  buttonText = 'Contact Us', 
  size = 'lg',
  className = ''
}) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = email;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
          console.error('Fallback copy failed:', err);
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      // Still attempt to open mailto for users with email clients
      window.location.href = `mailto:${email}`;
    } catch (err) {
      console.error('Failed to copy email:', err);
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
        <a 
          href={`mailto:${email}`} 
          onClick={handleClick}
          role="button"
        >
          {buttonText}
        </a>
      </Button>
      
      {showCopied && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap shadow-lg z-10 animate-fade-in">
          <div className="relative">
            Email copied: {email}
            <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactButton;