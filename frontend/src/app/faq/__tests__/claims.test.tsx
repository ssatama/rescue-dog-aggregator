import { render, screen } from "@testing-library/react";
import FaqClient from "../FaqClient";

jest.mock("next/navigation", () => ({
  usePathname: () => "/faq",
}));

describe("FAQ unsupported claims", () => {
  it("does not quote a retention or success percentage", () => {
    const { container } = render(<FaqClient />);

    expect(container.textContent).not.toMatch(/\d+%/);
  });

  it("quotes the same adoption timeline as the guides", () => {
    render(<FaqClient />);

    expect(screen.getByText(/6-10 weeks/i)).toBeInTheDocument();
    expect(screen.queryByText(/2-3 weeks/i)).not.toBeInTheDocument();
  });
});
