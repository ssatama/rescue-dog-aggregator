"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";
import styles from "./PullToRefresh.module.css";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  disabled = false,
  children,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, 80], [0, 1]);
  const pullOpacity = useTransform(pullY, [0, 40, 80], [0, 0.5, 1]);
  const pullScale = useTransform(pullY, [0, 80], [0.8, 1]);
  const pullRotate = useTransform(pullY, [0, 80], [0, 360]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only trigger at the top of the page
      if (window.scrollY > 0) return;

      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Prevent default scrolling
        e.preventDefault();

        // Apply resistance
        const resistance = Math.min(diff * 0.5, 100);
        pullY.set(resistance);
      }
    },
    [isPulling, isRefreshing, pullY],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);
    const currentPull = pullY.get();

    if (currentPull >= 80 && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);

      // Haptic feedback on supported devices
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullY.set(0);
      }
    } else {
      // Snap back
      pullY.set(0);
    }
  }, [isPulling, isRefreshing, pullY, onRefresh]);

  useEffect(() => {
    // Only attach listeners on mobile
    if (window.innerWidth >= 768) return;

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Only render on mobile
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <>{children}</>;
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.pullIndicator}
        style={{
          y: pullY,
          opacity: pullOpacity,
          scale: pullScale,
        }}
      >
        <motion.div
          style={{ rotate: pullRotate }}
          className={styles.iconWrapper}
        >
          <RefreshCw
            size={24}
            className={`${styles.icon} ${isRefreshing ? styles.spinning : ""}`}
          />
        </motion.div>
        <span className={styles.text}>
          {isRefreshing
            ? "Refreshing..."
            : pullY.get() >= 80
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </motion.div>

      <motion.div style={{ y: pullY }} className={styles.content}>
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
