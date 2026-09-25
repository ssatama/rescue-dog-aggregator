import React from "react";
import { render, screen } from "../../../test-utils";
import AgeEntryPoints from "../AgeEntryPoints";

describe("AgeEntryPoints", () => {
  it("links to the puppy and senior pages with their counts", () => {
    render(<AgeEntryPoints puppies={234} seniors={213} />);
    expect(screen.getByRole("link", { name: /Puppies.*234 dogs/ })).toHaveAttribute("href", "/dogs/puppies");
    expect(screen.getByRole("link", { name: /Seniors.*213 dogs/ })).toHaveAttribute("href", "/dogs/senior");
  });

  it("leaves out an age with no dogs", () => {
    render(<AgeEntryPoints puppies={0} seniors={5} />);
    expect(screen.queryByRole("link", { name: /Puppies/ })).not.toBeInTheDocument();
  });
});
