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
    // Always link to the dog detail page
    const dogDetailUrl = `/dogs/${dogId}`;

    Sentry.captureEvent({
      message: "swipe.adoption.clicked",
      level: "info",
      extra: {
        dog_id: dogId,
        dog_name: dogName,
        organization: organizationName,
      },
    });

    window.open(dogDetailUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Visit ${dogName}'s profile page`}
      className={`
        w-full py-4 px-6 rounded-full font-semibold text-white
        flex items-center justify-center gap-2
        transition-all duration-200
        bg-orange-500 hover:bg-orange-600 active:scale-95
      `}
    >
      Visit {dogName} <span className="text-xl">🐾</span>
    </button>
  );
};
