"use client";

import React, { useState, useEffect, forwardRef, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Check, Loader2 } from "lucide-react";
import {
  saveBreedAlertWithFallback,
  hasBreedAlert,
} from "@/services/breedAlertService";
import type { BreedData } from "@/types/breeds";

interface BreedAlertButtonProps {
  breedData: BreedData;
  filters?: Record<string, unknown>;
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const BreedAlertButton = forwardRef<HTMLButtonElement, BreedAlertButtonProps>(
  (
    {
      breedData,
      filters = {},
      className = "",
      variant = "outline",
      size = "lg",
    },
    ref,
  ) => {
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Check if breed alert already exists on mount
    useEffect(() => {
      setIsSaved(hasBreedAlert(breedData.primary_breed));
    }, [breedData.primary_breed]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const handleSaveAlert = async (): Promise<void> => {
      if (isLoading || isSaved) return;

      setIsLoading(true);
      setErrorMsg(""); // Clear any previous errors

      try {
        // Track breed alert save event
        if (typeof window !== "undefined" && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
          (window as Window & { gtag: (...args: unknown[]) => void }).gtag("event", "breed_alert_save", {
            breed: breedData.primary_breed,
            breed_group: breedData.breed_group,
            dog_count: breedData.count,
          });
        }

        await saveBreedAlertWithFallback({
          breed: breedData.primary_breed,
          filters: {
            ...filters,
            // Include breed-specific context
            breed_slug: breedData.slug || breedData.breed_slug,
            breed_group: breedData.breed_group,
          },
        });

        setIsSaved(true);
        setShowSuccess(true);

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Hide success state after 3 seconds
        timeoutRef.current = setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } catch (error) {
        console.error("Failed to save breed alert:", error);
        setErrorMsg("Could not save alert. Please try again.");
        // Clear error after 5 seconds
        setTimeout(() => setErrorMsg(""), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    const getButtonContent = (): React.JSX.Element => {
      if (isLoading) {
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        );
      }

      if (showSuccess) {
        return (
          <>
            <Check className="mr-2 h-4 w-4 text-green-600" />
            Alert Saved!
          </>
        );
      }

      if (isSaved) {
        return (
          <>
            <Heart className="mr-2 h-4 w-4 fill-current text-red-500" />
            Alert Active
          </>
        );
      }

      return (
        <>
          <Heart className="mr-2 h-4 w-4" />
          Save Breed Alert
        </>
      );
    };

    const getButtonVariant = (): "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" => {
      if (showSuccess) return "default";
      if (isSaved) return "secondary";
      return variant;
    };

    return (
      <>
        <Button
          ref={ref}
          onClick={handleSaveAlert}
          disabled={isLoading || isSaved}
          variant={getButtonVariant()}
          size={size}
          className={`transition-all duration-200 ${
            showSuccess
              ? "bg-green-600 hover:bg-green-700 text-white"
              : isSaved
                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                : ""
          } ${className}`}
          aria-label={`Save alert for ${breedData.primary_breed} dogs`}
          title={
            isSaved
              ? `You'll be notified when new ${breedData.primary_breed}s become available`
              : `Get notified when new ${breedData.primary_breed}s are posted`
          }
        >
          {getButtonContent()}
        </Button>
        {errorMsg && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 text-sm text-red-600"
          >
            {errorMsg}
          </p>
        )}
      </>
    );
  },
);

BreedAlertButton.displayName = "BreedAlertButton";

export default BreedAlertButton;
