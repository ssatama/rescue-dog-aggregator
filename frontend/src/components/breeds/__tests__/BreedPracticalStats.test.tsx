import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedPracticalStats from "../BreedPracticalStats";
import type { BreedPracticalStats as Stats } from "@/utils/breedPracticalStats";

const empty: Stats = { compatibility: [], energy: null, size: null, age: null };

describe("BreedPracticalStats (#500)", () => {
  it("labels every stat with the dogs it comes from", () => {
    render(
      <BreedPracticalStats
        stats={{
          compatibility: [{ key: "good_with_cats", label: "Good with cats", count: 6, known: 23, percent: 26 }],
          energy: { known: 8, parts: [{ label: "High", count: 8, percent: 100 }] },
          size: null,
          age: [{ label: "Adult", count: 9 }],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "What the rescues say about these dogs" })).toBeInTheDocument();
    expect(screen.getByText("26%")).toBeInTheDocument();
    expect(screen.getByText("6 of 23 dogs with this info")).toBeInTheDocument();
    expect(screen.getByText("of 8 dogs with this info")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Age" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Size" })).not.toBeInTheDocument();
  });

  it("renders nothing for a breed without enough profiled dogs", () => {
    const { container } = render(<BreedPracticalStats stats={empty} />);
    expect(container).toBeEmptyDOMElement();
  });
});
