import Image from "next/image";
import Link from "next/link";

export interface StripRescue {
  id: number;
  name: string;
  slug?: string;
  logo_url?: string | null;
  dog_count?: number;
}

/** The rescues behind the dogs, on desktop only: the phone home stays dogs-only
 * and reaches rescues through the tab bar (#497). */
export default function RescuesStrip({ rescues }: { rescues: StripRescue[] }): React.JSX.Element | null {
  const listed = rescues.filter((rescue) => rescue.slug && (rescue.dog_count ?? 0) > 0);
  if (listed.length === 0) return null;

  return (
    <section aria-labelledby="home-rescues" className="hidden gap-3 border-t border-line pt-8 lg:grid">
      <div className="flex items-baseline gap-3">
        <h2 id="home-rescues" className="font-display text-xl font-bold tracking-tight text-ink">
          From {listed.length} rescues
        </h2>
        <p className="text-sm text-subtle">Every dog links to its rescue&apos;s own page to adopt.</p>
        <Link href="/organizations" className="ml-auto text-sm font-semibold text-primary hover:underline">
          All rescues
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {listed.map((rescue) => (
          <li key={rescue.id}>
            <Link
              href={`/organizations/${rescue.slug}`}
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-medium text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {rescue.logo_url ? (
                <Image src={rescue.logo_url} alt="" width={28} height={28} className="h-7 w-7 rounded-full bg-white object-contain" />
              ) : (
                <span aria-hidden="true" className="h-7 w-7 rounded-full bg-soft" />
              )}
              {rescue.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
