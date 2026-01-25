import {
  getSwipeDogs,
  getAvailableCountries,
  searchParamsToFilters,
} from "../../services/serverSwipeService";
import SwipePageClient from "./SwipePageClient";

export const revalidate = 300;

interface SwipePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SwipePage({ searchParams }: SwipePageProps) {
  const params = await searchParams;
  const filters = searchParamsToFilters(params);
  const hasUrlFilters = Boolean(filters.country);

  const countries = await getAvailableCountries();

  if (hasUrlFilters) {
    const { dogs } = await getSwipeDogs(filters);

    return (
      <SwipePageClient
        initialDogs={dogs}
        initialFilters={filters}
        hasUrlFilters={true}
        availableCountries={countries}
      />
    );
  }

  return (
    <SwipePageClient
      initialDogs={null}
      initialFilters={filters}
      hasUrlFilters={false}
      availableCountries={countries}
    />
  );
}
