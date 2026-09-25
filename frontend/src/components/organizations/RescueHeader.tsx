"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import ExpandableText from "@/components/ui/ExpandableText";
import SocialMediaLinks from "@/components/ui/SocialMediaLinks";
import AdoptableToYouCount from "@/components/location/AdoptableToYouCount";
import { trackOrganizationWebsiteClicked } from "@/lib/analytics";
import { NAMED_COUNTRIES_MAX, countriesPhrase, joinNames, rescueReach } from "@/utils/rescueReach";
import RescueLogo from "./RescueLogo";
import type { FilterCount } from "@/schemas/common";
import type { RescueHeaderOrganization } from "@/types/organizationComponents";

/**
 * The top of a rescue's page (#501): who they are, where their dogs are and
 * where they rehome to, in plain words, and a way out to their website.
 * Anything the rescue does not publish is left out.
 */
export default function RescueHeader({
  organization,
  adoptableOptions,
  onShowAdoptable,
}: {
  organization: RescueHeaderOrganization;
  /** The rescue's per-country counts, for "N adoptable to you" */
  adoptableOptions?: FilterCount[];
  onShowAdoptable?: (countryValue: string) => void;
}): React.JSX.Element {
  const { basedIn, dogsIn, rehomesTo } = rescueReach(organization);
  const totalDogs = organization.total_dogs ?? 0;
  // Rescues list their website among their socials too; it has its own button
  const socialMedia = Object.fromEntries(
    Object.entries(organization.social_media ?? {}).filter(([platform]) => platform.toLowerCase() !== "website"),
  );

  return (
    <header className="grid gap-5" data-testid="rescue-header">
      <div className="flex items-center gap-4">
        <RescueLogo
          name={organization.name}
          logoUrl={organization.logo_url}
          className="h-16 w-16 sm:h-20 sm:w-20"
          priority
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            {organization.name}
          </h1>
          {basedIn && <p className="mt-1 text-base text-subtle">Based in {basedIn}</p>}
        </div>
      </div>

      <div className="flex flex-col items-start gap-3">
        <p className="text-ink">
          <span className="font-display text-2xl font-bold">{totalDogs.toLocaleString("en-GB")}</span>{" "}
          <span className="text-subtle">{totalDogs === 1 ? "dog" : "dogs"} listed</span>
        </p>
        <AdoptableToYouCount options={adoptableOptions} onShow={onShowAdoptable} />
      </div>

      {(dogsIn.length > 0 || rehomesTo.length > 0) && (
        <ul className="grid gap-1 text-base text-ink" aria-label="Where their dogs are">
          {dogsIn.length > 0 && <li>Their dogs live in {joinNames(dogsIn)}.</li>}
          {rehomesTo.length > 0 &&
            (rehomesTo.length > NAMED_COUNTRIES_MAX ? (
              <li>
                <details className="group">
                  <summary className="cursor-pointer list-none underline decoration-line underline-offset-4 hover:decoration-ink">
                    They rehome dogs to {countriesPhrase(rehomesTo)}.
                  </summary>
                  <p className="mt-1 text-sm text-subtle">{joinNames(rehomesTo)}.</p>
                </details>
              </li>
            ) : (
              <li>They rehome dogs to {joinNames(rehomesTo)}.</li>
            ))}
        </ul>
      )}

      {organization.description && (
        <ExpandableText
          text={organization.description}
          lines={4}
          className="max-w-3xl text-base leading-relaxed text-subtle"
        />
      )}

      {(organization.website_url || Object.keys(socialMedia).length > 0) && (
        <div className="flex flex-wrap items-center gap-4">
          {organization.website_url && (
            <a
              href={organization.website_url}
              target="_blank"
              rel="noopener"
              onClick={() =>
                trackOrganizationWebsiteClicked(
                  organization.slug ?? String(organization.id),
                  organization.website_url!,
                )
              }
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Visit website
              <ExternalLink className="h-4 w-4 text-subtle" aria-hidden="true" />
            </a>
          )}
          {Object.keys(socialMedia).length > 0 && (
            <SocialMediaLinks socialMedia={socialMedia} className="flex gap-3" />
          )}
        </div>
      )}
    </header>
  );
}
