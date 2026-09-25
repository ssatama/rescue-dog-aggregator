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

  test("wordmark stays visible at every width", () => {
    render(<Header />);

    const home = screen.getByRole("link", { name: /rescuedogs home/i });
    expect(home).toHaveTextContent("rescuedogs");
    expect(home.className).not.toMatch(/sr-only/);
  });
});

// The search field has its own tests (GlobalSearch.test.tsx)
jest.mock("../../search/GlobalSearch", () => ({ __esModule: true, default: () => null }));
