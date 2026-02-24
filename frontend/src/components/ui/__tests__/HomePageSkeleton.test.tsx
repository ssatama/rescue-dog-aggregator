import { render, screen } from "../../../test-utils";
import HomePageSkeleton from "../HomePageSkeleton";

describe("HomePageSkeleton", () => {
  test("has correct accessibility attributes for screen readers", () => {
    render(<HomePageSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-label", "Loading home page");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  test("hero skeleton matches HeroSection layout structure", () => {
    render(<HomePageSkeleton />);

    const heroSkeleton = screen.getByTestId("hero-skeleton");

    expect(heroSkeleton.className).toContain("lg:py-24");
    expect(heroSkeleton.querySelector(".max-w-7xl")).toBeTruthy();
    expect(heroSkeleton.querySelector(".lg\\:flex-row")).toBeTruthy();

    const statPlaceholders = heroSkeleton.querySelectorAll(
      ".grid.grid-cols-1.md\\:grid-cols-3 > div",
    );
    expect(statPlaceholders).toHaveLength(3);
  });
});
