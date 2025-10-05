import { render, screen } from "../../../test-utils";
import HarleyStory from "../HarleyStory";

describe("HarleyStory", () => {
  test("renders both images with correct src", () => {
    render(<HarleyStory />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });

  test("displays before and after labels", () => {
    render(<HarleyStory />);
    expect(screen.getByText(/August 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Summer 2024/)).toBeInTheDocument();
  });

  test("displays story text", () => {
    render(<HarleyStory />);
    expect(screen.getByText(/I built this platform/)).toBeInTheDocument();
  });

  test("images have 3:4 aspect ratio", () => {
    render(<HarleyStory />);
    const images = screen.getAllByRole("img");
    images.forEach((img) => {
      expect(img.className).toContain("aspect-[3/4]");
    });
  });

  test("image containers have shadow and rounded corners", () => {
    const { container } = render(<HarleyStory />);
    const imageContainers = container.querySelectorAll(".shadow-xl");
    expect(imageContainers.length).toBeGreaterThan(0);

    imageContainers.forEach((el) => {
      expect(el.className).toContain("rounded-xl");
      expect(el.className).toContain("shadow-xl");
    });
  });

  test("has hover transition effects", () => {
    const { container } = render(<HarleyStory />);
    const hoverContainers = container.querySelectorAll(".hover\\:shadow-2xl");
    expect(hoverContainers.length).toBe(2);

    hoverContainers.forEach((el) => {
      expect(el.className).toContain("transition-all");
      expect(el.className).toContain("hover:-translate-y-1");
    });
  });

  test("story text has orange gradient accent", () => {
    const { container } = render(<HarleyStory />);
    const gradientAccent = container.querySelector(
      ".bg-gradient-to-b.from-orange-400.to-orange-600",
    );
    expect(gradientAccent).toBeInTheDocument();
  });
});
