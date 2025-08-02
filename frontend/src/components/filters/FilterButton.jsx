import React from "react";

/**
 * Reusable filter button component with orange-themed styling and optional count badge
 *
 * @param {boolean} active - Whether the button is in active state
 * @param {function} onClick - Click handler function
 * @param {React.ReactNode} children - Button content
 * @param {number} count - Optional count to display as badge (only shows if > 0)
 */
export default function FilterButton({
  active = false,
  onClick,
  children,
  count = 0,
}) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Generate descriptive aria-label
  const ariaLabel = `${children}${count > 0 ? `, ${count} items` : ""}${active ? ", currently active" : ""}`;

  return (
    <button
      onClick={handleClick}
      className={`
        px-3 py-2 rounded-lg border text-sm font-medium
        transition-all duration-150 ease-out
        active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2
        min-h-[44px]
        ${
          active
            ? "bg-orange-100 border-orange-400 text-orange-700"
            : "bg-white border-orange-200 hover:bg-orange-50 hover:border-orange-300"
        }
      `}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {children}
      {count > 0 && (
        <span
          aria-hidden="true"
          className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded-full"
        >
          {count}
        </span>
      )}
    </button>
  );
}
