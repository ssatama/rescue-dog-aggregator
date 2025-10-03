"use client";

import { useState, useEffect } from "react";
import { getStatistics } from "../../services/animalsService";
import AnimatedCounter from "../ui/AnimatedCounter";

export default function StatsDisplay() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getStatistics();
        setStats(data);
      } catch (err) {
        setError("Unable to load statistics");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div data-testid="stats-loading" className="text-center py-8">
        Loading statistics...
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">{error}</div>;
  }

  return (
    <section className="mb-16 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-xl p-8">
      <div className="flex flex-col md:flex-row justify-center items-center gap-12">
        <StatItem value={stats.total_dogs} label="Dogs" />
        <StatItem value={stats.total_organizations} label="Organizations" />
        <StatItem value={stats.total_countries} label="Countries" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
        Updated Daily
      </p>
    </section>
  );
}

function StatItem({ value, label }) {
  return (
    <div className="text-center">
      <AnimatedCounter
        value={value}
        label={label}
        className="text-4xl font-bold text-gray-900 dark:text-gray-100"
      />
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
