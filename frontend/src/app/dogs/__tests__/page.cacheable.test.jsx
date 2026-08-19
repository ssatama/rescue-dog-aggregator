import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogsPage, { revalidate } from "../page";
import {
  getAnimals,
  getAllMetadata,
} from "../../../services/serverAnimalsService";

/**
 * /dogs must render identically for every request so the CDN can cache it.
 *
 * Reading searchParams opts an App Router page into dynamic rendering, which
 * made /dogs return `cache-control: no-store` and MISS on every hit — every
 * bot request re-rendered the page and re-queried the backend. That drove the
 * Fluid Active CPU and Fast Origin Transfer overages on Vercel.
 *
 * Dropping the server-side filter read is safe because the client already
 * discards `initialDogs` whenever the URL carries filters
 * (useDogsPagination.ts) and reads every filter value straight from
 * useSearchParams (useDogsFilters.ts). The server fetch for a filtered URL
 * was work the client threw away.
 */

jest.mock("../../../services/serverAnimalsService", () => ({
  getAnimals: jest.fn(),
  getAllMetadata: jest.fn(),
}));

jest.mock("../../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../DogsPageClientSimplified", () => {
  return function MockDogsPageClient({ initialDogs, initialParams }) {
    return (
      <div data-testid="dogs-client">
        <span data-testid="initial-dogs-count">{initialDogs?.length ?? 0}</span>
        <span data-testid="initial-params">{JSON.stringify(initialParams)}</span>
      </div>
    );
  };
});

const FILTERLESS_QUERY = { limit: 20, offset: 0 };

describe("DogsPage is cacheable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnimals.mockResolvedValue([{ id: 1, name: "Rex", slug: "rex-1" }]);
    getAllMetadata.mockResolvedValue({ organizations: [] });
  });

  it("fetches the unfiltered first page when no params are present", async () => {
    render(await DogsPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => expect(getAnimals).toHaveBeenCalledTimes(1));
    expect(getAnimals).toHaveBeenCalledWith(FILTERLESS_QUERY);
  });

  it("issues the identical query when the URL carries filters", async () => {
    render(
      await DogsPage({
        searchParams: Promise.resolve({
          breed: "Labrador",
          size: "Small",
          age: "puppy",
          sex: "Male",
          search: "friendly",
          organization_id: "7",
          breed_group: "Sporting",
          location_country: "UK",
          available_country: "DE",
          available_region: "Bavaria",
        }),
      }),
    );

    await waitFor(() => expect(getAnimals).toHaveBeenCalledTimes(1));
    expect(getAnimals).toHaveBeenCalledWith(FILTERLESS_QUERY);
  });

  it("issues the identical query for arbitrary tracking params", async () => {
    // utm_*/fbclid/bot-probed junk must not fork the render either.
    render(
      await DogsPage({
        searchParams: Promise.resolve({
          utm_source: "newsletter",
          fbclid: "abc123",
          probe: "9999",
        }),
      }),
    );

    await waitFor(() => expect(getAnimals).toHaveBeenCalledTimes(1));
    expect(getAnimals).toHaveBeenCalledWith(FILTERLESS_QUERY);
  });

  it("never seeds the client with URL-derived filter params", async () => {
    // useDogsFilters reads searchParams itself and takes precedence over
    // initialParams, so echoing the URL back through props is dead weight.
    const { getByTestId } = render(
      await DogsPage({
        searchParams: Promise.resolve({ age: "puppy", location_country: "UK" }),
      }),
    );

    expect(JSON.parse(getByTestId("initial-params").textContent)).toEqual({});
  });

  it("still passes the fetched dogs through to the client", async () => {
    const { getByTestId } = render(
      await DogsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(getByTestId("initial-dogs-count")).toHaveTextContent("1");
  });

  it("keeps a finite revalidate window so listings stay fresh", async () => {
    expect(typeof revalidate).toBe("number");
    expect(revalidate).toBeGreaterThan(0);
  });
});
