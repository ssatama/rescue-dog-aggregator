import React from "react";
import type { DogStatus, DogStatusBadgeProps } from "@/types/dogComponents";

const statusConfigs: Record<
  DogStatus,
  { label: string; className: string; icon: string }
> = {
  available: {
    label: "Available",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: "\u2705",
  },
  unknown: {
    label: "Checking availability...",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "\uD83D\uDD0D",
  },
  adopted: {
    label: "Found their forever home!",
    className: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "\uD83C\uDF89",
  },
  reserved: {
    label: "Reserved - Adoption pending",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "\u23F3",
  },
};

export default function DogStatusBadge({
  status = "available",
  className = "",
}: DogStatusBadgeProps): React.ReactElement {
  const config = statusConfigs[status] || statusConfigs.available;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors border ${config.className} ${className}`}
    >
      <span className="text-base">{config.icon}</span>
      {config.label}
    </span>
  );
}
