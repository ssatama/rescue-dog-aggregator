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
});
