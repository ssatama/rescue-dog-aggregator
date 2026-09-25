"use client";

import { useEffect, useMemo, useState } from "react";
import HomeDogRow from "./HomeDogRow";
import { HOME_ROW_DOGS } from "@/constants/layout";
import { getAnimals } from "@/services/animalsService";
import { useVisitorLocation } from "@/lib/visitorLocation";
import { catalogCountryValue } from "@/utils/adoptability";
import { getCountryName, normalizeCountryCode } from "@/utils/countryNames";
import { formatCount } from "@/utils/formatCount";
import { reportError } from "@/utils/logger";
import type { Dog } from "@/types/dog";

export interface RescueReach {
  ships_to?: string[];
  dog_count?: number;
}

interface AdoptableNowRowProps {
  /** Dogs from every rescue, mixed; what the row shows without a country. */
  dogs: Dog[];
  totalDogs: number;
  rescues: RescueReach[];
}

/** The home's first row (#497). The page is cached for everyone, so it is
 * rendered with all dogs; once the visitor's country is known it becomes the
 * dogs they can adopt there. Nothing else on the page is narrowed. */
export default function AdoptableNowRow({ dogs, totalDogs, rescues }: AdoptableNowRowProps): React.JSX.Element | null {
  const { country } = useVisitorLocation();
  const target = useMemo(
    () => catalogCountryValue([...new Set(rescues.flatMap((rescue) => rescue.ships_to ?? []))], country),
    [rescues, country],
  );
  const [adoptable, setAdoptable] = useState<{ target: string; dogs: Dog[] } | null>(null);

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    getAnimals(
      { sort: "recommended", available_to_country: target, limit: HOME_ROW_DOGS },
      { signal: controller.signal },
    )
      .then((found) => setAdoptable({ target, dogs: found }))
      .catch((error: unknown) => {
        // The row keeps showing every dog
        if (!controller.signal.aborted) reportError(error, { context: "home_adoptable_row", country: target });
      });
    return () => controller.abort();
  }, [target]);

  if (country && target && adoptable?.target === target && adoptable.dogs.length > 0) {
    const reachable = rescues
      .filter((rescue) => rescue.ships_to?.some((code) => normalizeCountryCode(code) === normalizeCountryCode(target)))
      .reduce((sum, rescue) => sum + (rescue.dog_count ?? 0), 0);
    return (
      <HomeDogRow
        id="home-adoptable"
        title="Adoptable to you now"
        meta={reachable > 0 ? `${formatCount(reachable)} in ${getCountryName(country)}` : null}
        href={`/dogs?available_country=${encodeURIComponent(target)}`}
        linkLabel="See all"
        dogs={adoptable.dogs}
        priority
      />
    );
  }

  return (
    <HomeDogRow
      id="home-adoptable"
      title="Dogs looking for homes"
      meta={totalDogs > 0 ? `${formatCount(totalDogs)} listed now` : null}
      href="/dogs"
      linkLabel="See all"
      dogs={dogs}
      priority
    />
  );
}
