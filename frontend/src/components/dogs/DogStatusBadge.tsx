import React from "react";
import type { DogStatus, DogStatusBadgeProps } from "@/types/dogComponents";

// Adoption can't be detected, so no status ever claims it (#484): a dog that
// left a rescue's site is "no longer listed".
const statusConfigs: Record<DogStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-good-soft text-good" },
  unknown: { label: "Checking availability", className: "bg-soft text-subtle" },
  reserved: { label: "Reserved", className: "bg-soft text-ink" },
  adopted: { label: "No longer listed", className: "bg-soft text-subtle" },
};

export default function DogStatusBadge({
  status = "available",
  className = "",
}: DogStatusBadgeProps): React.ReactElement {
  const config = statusConfigs[status] || statusConfigs.available;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
