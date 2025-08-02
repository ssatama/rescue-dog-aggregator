"use client";

import React from "react";
import { Button } from "./button";
import { Icon } from "./Icon";

interface Dog {
  id: string | number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  primary_image_url?: string;
  organization?: string;
  status?: string;
  adoption_url?: string;
}

interface MobileStickyBarProps {
  dog: Dog;
  isVisible?: boolean;
  className?: string;
}

export default function MobileStickyBar({
  dog,
  isVisible = true,
  className = "",
}: MobileStickyBarProps) {
  const handleContactClick = (): void => {
    if (dog?.adoption_url) {
      // Open the adoption URL
      window.open(dog.adoption_url, "_blank", "noopener,noreferrer");
    }
  };

  if (!isVisible || !dog) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden ${className}`}
      data-testid="mobile-sticky-bar"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Contact/Adopt Button */}
        <Button
          size="lg"
          onClick={handleContactClick}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white mobile-touch-target"
          data-testid="mobile-contact-button"
          aria-label="Start adoption process"
        >
          <Icon name="phone" size="default" className="mr-2" />
          Start Adoption Process
        </Button>
      </div>

      {/* Bottom safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </div>
  );
}
