import { render, screen, fireEvent, within } from "@testing-library/react";
import AgeQuickNav from "../AgeQuickNav";

jest.mock("next/link", () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("AgeQuickNav", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("Desktop (horizontal pills)", () => {
    it("renders all age category links plus All Dogs", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(within(desktopNav).getByText("All Dogs")).toBeInTheDocument();
      expect(within(desktopNav).getByText("Puppies")).toBeInTheDocument();
      expect(within(desktopNav).getByText("Seniors")).toBeInTheDocument();
    });

    it("highlights current age category with active styles", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const puppiesPill = within(desktopNav)
        .getByText("Puppies")
        .closest("div");
      expect(puppiesPill).toHaveClass("bg-orange-500");
    });

    it("renders age category emojis", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(within(desktopNav).getByText("\u{1F436}")).toBeInTheDocument();
      expect(within(desktopNav).getByText("\u{1F9B4}")).toBeInTheDocument();
    });

    it("renders correct href for each age category", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(
        within(desktopNav).getByRole("link", { name: /All Dogs/i })
      ).toHaveAttribute("href", "/dogs");
      expect(
        within(desktopNav).getByRole("link", { name: /Puppies/i })
      ).toHaveAttribute("href", "/dogs/puppies");
      expect(
        within(desktopNav).getByRole("link", { name: /Seniors/i })
      ).toHaveAttribute("href", "/dogs/senior");
    });

    it("applies non-active styles to other categories", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const seniorPill = within(desktopNav).getByText("Seniors").closest("div");
      expect(seniorPill).toHaveClass("bg-muted");
    });

    it("highlights All Dogs when no currentSlug", () => {
      render(<AgeQuickNav currentSlug={null} />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const allPill = within(desktopNav).getByText("All Dogs").closest("div");
      expect(allPill).toHaveClass("bg-orange-500");
    });

    it("highlights senior page correctly", () => {
      render(<AgeQuickNav currentSlug="senior" />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const seniorPill = within(desktopNav).getByText("Seniors").closest("div");
      expect(seniorPill).toHaveClass("bg-orange-500");
    });
  });

  describe("Mobile (dropdown selector)", () => {
    it("shows current age category in dropdown button", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      expect(within(mobileNav).getByText("Puppies")).toBeInTheDocument();
      expect(within(mobileNav).getByText("\u{1F436}")).toBeInTheDocument();
    });

    it("shows senior dogs in dropdown when selected", () => {
      render(<AgeQuickNav currentSlug="senior" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      expect(within(mobileNav).getByText("Senior Dogs")).toBeInTheDocument();
    });

    it("shows All Dogs when no currentSlug selected", () => {
      render(<AgeQuickNav currentSlug={null} />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      expect(within(button).getByText("All Dogs")).toBeInTheDocument();
    });

    it("opens dropdown when button clicked", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("navigates to age category when option selected", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const seniorOption = screen.getByRole("option", { name: /Senior Dogs/i });
      fireEvent.click(seniorOption);

      expect(mockPush).toHaveBeenCalledWith("/dogs/senior");
    });

    it("navigates to All Dogs when option selected", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const listbox = screen.getByRole("listbox");
      const allDogsOption = within(listbox).getByRole("option", {
        name: /All Dogs/i,
      });
      fireEvent.click(allDogsOption);

      expect(mockPush).toHaveBeenCalledWith("/dogs");
    });

    it("shows checkmark on current category in dropdown", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      const puppiesOption = screen.getByRole("option", { name: /Puppies/i });
      expect(puppiesOption).toHaveAttribute("aria-selected", "true");
    });

    it("displays age range in dropdown options", () => {
      render(<AgeQuickNav currentSlug="puppies" />);

      const mobileNav = document.querySelector(".md\\:hidden");
      const button = within(mobileNav).getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("(Under 1 year)")).toBeInTheDocument();
      expect(screen.getByText("(8+ years)")).toBeInTheDocument();
    });
  });

  it("always renders All Dogs even with undefined currentSlug", () => {
    render(<AgeQuickNav currentSlug={undefined} />);

    const desktopNav = document.querySelector(".hidden.md\\:flex");
    expect(within(desktopNav).getByText("All Dogs")).toBeInTheDocument();
  });
});
