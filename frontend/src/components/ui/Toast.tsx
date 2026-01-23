"use client";

import React, { useEffect, useState } from "react";

export type ToastType = "success" | "add" | "remove" | "error";
export type ToastPosition = "top" | "bottom";

interface ToastProps {
  type: ToastType;
  message: string;
  isVisible: boolean;
  duration?: number;
  onDismiss?: () => void;
  position?: ToastPosition;
}

const Toast: React.FC<ToastProps> = ({
  type,
  message,
  isVisible,
  duration,
  onDismiss,
  position = "bottom",
}) => {
  const [isShowing, setIsShowing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Syncing internal animation state with isVisible prop */
    if (isVisible) {
      setIsShowing(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsShowing(false), 300);
      return () => clearTimeout(timer);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && duration && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isShowing && !isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "add":
        return "❤️";
      case "remove":
        return "💔";
      case "success":
        return "✓";
      case "error":
        return "⚠️";
      default:
        return null;
    }
  };

  const getStyles = () => {
    const baseStyles =
      "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white font-medium";

    let bgColor = "";
    switch (type) {
      case "success":
        bgColor = "bg-green-600";
        break;
      case "add":
        bgColor = "bg-gray-900 dark:bg-gray-800";
        break;
      case "remove":
        bgColor = "bg-gray-600";
        break;
      case "error":
        bgColor = "bg-red-600";
        break;
    }

    const animationClass = isAnimating
      ? "animate-slide-up"
      : "animate-slide-down";

    return `${baseStyles} ${bgColor} ${animationClass}`;
  };

  const getContainerStyles = () => {
    const baseStyles = "fixed left-1/2 transform -translate-x-1/2 z-50";
    const positionStyles = position === "top" ? "top-4" : "bottom-4";
    return `${baseStyles} ${positionStyles}`;
  };

  const ariaLive = type === "error" ? "assertive" : "polite";

  return (
    <div className={getContainerStyles()}>
      <div role="alert" aria-live={ariaLive} className={getStyles()}>
        {getIcon() && <span className="text-lg">{getIcon()}</span>}
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;
