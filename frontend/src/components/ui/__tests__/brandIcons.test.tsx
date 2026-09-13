import { render } from "@testing-library/react";
import { Facebook, Github, Instagram, Linkedin } from "../brandIcons";

describe("brand icons vendored from lucide 0.577", () => {
  it.each([
    ["facebook", Facebook],
    ["instagram", Instagram],
    ["linkedin", Linkedin],
    ["github", Github],
  ])("%s renders a lucide-styled svg that takes className", (name, Icon) => {
    const { container } = render(<Icon className="w-7 h-7" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("lucide", `lucide-${name}`, "w-7", "h-7");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.children.length).toBeGreaterThan(0);
  });
});
