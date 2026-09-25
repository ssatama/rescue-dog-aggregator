/**
 * Chip and "Clear all" fixes from the #526 review (#494 part 2).
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DogsPageClientSimplified from "../DogsPageClientSimplified";
import * as api from "../../../services/animalsService";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getFilterCounts: jest.fn(),
  getAvailableRegions: jest.fn(),
}));

jest.mock("../../../components/dogs/DogCard", () => {
  return function DogCard({ dog, listContext }) {
    return <div data-testid="dog-card" data-list={listContext}>{dog.name}</div>;
  };
});

describe("catalog chips (#494)", () => {
  let router;

  function renderAt(pathname, query, initialParams = {}) {
    usePathname.mockReturnValue(pathname);
    useSearchParams.mockReturnValue(new URLSearchParams(query));
    return render(<DogsPageClientSimplified initialDogs={[]} metadata={{}} initialParams={initialParams} />);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    router = { push: jest.fn(), replace: jest.fn() };
    useRouter.mockReturnValue(router);
    api.getAnimals.mockResolvedValue([{ id: 1, name: "Rex", slug: "rex-1" }]);
    api.getFilterCounts.mockResolvedValue({ total: 1 });
    api.getAvailableRegions.mockResolvedValue(["London"]);
  });

  it("Clear all on a landing page stays there and keeps its fixed filter", async () => {
    renderAt("/dogs/puppies", "breed=Labrador", { age_category: "Puppy" });

    fireEvent.click(await screen.findByRole("button", { name: "Clear all" }));

    expect(router.replace).toHaveBeenCalledWith("/dogs/puppies", { scroll: false });
    await waitFor(() =>
      expect(api.getAnimals).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ primary_breed: expect.anything() }),
        expect.anything(),
      ),
    );
    // The page promises puppies, so dogs without a recorded age stay off it
    expect(api.getAnimals).toHaveBeenLastCalledWith(
      expect.objectContaining({ age_category: "Puppy", age_known: "true" }),
      expect.anything(),
    );
  });

  it("the catalog's own age filter still includes dogs without an age", async () => {
    renderAt("/dogs", "age=Adult");
    await waitFor(() =>
      expect(api.getAnimals).toHaveBeenCalledWith(expect.objectContaining({ age_category: "Adult" }), expect.anything()),
    );
    expect(api.getAnimals).not.toHaveBeenCalledWith(expect.objectContaining({ age_known: expect.anything() }), expect.anything());
  });

  it("removing the country chip drops its region too", async () => {
    renderAt("/dogs", "available_country=UK&available_region=London");

    const countryChip = await screen.findByRole("button", { name: /^Adoptable to/ });
    fireEvent.click(countryChip);

    await waitFor(() => expect(router.push).toHaveBeenCalled(), { timeout: 1500 });
    const url = router.push.mock.calls.at(-1)[0];
    expect(url).not.toContain("available_country");
    expect(url).not.toContain("available_region");
  });
});

describe("the catalog on a breed page (#500)", () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { push: jest.fn(), replace: jest.fn() };
    useRouter.mockReturnValue(router);
    usePathname.mockReturnValue("/breeds/lurcher");
    useSearchParams.mockReturnValue(new URLSearchParams(""));
    api.getFilterCounts.mockResolvedValue({ total: 0 });
    api.getAvailableRegions.mockResolvedValue([]);
  });

  it("lists the page's breed with no chip for it and no site search that would leave the breed", async () => {
    api.getAnimals.mockResolvedValue([{ id: 1, name: "Rex", slug: "rex-1" }]);
    render(<DogsPageClientSimplified initialDogs={[]} metadata={{}} initialParams={{ primary_breed: "Lurcher" }} hideHero hideBreadcrumbs />);

    await waitFor(() =>
      expect(api.getAnimals).toHaveBeenCalledWith(expect.objectContaining({ primary_breed: "Lurcher" }), expect.anything()),
    );
    expect(screen.queryByRole("button", { name: /Lurcher/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search breeds, rescues or names")).not.toBeInTheDocument();
    // Card clicks are reported as the breed page's, not the catalog's
    expect((await screen.findByTestId("dog-card")).dataset.list).toBe("breed-page");
  });

  it("says none are listed, not that filters matched nothing, when the breed has no dogs", async () => {
    api.getAnimals.mockResolvedValue([]);
    render(<DogsPageClientSimplified initialDogs={[]} metadata={{}} initialParams={{ primary_breed: "Lurcher" }} hideHero hideBreadcrumbs />);

    expect(await screen.findByText("None listed right now")).toBeInTheDocument();
    expect(screen.queryByText("No dogs match your filters")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browse all dogs" }));
    expect(router.push).toHaveBeenCalledWith("/dogs");
  });
});

describe("the catalog on a rescue page (#501)", () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { push: jest.fn(), replace: jest.fn() };
    useRouter.mockReturnValue(router);
    usePathname.mockReturnValue("/organizations/some-rescue");
    useSearchParams.mockReturnValue(new URLSearchParams(""));
    api.getFilterCounts.mockResolvedValue({ total: 0 });
    api.getAvailableRegions.mockResolvedValue([]);
  });

  const metadata = { organizations: [{ id: null, name: "Any organization" }, { id: 7, name: "Some Rescue" }] };

  it("lists the rescue's dogs with no chip or picker for the rescue and no site search", async () => {
    api.getAnimals.mockResolvedValue([{ id: 1, name: "Rex", slug: "rex-1" }]);
    render(<DogsPageClientSimplified initialDogs={[]} metadata={metadata} initialParams={{ organization_id: "7" }} hideHero hideBreadcrumbs />);

    await waitFor(() =>
      expect(api.getAnimals).toHaveBeenCalledWith(expect.objectContaining({ organization_id: "7" }), expect.anything()),
    );
    expect(screen.queryByRole("button", { name: /Some Rescue/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("organization-filter")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search breeds, rescues or names")).not.toBeInTheDocument();
    // Card clicks are reported as the rescue page's, not the catalog's
    expect((await screen.findByTestId("dog-card")).dataset.list).toBe("org-page");
  });

  it("says none are listed when the rescue has no dogs", async () => {
    api.getAnimals.mockResolvedValue([]);
    render(<DogsPageClientSimplified initialDogs={[]} metadata={metadata} initialParams={{ organization_id: "7" }} hideHero hideBreadcrumbs />);

    expect(await screen.findByText("None listed right now")).toBeInTheDocument();
    expect(screen.getByText(/This rescue's list is updated three times a week/)).toBeInTheDocument();
  });

  it("Clear all keeps the rescue", async () => {
    useSearchParams.mockReturnValue(new URLSearchParams("age=Puppy"));
    api.getAnimals.mockResolvedValue([{ id: 1, name: "Rex", slug: "rex-1" }]);
    render(<DogsPageClientSimplified initialDogs={[]} metadata={metadata} initialParams={{ organization_id: "7" }} hideHero hideBreadcrumbs />);

    fireEvent.click(await screen.findByRole("button", { name: "Clear all" }));

    expect(router.replace).toHaveBeenCalledWith("/organizations/some-rescue", { scroll: false });
    await waitFor(() =>
      expect(api.getAnimals).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ age_category: expect.anything() }),
        expect.anything(),
      ),
    );
    expect(api.getAnimals).toHaveBeenLastCalledWith(expect.objectContaining({ organization_id: "7" }), expect.anything());
  });
});
