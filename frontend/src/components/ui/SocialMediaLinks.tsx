"use client";
import React from "react";
import { Icon } from "./Icon";

export interface SocialMediaLinksProps {
  /** Social media platform URLs */
  socialMedia: Record<string, string>;
  /** Additional CSS classes */
  className?: string;
}

interface SocialIconProps {
  /** Social media platform name */
  platform: string;
  /** Additional CSS classes */
  className?: string;
}

function SocialIcon({
  platform,
  className = "h-5 w-5 text-gray-600 dark:text-gray-400",
}: SocialIconProps): React.JSX.Element {
  const platformLower = platform.toLowerCase();

  if (platformLower === "facebook") {
    return <Icon name="facebook" size="default" className={className} />;
  }

  if (platformLower === "instagram") {
    return <Icon name="instagram" size="default" className={className} />;
  }

  if (platformLower === "x" || platformLower === "twitter") {
    // Keep custom X/Twitter SVG since it's unique and not in Lucide React
    return (
      <svg
        className="h-5 w-5 text-gray-600 dark:text-gray-400"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  return <Icon name="globe" size="default" className={className} />;
}

/**
 * Social media links component
 * Displays social media platform links with appropriate icons
 */
export default function SocialMediaLinks({
  socialMedia,
  className = "",
}: SocialMediaLinksProps): React.JSX.Element | null {
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
          className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          aria-label={`Visit our ${platform} page`}
        >
          <SocialIcon platform={platform} />
        </a>
      ))}
    </div>
  );
}
