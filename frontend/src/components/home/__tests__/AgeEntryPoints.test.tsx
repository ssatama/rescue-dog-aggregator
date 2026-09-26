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

describe("AgeEntryPoints on the age hub", () => {
  it("keeps both links without counts when asked to", () => {
    render(<AgeEntryPoints puppies={0} seniors={0} keepEmpty />);

    expect(screen.getByRole("link", { name: /Puppies/ })).toHaveTextContent("PuppiesUnder a year old");
    expect(screen.getByRole("link", { name: /Seniors/ })).toHaveAttribute("href", "/dogs/senior");
  });
});
