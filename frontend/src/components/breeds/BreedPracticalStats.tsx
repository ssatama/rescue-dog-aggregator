import type { BreedPracticalStats as Stats, MixStat } from "@/utils/breedPracticalStats";
import { hasPracticalStats } from "@/utils/breedPracticalStats";

interface BreedPracticalStatsProps {
  stats: Stats;
}

const TILE = "rounded-2xl border border-line bg-surface p-4";
const MIX_COLORS = ["bg-orange-300 dark:bg-orange-800", "bg-orange-500 dark:bg-orange-600", "bg-orange-700 dark:bg-orange-400", "bg-orange-900 dark:bg-orange-200"];

function sample(known: number): string {
  return `of ${known} dog${known === 1 ? "" : "s"} with this info`;
}

function MixTile({ title, stat }: { title: string; stat: MixStat }): React.JSX.Element {
  return (
    <div className={TILE}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
        {stat.parts.map((part, index) => (
          <span key={part.label} className={MIX_COLORS[index % MIX_COLORS.length]} style={{ width: `${part.percent}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink">
        {stat.parts.map((part, index) => (
          <li key={part.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${MIX_COLORS[index % MIX_COLORS.length]}`} aria-hidden="true" />
            {part.label} <span className="text-subtle">{part.percent}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-subtle">{sample(stat.known)}</p>
    </div>
  );
}

/**
 * What adopters ask about a breed (#500): compatibility, energy, size and age,
 * each from the dogs whose profile records it and labelled with that sample.
 * Stats on fewer than five dogs are already left out; with none left, so is
 * the section.
 */
export default function BreedPracticalStats({ stats }: BreedPracticalStatsProps): React.JSX.Element | null {
  if (!hasPracticalStats(stats)) return null;

  return (
    <section aria-labelledby="breed-stats-heading" className="mb-10">
      <h2 id="breed-stats-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
        What the rescues say about these dogs
      </h2>
      <p className="mt-1 text-sm text-subtle">From the dogs listed now. Rescues don&apos;t record every detail for every dog.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.compatibility.map((stat) => (
          <div key={stat.key} className={TILE}>
            <p className="font-display text-3xl font-bold text-ink">{stat.percent}%</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">{stat.label}</h3>
            <p className="mt-1 text-xs text-subtle">
              {stat.count} {sample(stat.known)}
            </p>
          </div>
        ))}
      </div>

      {(stats.energy || stats.size || stats.age) && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {stats.energy && <MixTile title="Energy" stat={stats.energy} />}
          {stats.size && <MixTile title="Size" stat={stats.size} />}
          {stats.age && (
            <div className={TILE}>
              <h3 className="text-sm font-semibold text-ink">Age</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-ink">
                {stats.age.map((group) => (
                  <li key={group.label}>
                    {group.label} <span className="text-subtle">{group.count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-subtle">Dogs by estimated age; one near a boundary counts in both groups</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
