"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackAdoptionLinkClicked, type AdoptionPlacement } from "@/lib/analytics";
import { trackExternalLinkClick } from "@/lib/monitoring/breadcrumbs";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import ShareButton from "@/components/ui/ShareButton";
import DogStatusBadge from "@/components/dogs/DogStatusBadge";
import { formatBreed, getAgeCategory } from "@/utils/dogHelpers";
import { safeExternalUrl } from "@/utils/security";
import { getCountryName } from "@/utils/countryNames";
import {
  adoptionDomain,
  dogLocation,
  isNeutered,
  isVaccinated,
  listedAgo,
  medicalNote,
} from "@/utils/dogFacts";
import type { Dog } from "@/types/dog";

const ENERGY: Record<string, string> = {
  low: "Low energy",
  medium: "Medium energy",
  high: "High energy",
  very_high: "Very high energy",
};

const EXPERIENCE: Record<string, string> = {
  first_time_ok: "Good for first-time owners",
  some_experience: "Some experience helpful",
  experienced_only: "Experienced owners only",
};

const COMPANIONS = [
  { field: "good_with_children", label: "Children" },
  { field: "good_with_dogs", label: "Dogs" },
  { field: "good_with_cats", label: "Cats" },
] as const;

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "bad" | "quiet";
}): React.ReactElement {
  return (
    <li
      className={cn(
        "rounded-full px-2.5 py-1 text-[13px] font-medium",
        tone === "neutral" && "bg-soft text-ink",
        tone === "good" && "bg-good-soft text-good",
        tone === "bad" && "bg-bad-soft text-bad",
        tone === "quiet" && "border border-dashed border-line text-subtle",
      )}
    >
      {children}
    </li>
  );
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-subtle">{label}</h2>
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {children}
      </ul>
    </div>
  );
}

/** "yes"/"no", a rescue's qualifier ("selective", "older_children"), or null when not assessed. */
function companionAnswer(value: unknown): string | null {
  if (value === true || value === "yes" || value === "true") return "yes";
  if (value === false || value === "no" || value === "false") return "no";
  if (typeof value !== "string" || !value.trim() || value.toLowerCase() === "unknown") return null;
  return value.replace(/_/g, " ");
}

const ANSWER_ORDER = (answer: string) => (answer === "yes" ? 0 : answer === "no" ? 2 : 1);

/** Known companions, plus one quiet chip for the rest (never three). */
function LivesWith({ dog }: { dog: Dog }) {
  const answers: { label: string; answer: string | null }[] = COMPANIONS.map(({ field, label }) => ({
    label,
    answer: companionAnswer(dog.dog_profiler_data?.[field] ?? dog.properties?.[field]),
  }));
  const known = answers
    .filter((a): a is { label: string; answer: string } => a.answer !== null)
    .sort((a, b) => ANSWER_ORDER(a.answer) - ANSWER_ORDER(b.answer));
  if (known.length === 0) return null;
  const unknown = answers.filter((a) => a.answer === null).map((a) => a.label);
  return (
    <FactRow label="Lives with">
      {known.map(({ label, answer }) =>
        answer === "yes" || answer === "no" ? (
          <Chip key={label} tone={answer === "yes" ? "good" : "bad"}>
            {answer === "yes" ? "✓" : "✗"} {label}
            <span className="sr-only">: {answer}</span>
          </Chip>
        ) : (
          <Chip key={label}>
            {label}: {answer}
          </Chip>
        ),
      )}
      {unknown.length > 0 && (
        <Chip tone="quiet">
          {unknown.map((c, i) => (i === 0 ? c : c.toLowerCase())).join(", ")} not assessed
        </Chip>
      )}
    </FactRow>
  );
}

function GoodToKnow({ dog }: { dog: Dog }) {
  const profile = dog.dog_profiler_data;
  const facts = [
    profile?.energy_level && ENERGY[profile.energy_level],
    profile?.experience_level && EXPERIENCE[profile.experience_level],
    isNeutered(dog) && "Neutered",
    isVaccinated(dog) && "Vaccinated",
  ].filter((f): f is string => Boolean(f));
  const medical = medicalNote(dog);
  if (facts.length === 0 && !medical) return null;
  return (
    <div className="grid gap-2">
      {facts.length > 0 && (
        <FactRow label="Good to know">
          {facts.map((f) => (
            <Chip key={f}>{f}</Chip>
          ))}
        </FactRow>
      )}
      {medical && <p className="text-sm text-subtle">{medical}</p>}
    </div>
  );
}

/** "Lurcher · Female · Adult · Medium", leaving out whatever is unknown. */
export function dogMeta(dog: Dog): string[] {
  const age = getAgeCategory(dog);
  const sex = dog.sex?.toLowerCase();
  return [
    formatBreed(dog),
    sex === "male" || sex === "m" ? "Male" : sex === "female" || sex === "f" ? "Female" : null,
    age !== "Unknown" ? age : null,
    dog.standardized_size || dog.size || null,
  ].filter((v): v is string => Boolean(v));
}

function Where({ dog }: { dog: Dog }) {
  const org = dog.organization;
  if (!org) return null;
  const orgPlace = [org.city, org.country ? getCountryName(org.country) : null]
    .filter(Boolean)
    .join(", ");
  const place = dogLocation(dog) ?? orgPlace;
  const listed = listedAgo(dog.created_at);
  const logo = (org as { logo_url?: string | null }).logo_url;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5">
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 flex-none rounded-full bg-white object-contain"
        />
      ) : null}
      <div className="min-w-0">
        {org.slug ? (
          <Link href={`/organizations/${org.slug}`} className="font-semibold text-ink hover:underline">
            {org.name}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{org.name}</span>
        )}
        {(place || listed) && (
          <p className="text-[13px] text-subtle" suppressHydrationWarning>
            {[place, listed].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function canAdopt(dog: Dog): boolean {
  return dog.status === "available" && dog.active !== false && Boolean(safeExternalUrl(dog.adoption_url));
}

/** The one adopt button, used by the desktop panel and the phone bar. */
export function AdoptLink({
  dog,
  placement,
  className,
}: {
  dog: Dog;
  placement: AdoptionPlacement;
  className?: string;
}): React.ReactElement | null {
  const url = safeExternalUrl(dog.adoption_url);
  if (!url) return null;
  const rescue = dog.organization?.name;
  const track = () => {
    trackAdoptionLinkClicked(dog, "detail_page", placement);
    if (dog.organization?.slug) {
      trackExternalLinkClick("adopt", dog.organization.slug, String(dog.id));
    }
  };
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      data-testid={`adopt-button-${placement}`}
      onClick={track}
      // Middle-click opens the link too
      onAuxClick={(e) => e.button === 1 && track()}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 text-center font-semibold text-white shadow-sm transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="truncate">
        Meet {dog.name}
        {rescue ? ` at ${rescue}` : ""}
      </span>
      <ArrowUpRight className="h-4 w-4 flex-none" aria-hidden="true" />
      <span className="sr-only"> (opens the rescue&apos;s site in a new tab)</span>
    </a>
  );
}

/**
 * Below lg, phones share from the button over the photo, and an adoptable dog
 * is saved from the bottom bar; this row fills in whatever those don't cover.
 */
function SaveAndShare({ dog, saveInBar }: { dog: Dog; saveInBar: boolean }) {
  return (
    <div className={cn("items-center gap-2", saveInBar ? "hidden sm:flex" : "flex")}>
      <span className={saveInBar ? "hidden lg:contents" : "contents"}>
        <FavoriteButton
          dogId={dog.id}
          dogName={dog.name}
          orgSlug={dog.organization?.slug}
          className="rounded-xl border border-line hover:bg-soft"
        />
      </span>
      <span className="hidden sm:contents">
      <ShareButton
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={`Meet ${dog.name} - Available for Adoption`}
        text={`${dog.name} is a ${formatBreed(dog) || "lovely dog"} looking for a forever home.`}
        variant="ghost"
        size="sm"
        className="min-h-11 rounded-xl border border-line px-3 hover:bg-soft"
      />
      </span>
    </div>
  );
}

/**
 * Everything needed to decide, next to the adopt button (#489). On desktop it
 * is the sticky right-hand panel; on phones it follows the photo and the adopt
 * button moves to the bottom bar. Each row hides itself without data.
 */
export default function DogFactsPanel({
  dog,
  breedHref,
}: {
  dog: Dog;
  breedHref?: string | null;
}): React.ReactElement {
  const meta = dogMeta(dog);
  const breed = formatBreed(dog);
  const domain = adoptionDomain(dog.adoption_url);
  const adoptable = canAdopt(dog);

  return (
    <div className="grid gap-4" data-testid="dog-facts-panel">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{dog.name}</h1>
        {dog.status && dog.active !== false && <DogStatusBadge status={dog.status} />}
      </div>

      {dog.llm_tagline && <p className="-mt-2 text-subtle">{dog.llm_tagline}</p>}

      {meta.length > 0 && (
        <p className="text-sm text-ink" data-testid="dog-meta">
          {meta.map((part, i) => (
            <React.Fragment key={part}>
              {i > 0 && (
                <span className="mx-2 text-subtle" aria-hidden="true">
                  ·
                </span>
              )}
              {part === breed && breedHref ? (
                <Link href={breedHref} className="underline decoration-line underline-offset-2 hover:text-orange-700">
                  {part}
                </Link>
              ) : (
                <span>{part}</span>
              )}
            </React.Fragment>
          ))}
        </p>
      )}

      <Where dog={dog} />
      <LivesWith dog={dog} />
      <GoodToKnow dog={dog} />

      {adoptable && (
        <div className="hidden gap-2 lg:grid">
          <AdoptLink dog={dog} placement="panel" />
          {domain && (
            <p className="text-center text-xs text-subtle">
              Opens {dog.name}&apos;s page on {domain}. You apply with them directly.
            </p>
          )}
        </div>
      )}

      <SaveAndShare dog={dog} saveInBar={adoptable} />
    </div>
  );
}

/** Save and the adopt button, pinned to the bottom on phones and tablets. */
export function MobileAdoptBar({ dog }: { dog: Dog }): React.ReactElement | null {
  if (!canAdopt(dog)) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-line bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:bg-gray-950/95 lg:hidden"
      data-testid="mobile-adopt-bar"
      data-adopt-bar
    >
      <FavoriteButton
        dogId={dog.id}
        dogName={dog.name}
        orgSlug={dog.organization?.slug}
        className="flex-none rounded-xl border border-line"
      />
      <AdoptLink dog={dog} placement="bar" className="min-w-0 flex-1" />
    </div>
  );
}
