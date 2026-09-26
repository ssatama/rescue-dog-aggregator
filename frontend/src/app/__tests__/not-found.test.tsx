import React from "react";
import { render, screen } from "@testing-library/react";
import NotFound, { metadata } from "../not-found";
import { getAnimalsByCuration } from "@/services/serverAnimalsService";

jest.mock("@/components/layout/Layout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="site-layout">{children}</div>
  ),
}));
jest.mock("@/services/serverAnimalsService", () => ({ getAnimalsByCuration: jest.fn() }));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

describe("branded 404 (#456)", () => {
  it("renders inside the site layout with paths back into the catalogue", async () => {
    (getAnimalsByCuration as jest.Mock).mockResolvedValue([
      { id: 7, name: "Mabel", slug: "mabel-dachshund-7", standardized_breed: "Dachshund" },
    ]);

    render(await NotFound());

    expect(screen.getByTestId("site-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn't find that page");
    // Dogs vanish from rescue sites for many reasons: never "found a home" (#484)
    expect(document.body).toHaveTextContent("may no longer be listed");
    expect(document.body).not.toHaveTextContent(/found a home|adopted/i);
    for (const href of ["/dogs", "/breeds", "/guides"]) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Mabel/ })).toHaveAttribute("href", "/dogs/mabel-dachshund-7");
  });

  it("still renders when there are no recent dogs", async () => {
    (getAnimalsByCuration as jest.Mock).mockResolvedValue([]);

    render(await NotFound());

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Recently listed")).not.toBeInTheDocument();
  });

  it("is noindex so it never contradicts the injected 404 robots tag (#441)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
