// frontend/src/components/home/TrustBand.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getOrganizations } from "../../services/organizationsService";
import { reportError } from "../../utils/logger";

interface Organization {
  id: number;
  name: string;
  logo_url?: string;
}

export default function TrustBand() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [totalCount, setTotalCount] = useState(13);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await getOrganizations();
        setOrganizations(data || []);
        setTotalCount(data?.length || 13);
      } catch (error) {
        reportError("Failed to fetch organizations", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <section
      className="bg-gray-100 dark:bg-gray-800 py-32 relative overflow-hidden"
      aria-label="Partner rescue organizations"
      style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.02) 10px,
          rgba(0, 0, 0, 0.02) 20px
        )`,
      }}
    >
      {/* Subtle pattern overlay for dark mode */}
      <div
        className="absolute inset-0 dark:opacity-30 opacity-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255, 255, 255, 0.03) 10px,
          rgba(255, 255, 255, 0.03) 20px
        )`,
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-12">
          Aggregating rescue dogs from {totalCount} organizations across Europe
          & UK
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-20 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
              {organizations.slice(0, 8).map((org, index) => (
                <div
                  key={org.id}
                  className="h-20 animate-fadeIn"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationDuration: "600ms",
                    animationFillMode: "both",
                  }}
                >
                  {org.logo_url && (
                    <Image
                      src={org.logo_url}
                      alt={org.name}
                      width={240}
                      height={80}
                      className="max-h-20 w-auto object-contain grayscale-[50%] opacity-70 hover:opacity-100 hover:grayscale-0 hover:scale-110 transition-all duration-300 cursor-pointer"
                    />
                  )}
                </div>
              ))}
            </div>

            {totalCount > 8 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
                + {totalCount - 8} more organizations
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
