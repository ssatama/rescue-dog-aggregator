"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatistics } from "../../services/animalsService";
import AnimatedCounter from "../ui/AnimatedCounter";

interface StatsData {
  total_dogs: number;
  total_organizations: number;
  countries?: string[];
}

interface StatItemProps {
  value: number;
  label: string;
}

export default function StatsDisplay() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStatistics();
      setStats(data as StatsData);
    } catch (err) {
      setError("Unable to load statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div data-testid="stats-loading" className="py-8 text-center text-subtle">
        Loading statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="mb-4 text-subtle">{error}</p>
        <button
          onClick={fetchStats}
          className="text-orange-700 underline underline-offset-4 hover:no-underline dark:text-orange-400"
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalCountries = stats.countries?.length || 0;

  return (
    <section aria-label="The catalog today" className="rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div className="grid grid-cols-3 gap-4 text-center">
        <StatItem value={stats.total_dogs} label="Dogs" />
        <StatItem value={stats.total_organizations} label="Rescues" />
        <StatItem value={totalCountries} label="Countries" />
      </div>
      <p className="mt-4 text-center text-sm text-subtle">Updated three times a week from the rescues&apos; own sites.</p>
    </section>
  );
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <div>
      <AnimatedCounter value={value} label={label} className="font-display text-3xl font-bold text-ink sm:text-5xl" />
      <p className="mt-1 text-sm font-semibold text-subtle">{label}</p>
    </div>
  );
}
