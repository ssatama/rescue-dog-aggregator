import { render, screen } from "../../../test-utils";
import ContactSection from "../ContactSection";

describe("ContactSection", () => {
  test("renders all contact links", () => {
    render(<ContactSection />);
    expect(screen.getByText(/rescuedogsme@gmail.com/)).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn/)).toBeInTheDocument();
    expect(screen.getByText(/GitHub/)).toBeInTheDocument();
  });

  test("email link has mailto href", () => {
    render(<ContactSection />);
    const emailLink = screen.getByRole("link", {
      name: /rescuedogsme@gmail.com/i,
    });
    expect(emailLink).toHaveAttribute("href", "mailto:rescuedogsme@gmail.com");
  });

  test("external links have target blank", () => {
    render(<ContactSection />);
    const linkedinLink = screen.getByRole("link", { name: /linkedin/i });
    expect(linkedinLink).toHaveAttribute("target", "_blank");
    expect(linkedinLink).toHaveAttribute("rel", "noopener noreferrer");

    const githubLink = screen.getByRole("link", { name: /github/i });
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("contact links have focus-visible rings", () => {
    const { container } = render(<ContactSection />);
    const links = container.querySelectorAll("a");
    links.forEach((link) => {
      expect(link.className).toContain("focus-visible:ring-2");
      expect(link.className).toContain("focus-visible:ring-orange-500");
      expect(link.className).toContain("focus-visible:outline-none");
    });
  });

  test("icon containers have motion-reduce support", () => {
    const { container } = render(<ContactSection />);
    const iconContainers = container.querySelectorAll(".w-16.h-16");
    iconContainers.forEach((el) => {
      expect(el.className).toContain("motion-reduce:transition-none");
      expect(el.className).toContain("motion-reduce:transform-none");
    });
  });

  test("icon containers have shadow and hover effects", () => {
    const { container } = render(<ContactSection />);
    const iconContainers = container.querySelectorAll(".w-16.h-16");
    expect(iconContainers.length).toBe(3);

    iconContainers.forEach((el) => {
      expect(el.className).toContain("shadow-md");
      expect(el.className).toContain("group-hover:shadow-xl");
      expect(el.className).toContain("group-hover:scale-110");
      expect(el.className).toContain("group-hover:-translate-y-1");
    });
  });

  test("touch targets are 64x64px (exceeds 44x44px minimum)", () => {
    const { container } = render(<ContactSection />);
    const iconContainers = container.querySelectorAll(".w-16.h-16");
    expect(iconContainers.length).toBe(3);
    // w-16 = 64px, h-16 = 64px (16 * 4px = 64px)
  });

  test("labels have animated underline with motion-reduce", () => {
    const { container } = render(<ContactSection />);
    const underlines = container.querySelectorAll(".h-0\\.5.bg-orange-500");
    expect(underlines.length).toBe(3);

    underlines.forEach((el) => {
      expect(el.className).toContain("transition-all");
      expect(el.className).toContain("motion-reduce:transition-none");
    });
  });
});
