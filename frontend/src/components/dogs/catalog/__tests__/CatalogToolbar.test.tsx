import React from "react";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../test-utils";
import CatalogToolbar, { activeFilterChips } from "../CatalogToolbar";
import { trackSortChanged } from "@/lib/analytics";
import type { Filters } from "@/types/dogsPage";

jest.mock("@/lib/analytics", () => ({ trackSortChanged: jest.fn() }));

const NONE: Filters = {
  searchQuery: "",
  sizeFilter: "Any size",
  ageFilter: "Any age",
  sexFilter: "Any",
  organizationFilter: "any",
  breedFilter: "Any breed",
  breedGroupFilter: "Any group",
  locationCountryFilter: "Any country",
  availableCountryFilter: "Any country",
  availableRegionFilter: "Any region",
  sortFilter: "recommended",
};

function renderToolbar(filters: Partial<Filters> = {}, total: number | null = 214, fixed: ("ageFilter")[] = []) {
  const handlers = { onRemove: jest.fn(), onClearAll: jest.fn(), onSortChange: jest.fn() };
  render(
    <CatalogToolbar
      filters={{ ...NONE, ...filters }}
      total={total}
      organizations={[{ id: 28, name: "Dogs Trust" }]}
      fixed={fixed}
      {...handlers}
    />,
  );
  return handlers;
}

describe("CatalogToolbar", () => {
  it("says how many dogs match", () => {
    renderToolbar();
    expect(screen.getByTestId("result-count")).toHaveTextContent("214 dogs match");
  });

  it("says where they can be adopted when that filter is on", () => {
    renderToolbar({ availableCountryFilter: "UK" }, 1);
    expect(screen.getByTestId("result-count")).toHaveTextContent("1 dog matches you can adopt in United Kingdom");
  });

  it("shows nothing until the count arrives", () => {
    renderToolbar({}, null);
    expect(screen.getByTestId("result-count")).toBeEmptyDOMElement();
  });

  it("has no chips or Clear all without filters", () => {
    renderToolbar();
    expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
  });

  it("removes one filter per chip and clears them all", async () => {
    const { onRemove, onClearAll } = renderToolbar({ sizeFilter: "Small", organizationFilter: "28", searchQuery: "rex" });

    expect(screen.getAllByRole("button", { name: /Remove filter/ }).map((b) => b.textContent)).toEqual([
      "“rex”Remove filter",
      "SmallRemove filter",
      "Dogs TrustRemove filter",
    ]);
    await userEvent.click(screen.getByRole("button", { name: /Small/ }));
    expect(onRemove).toHaveBeenCalledWith("sizeFilter", "Any size");

    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("does not offer to remove a filter the landing page sets", () => {
    renderToolbar({ ageFilter: "Puppy" }, 10, ["ageFilter"]);
    expect(screen.queryByRole("button", { name: /Puppy/ })).not.toBeInTheDocument();
  });

  it("changes the order and records it", async () => {
    const { onSortChange } = renderToolbar();
    await userEvent.click(screen.getByRole("combobox", { name: "Sort dogs" }));
    await userEvent.click(screen.getByRole("option", { name: "Waiting longest" }));

    expect(onSortChange).toHaveBeenCalledWith("oldest");
    expect(trackSortChanged).toHaveBeenCalledWith("oldest");
  });
});

describe("activeFilterChips", () => {
  it("never makes a chip for the sort", () => {
    expect(activeFilterChips({ ...NONE, sortFilter: "oldest" })).toEqual([]);
  });

  it("names countries and adoptability", () => {
    expect(activeFilterChips({ ...NONE, availableCountryFilter: "UK", locationCountryFilter: "DE" }).map((c) => c.label)).toEqual([
      "Adoptable to 🇬🇧 United Kingdom",
      "In Germany",
    ]);
  });
});
