import React from "react";
import * as Sentry from "@sentry/nextjs";

interface AdoptionCTAProps {
  adoptionUrl: string;
  dogId: number;
  dogName: string;
  organizationName: string;
}

export const AdoptionCTA: React.FC<AdoptionCTAProps> = ({
  adoptionUrl,
  dogId,
  dogName,
  organizationName,
}) => {
  const handleClick = () => {
    if (!adoptionUrl) return;

    Sentry.captureEvent({
      message: "swipe.adoption.clicked",
      level: "info",
      extra: {
        dog_id: dogId,
        dog_name: dogName,
        organization: organizationName,
      },
    });

    window.open(adoptionUrl, "_blank", "noopener,noreferrer");
  };

  const isDisabled = !adoptionUrl;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        isDisabled
          ? `Adoption info coming soon for ${dogName}`
          : `Start adoption process for ${dogName}`
      }
      className={`
        w-full py-4 px-6 rounded-full font-semibold text-white
        flex items-center justify-center gap-2
        transition-all duration-200
        ${
          isDisabled
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 active:scale-95"
        }
      `}
    >
      {isDisabled ? "Adoption Info Coming Soon" : "Start Adoption Process"}
      {!isDisabled && <span className="text-xl">→</span>}
    </button>
  );
};
