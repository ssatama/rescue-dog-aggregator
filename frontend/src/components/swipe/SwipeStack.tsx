"use client";

import React from "react";
import { motion } from "framer-motion";
import { type Dog } from "../../types/dog";
import { SwipeCard } from "./SwipeCard";

interface SwipeStackProps {
  dogs: Dog[];
  currentIndex: number;
}

const STACK_OFFSET = 8;
const STACK_SCALE_FACTOR = 0.05;
const MAX_VISIBLE_CARDS = 3;

export function SwipeStack({ dogs, currentIndex }: SwipeStackProps) {
  const visibleDogs = dogs.slice(
    currentIndex,
    currentIndex + MAX_VISIBLE_CARDS,
  );

  return (
    <div className="relative h-full w-full">
      {visibleDogs.map((dog, index) => {
        const isActive = index === 0;
        const stackPosition = index;

        // Calculate visual properties for stacked cards
        const scale = 1 - stackPosition * STACK_SCALE_FACTOR;
        const yOffset = stackPosition * STACK_OFFSET;
        const opacity = index === 0 ? 1 : index === 1 ? 0.5 : 0.3;
        const zIndex = MAX_VISIBLE_CARDS - index;

        return (
          <motion.div
            key={dog.id}
            data-testid={`stack-card-${index}`}
            className="absolute inset-0"
            initial={false}
            animate={{
              scale,
              y: yOffset,
              opacity,
            }}
            style={{
              zIndex: isActive ? 10 : -index,
              transform: `translateY(${yOffset}px) scale(${scale})`,
              opacity,
              pointerEvents: isActive ? "auto" : "none",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            <SwipeCard
              dog={dog}
              isStacked={!isActive}
            />
          </motion.div>
        );
      })}
    </div>
  );
}