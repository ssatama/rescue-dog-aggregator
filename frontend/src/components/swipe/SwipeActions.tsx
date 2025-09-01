'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptic';

interface SwipeActionsProps {
  onSwipe: (direction: 'left' | 'right') => void;
  disabled?: boolean;
}

export function SwipeActions({ onSwipe, disabled = false }: SwipeActionsProps) {
  const handlePass = () => {
    if (disabled) return;
    triggerHaptic('light');
    onSwipe('left');
  };

  const handleLike = () => {
    if (disabled) return;
    triggerHaptic('success');
    onSwipe('right');
  };

  return (
    <div className="flex justify-center gap-8 p-6 bg-white">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePass}
        disabled={disabled}
        aria-label="Pass"
        className="w-16 h-16 rounded-full bg-gray-100 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="text-gray-600"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        disabled={disabled}
        aria-label="Like"
        className="w-16 h-16 rounded-full bg-green-500 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
      >
        <svg 
          width="28" 
          height="28" 
          viewBox="0 0 24 24" 
          fill="white"
          className="text-white"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </motion.button>
    </div>
  );
}