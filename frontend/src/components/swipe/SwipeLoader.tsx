import React from "react";
import { motion } from "framer-motion";

interface SwipeLoaderProps {
  message?: string;
}

export const SwipeLoader: React.FC<SwipeLoaderProps> = ({
  message = "Loading amazing dogs...",
}) => {
  return (
    <div
      data-testid="swipe-loader"
      className="flex flex-col items-center justify-center min-h-[60vh] p-8"
    >
      {/* Animated dog emoji */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="text-8xl mb-6"
      >
        🐕
      </motion.div>

      {/* Loading dots animation */}
      <div className="flex gap-2 mb-4">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.1,
            }}
            className="w-3 h-3 bg-orange-500 rounded-full"
          />
        ))}
      </div>

      {/* Loading message */}
      <p className="text-gray-600 text-center font-medium">{message}</p>

      {/* Skeleton card preview for progressive enhancement */}
      <div
        data-testid="loading-skeleton"
        className="mt-8 w-full max-w-sm animate-pulse"
      >
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300" />
          <div className="p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeLoader;
