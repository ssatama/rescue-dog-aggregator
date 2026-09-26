import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationDetailClient from "../OrganizationDetailClient";
import { trackOrganizationViewed } from "@/lib/analytics";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/organizations/some-rescue",
  useSearchParams: () => new URLSearchParams(""),
}));

const catalogProps = jest.fn();
jest.mock("../../../dogs/DogsPageClientSimplified", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    catalogProps(props);
    return <div data-testid="catalog" />;
  },
}));
jest.mock("@/lib/analytics", () => ({
  trackOrganizationViewed: jest.fn(),
  trackOrganizationWebsiteClicked: jest.fn(),
}));

const rescue = { id: 7, name: "Some Rescue", slug: "some-rescue", total_dogs: 12 };

describe("OrganizationDetailClient (#501)", () => {
  it("lists the rescue's dogs in the catalog with the rescue fixed", () => {
    render(<OrganizationDetailClient organization={rescue} initialDogs={[]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Some Rescue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Their dogs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rescues" })).toHaveAttribute("href", "/organizations");
    expect(catalogProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialParams: { organization_id: "7" }, hideHero: true, hideBreadcrumbs: true }),
    );
    expect(trackOrganizationViewed).toHaveBeenCalledWith("some-rescue", 12);
  });
});
