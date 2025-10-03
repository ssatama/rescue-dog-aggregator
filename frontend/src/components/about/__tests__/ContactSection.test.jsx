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
    const emailLink = screen.getByRole("link", { name: /rescuedogsme@gmail.com/i });
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
});
