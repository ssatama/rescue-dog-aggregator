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
        reportError("Failed to fetch organizations", { error: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <section
      className="bg-gray-100 dark:bg-gray-800 py-12"
      aria-label="Partner rescue organizations"
    >
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Aggregating rescue dogs from {totalCount} organizations across Europe
          & UK
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center gap-8 flex-wrap h-10">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center gap-8 flex-wrap">
            {organizations.slice(0, 5).map((org) => (
              <div key={org.id} className="h-10">
                {org.logo_url && (
                  <Image
                    src={org.logo_url}
                    alt={org.name}
                    width={120}
                    height={40}
                    className="max-h-10 w-auto object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
