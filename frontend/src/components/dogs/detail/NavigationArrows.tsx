import React from "react";
import { Icon } from "../../ui/Icon";

export interface NavigationArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isLoading?: boolean;
}

const NavigationArrows: React.FC<NavigationArrowsProps> = ({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isLoading = false,
}) => {
  const showPrev = hasPrev;
  const showNext = hasNext;

  // Don't render anything if no arrows should be shown
  if (!showPrev && !showNext) {
    return null;
  }

  const buttonClasses = `
    fixed top-1/2 -translate-y-1/2 z-50
    hidden md:flex items-center justify-center
    w-12 h-12 rounded-full
    bg-white shadow-lg
    hover:bg-gray-50 hover:shadow-xl
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      {showPrev && (
        <button
          data-testid="nav-arrow-prev"
          className={`${buttonClasses} left-4`}
          onClick={onPrev}
          disabled={isLoading}
          aria-label="Previous dog"
          type="button"
        >
          <Icon name="chevron-left" size="medium" color="default" />
        </button>
      )}
      
      {showNext && (
        <button
          data-testid="nav-arrow-next"
          className={`${buttonClasses} right-4`}
          onClick={onNext}
          disabled={isLoading}
          aria-label="Next dog"
          type="button"
        >
          <Icon name="chevron-right" size="medium" color="default" />
        </button>
      )}
    </>
  );
};

export default NavigationArrows;