import { render, screen } from "../../../test-utils";
import { usePathname } from "next/navigation";
import Header from "../Header";
import HeaderDesktopNav from "../HeaderDesktopNav";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("Header accessibility and responsive breakpoints", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  test("desktop nav uses lg breakpoint to avoid tablet truncation", () => {
    render(<HeaderDesktopNav />);

    const navContainer = screen.getByRole("button", { name: /dogs/i }).closest(
      "div.hidden",
    );
    expect(navContainer).toHaveClass("lg:flex");
    expect(navContainer).not.toHaveClass("md:flex");
  });

  test("mobile theme toggle uses lg:hidden breakpoint", () => {
    render(<Header />);

    const themeToggleContainer = screen
      .getAllByRole("button")
      .find((btn) => btn.closest("div.lg\\:hidden"));
    expect(themeToggleContainer).toBeTruthy();
  });

  test("logo text uses lg:not-sr-only breakpoint", () => {
    render(<Header />);

    const logoText = screen.getByText("Rescue Dog Aggregator");
    expect(logoText).toHaveClass("sr-only");
    expect(logoText).toHaveClass("lg:not-sr-only");
    expect(logoText).not.toHaveClass("md:not-sr-only");
  });
});
