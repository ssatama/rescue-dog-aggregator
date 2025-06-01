"use client";
import React from 'react';
import { Facebook, Instagram, Globe } from 'lucide-react';

function SocialIcon({ platform, className = "h-5 w-5" }) {
  const platformLower = platform.toLowerCase();
  
  if (platformLower === 'facebook') {
    return <Facebook className={className} />;
  }
  
  if (platformLower === 'instagram') {
    return <Instagram className={className} />;
  }
  
  if (platformLower === 'x' || platformLower === 'twitter') {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  
  return <Globe className={className} />;
}

function SocialMediaLinks({ socialMedia, className = "" }) {
  if (!socialMedia || Object.keys(socialMedia).length === 0) {
    return null;
  }

  return (
    <div className={`flex gap-3 ${className}`}>
      {Object.entries(socialMedia).map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label={`Visit our ${platform} page`}
        >
          <SocialIcon platform={platform} />
        </a>
      ))}
    </div>
  );
}

export default SocialMediaLinks;