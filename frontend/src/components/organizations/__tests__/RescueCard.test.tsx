import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RescueCard from "../RescueCard";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";

const rescue = {
  id: 3,
  name: "Pets in Turkey",
  slug: "pets-in-turkey",
  country: "TR",
  city: "Izmir",
  ships_to: ["DE", "UK"],
  total_dogs: 42,
  new_this_week: 2,
  recent_dogs: [
    { id: 1, name: "Bella", thumbnail_url: "https://images.rescuedogs.me/bella.jpg" },
    { id: 2, name: "Nopic" },
  ],
};

describe("RescueCard (#501)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetVisitorLocationForTests();
  });

  it("links to the rescue's page with one action, where it is and what it has", () => {
    render(<RescueCard organization={rescue} />);

    expect(screen.getByRole("link", { name: "Pets in Turkey" })).toHaveAttribute("href", "/organizations/pets-in-turkey");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("See their dogs")).toBeInTheDocument();
    expect(screen.getByText("Izmir, Turkey")).toBeInTheDocument();
    expect(screen.getByText(/dogs listed/)).toHaveTextContent("42 dogs listed · 2 new this week");
    expect(screen.getByText("Rehomes to Germany and United Kingdom")).toBeInTheDocument();
    // Only dogs with a photo are in the strip
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("says a rescue rehomes to the visitor only when it does", () => {
    localStorage.setItem("visitorCountry", "DE");
    const { rerender } = render(<RescueCard organization={rescue} />);
    expect(screen.getByText(/Adoptable to you/)).toBeInTheDocument();

    localStorage.setItem("visitorCountry", "FR");
    resetVisitorLocationForTests();
    rerender(<RescueCard organization={{ ...rescue }} />);
    expect(screen.queryByText(/Adoptable to you/)).not.toBeInTheDocument();
  });

  it("leaves out rows the rescue does not publish", () => {
    render(<RescueCard organization={{ id: 9, name: "Quiet Rescue", slug: "quiet", total_dogs: 1 }} />);

    expect(screen.getByText(/dog listed/)).toHaveTextContent("1 dog listed");
    expect(screen.queryByText(/Rehomes to/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not provided|Unknown/)).not.toBeInTheDocument();
  });
});
