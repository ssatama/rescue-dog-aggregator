"use client";

import React from "react";
import Image from "next/image";
import logo from "../../../public/logo.jpeg";

/**
 * MobileTopHeader Component
 *
 * Premium mobile header with clean typography and spacing
 * - Main title with subtitle
 * - Zinc color palette for sophistication
 * - Apple/Airbnb-inspired minimalist design
 */
export default function MobileTopHeader() {
  return (
    <header
      className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/70 dark:border-zinc-800/70 px-4 py-3 pb-4 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0.75rem)" }}
    >
      {/* Logo, Site Name and Tagline */}
      <div className="flex items-center gap-2">
        {/* Dog Logo */}
        <Image
          src={logo}
          alt="Rescue Dog Logo"
          width={40}
          height={40}
          className="rounded-lg object-cover flex-shrink-0"
        />

        {/* Text Content */}
        <div className="flex flex-col">
          <h1 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rescue Dog Aggregator
          </h1>
          <p className="text-[13px] text-[#6B7280] dark:text-zinc-400 leading-tight mt-0.5">
            Your gateway to European rescue dogs
          </p>
        </div>
      </div>
    </header>
  );
}
