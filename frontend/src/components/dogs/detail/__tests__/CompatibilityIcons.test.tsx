import React from "react";
import { render } from "@testing-library/react";
import CompatibilityIcons from "../CompatibilityIcons";

describe("CompatibilityIcons accessibility (#448)", () => {
  it("gives each icon a spoken label and a dark-mode text colour", () => {
    const { getByRole } = render(
      <CompatibilityIcons profilerData={{ good_with_dogs: "yes", good_with_cats: "unknown" } as never} />,
    );

    const dogs = getByRole("img", { name: "Good with dogs: yes" });
    expect(dogs.className).toMatch(/text-green-800/);
    expect(dogs.className).toMatch(/dark:text-green-300/);
  });
});
