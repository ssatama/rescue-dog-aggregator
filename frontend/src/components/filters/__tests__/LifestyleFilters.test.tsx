import React from "react";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "../../../test-utils";
import LifestyleFilters, { activeLifestyleCount, type LifestyleFilterValues } from "../LifestyleFilters";

const OFF: LifestyleFilterValues = {
  goodWithKidsFilter: "",
  goodWithDogsFilter: "",
  goodWithCatsFilter: "",
  firstTimeFriendlyFilter: "",
  energyFilter: "",
};

const COUNTS = {
  good_with_kids: { count: 472, known: 628 },
  good_with_dogs: { count: 921, known: 1187 },
  good_with_cats: { count: 208, known: 309 },
  first_time_friendly: { count: 262, known: 1370 },
  energy_low: { count: 195, known: 1370 },
  energy_medium: { count: 622, known: 1370 },
  energy_high: { count: 553, known: 1370 },
};

function renderFilters(values: Partial<LifestyleFilterValues> = {}, counts: typeof COUNTS | null = COUNTS) {
  const onChange = jest.fn();
  const view = render(<LifestyleFilters values={{ ...OFF, ...values }} onChange={onChange} counts={counts} />);
  return { onChange, ...view };
}

describe("LifestyleFilters", () => {
  it("says how many dogs each toggle would show and how many have the information", () => {
    renderFilters();
    const cats = screen.getByRole("switch", { name: /Cats/ });
    expect(cats).toHaveAttribute("aria-checked", "false");
    expect(cats).toHaveTextContent("208");
    expect(cats).toHaveTextContent("Known for 309 dogs");
    expect(screen.getByRole("switch", { name: /First-time owners/ })).toHaveTextContent("Known for 1,370 dogs");
    expect(screen.getByRole("group", { name: "Energy" })).toHaveTextContent("Known for 1,370 dogs");
  });

  it("turns a toggle on and off", async () => {
    const { onChange, rerender } = renderFilters();
    await userEvent.click(screen.getByRole("switch", { name: /Children/ }));
    expect(onChange).toHaveBeenLastCalledWith("goodWithKidsFilter", "true");

    rerender(<LifestyleFilters values={{ ...OFF, goodWithKidsFilter: "true" }} onChange={onChange} counts={COUNTS} />);
    await userEvent.click(screen.getByRole("switch", { name: /Children/ }));
    expect(onChange).toHaveBeenLastCalledWith("goodWithKidsFilter", "");
  });

  it("picks an energy band, and pressing it again clears it", async () => {
    const { onChange } = renderFilters({ energyFilter: "high" });
    const energy = within(screen.getByRole("group", { name: "Energy" }));
    expect(energy.getByRole("button", { name: /High/ })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(energy.getByRole("button", { name: /Low/ }));
    expect(onChange).toHaveBeenLastCalledWith("energyFilter", "low");
    await userEvent.click(energy.getByRole("button", { name: /High/ }));
    expect(onChange).toHaveBeenLastCalledWith("energyFilter", "");
  });

  it("hides an option no dog would match, unless it is on", () => {
    renderFilters({ goodWithDogsFilter: "true" }, {
      ...COUNTS,
      good_with_cats: { count: 0, known: 0 },
      good_with_dogs: { count: 0, known: 12 },
    });
    expect(screen.queryByRole("switch", { name: /Cats/ })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Other dogs/ })).toHaveAttribute("aria-checked", "true");
  });

  it("renders nothing for dogs with no profile at all", () => {
    const none = { count: 0, known: 0 };
    renderFilters({}, Object.fromEntries(Object.keys(COUNTS).map((key) => [key, none])) as typeof COUNTS);
    expect(screen.queryByTestId("lifestyle-filters")).not.toBeInTheDocument();
  });

  it("offers every option, without numbers, before the counts arrive", () => {
    renderFilters({}, null);
    expect(screen.getAllByRole("switch")).toHaveLength(4);
    expect(screen.queryByText(/Known for/)).not.toBeInTheDocument();
  });

  it("counts the filters that are on", () => {
    expect(activeLifestyleCount(OFF)).toBe(0);
    expect(activeLifestyleCount({ ...OFF, goodWithCatsFilter: "true", energyFilter: "low" })).toBe(2);
  });
});
