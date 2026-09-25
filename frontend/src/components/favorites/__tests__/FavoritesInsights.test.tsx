/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FavoritesInsights from "../FavoritesInsights";
import type { Dog } from "@/types/dog";

const dog = (id: number, extra: Partial<Dog> = {}): Dog => ({
  id,
  name: `Dog ${id}`,
  organization: { name: "Happy Paws" },
  ...extra,
});

describe("FavoritesInsights (#498)", () => {
  test("lists what every dog has in common", () => {
    render(<FavoritesInsights dogs={[dog(1), dog(2)]} />);
    expect(screen.getByRole("heading", { name: "What your 2 dogs have in common" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("All at Happy Paws");
  });

  test("renders nothing when the dogs share nothing known", () => {
    const { container } = render(
      <FavoritesInsights dogs={[dog(1), dog(2, { organization: { name: "Other Rescue" } })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
