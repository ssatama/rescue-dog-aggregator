import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RescueHeader from "../RescueHeader";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";
import { trackOrganizationWebsiteClicked } from "@/lib/analytics";

jest.mock("@/lib/analytics", () => ({ trackOrganizationWebsiteClicked: jest.fn() }));

const rescue = {
  id: 7,
  name: "Tierschutzverein Europa",
  slug: "tierschutzverein-europa",
  description: "We rescue dogs from Spain and Romania.",
  website_url: "https://tierschutz.example",
  country: "DE",
  city: "Berlin",
  service_regions: ["ES", "RO"],
  ships_to: ["DE"],
  social_media: { facebook: "https://facebook.com/tsv", website: "https://tierschutz.example" },
  total_dogs: 120,
};

describe("RescueHeader (#501)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetVisitorLocationForTests();
  });

  it("says where the rescue is, where its dogs are and where they go, in plain words", () => {
    render(<RescueHeader organization={rescue} />);

    expect(screen.getByRole("heading", { level: 1, name: "Tierschutzverein Europa" })).toBeInTheDocument();
    expect(screen.getByText("Based in Berlin, Germany")).toBeInTheDocument();
    expect(screen.getByText("Their dogs live in Romania and Spain.")).toBeInTheDocument();
    expect(screen.getByText("They rehome dogs to Germany.")).toBeInTheDocument();
    expect(screen.getByText(/dogs listed/).parentElement).toHaveTextContent("120 dogs listed");
  });

  it("keeps the website and social links", () => {
    render(<RescueHeader organization={rescue} />);

    const website = screen.getByRole("link", { name: /Visit website/ });
    expect(website).toHaveAttribute("href", "https://tierschutz.example");
    fireEvent.click(website);
    expect(trackOrganizationWebsiteClicked).toHaveBeenCalledWith("tierschutzverein-europa", "https://tierschutz.example");
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute("href", "https://facebook.com/tsv");
    // The website is the button, not a second globe icon
    expect(screen.queryByRole("link", { name: /website page/i })).not.toBeInTheDocument();
  });

  it("puts a long list of countries behind a count", () => {
    const many = ["AT", "BE", "CH", "DE", "DK", "FR", "NL"];
    render(<RescueHeader organization={{ ...rescue, ships_to: many }} />);

    expect(screen.getByText("They rehome dogs to 7 countries.")).toBeInTheDocument();
    expect(screen.getByText(/Austria, Belgium, Denmark, France, Germany, Netherlands and Switzerland/)).toBeInTheDocument();
  });

  it("hides what the rescue does not publish", () => {
    render(<RescueHeader organization={{ id: 1, name: "Bare Rescue", total_dogs: 0 }} />);

    expect(screen.queryByText(/Based in/)).not.toBeInTheDocument();
    expect(screen.queryByText(/rehome/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not provided|Unknown/)).not.toBeInTheDocument();
  });

  it("counts the dogs adoptable to the visitor and filters the list to them", () => {
    localStorage.setItem("visitorCountry", "DE");
    const onShow = jest.fn();
    render(
      <RescueHeader
        organization={rescue}
        adoptableOptions={[{ value: "DE", label: "DE", count: 118 }]}
        onShowAdoptable={onShow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /118 adoptable to you in Germany/ }));
    expect(onShow).toHaveBeenCalledWith("DE");
  });
});
