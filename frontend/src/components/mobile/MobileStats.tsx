"use client";

interface Stat {
  label: string;
  value: string | number;
  color?: string;
}

interface MobileStatsProps {
  stats?: Stat[];
  loading?: boolean;
}

/**
 * MobileStats Component
 *
 * Premium statistics display with Apple/Airbnb-inspired design:
 * - Clean neutral card with subtle border
 * - Clear typography hierarchy
 * - Consistent zinc color palette
 * - Refined spacing and layout
 */
export default function MobileStats({
  stats = [
    { label: "Dogs", value: "3,112" },
    { label: "Rescues", value: "13" },
    { label: "Breeds", value: "50+" },
  ],
  loading = false,
}: MobileStatsProps) {
  if (loading) {
    return (
      <div className="px-4 pb-4 sm:hidden">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 animate-pulse">
          <div className="flex items-center justify-around">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 sm:hidden">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center flex-1"
              data-testid={`stat-${stat.label.toLowerCase()}`}
            >
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {stat.value}
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium uppercase tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
