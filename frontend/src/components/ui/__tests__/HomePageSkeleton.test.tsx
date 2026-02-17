import { render, screen } from "../../../test-utils";
import HomePageSkeleton from "../HomePageSkeleton";

describe("HomePageSkeleton", () => {
  test("has correct accessibility attributes for screen readers", () => {
    render(<HomePageSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-label", "Loading home page");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });
});
