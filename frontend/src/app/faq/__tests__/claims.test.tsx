import { render, screen } from "@testing-library/react";
import FaqClient from "../FaqClient";

jest.mock("next/navigation", () => ({
  usePathname: () => "/faq",
}));

describe("FAQ unsupported claims", () => {
  it("does not quote a retention or success percentage", () => {
    render(<FaqClient />);

    // Scoped to the claim, not to every digit on the page: an unrelated
    // percentage ("100% non-commercial") is fine, an unsourced success rate
    // is not.
    const RETENTION_CLAIM =
      /\d+%\s*(?:of\s+)?(?:international\s+)?(?:rescue\s+)?(?:adoptions?|retention|success|still had)/i;

    expect(document.body.textContent).not.toMatch(RETENTION_CLAIM);
    expect(document.body.textContent).not.toMatch(/97%/);
  });

  it("does not make the retention claim in prose either", () => {
    render(<FaqClient />);

    // Norman et al. (2020) reports no retention finding, so the claim is just
    // as wrong spelled out as it was as a percentage.
    const PROSE_RETENTION =
      /(?:most|majority|nearly all|vast majority)[^.]{0,60}still (?:had|have) (?:their|the) dog/i;

    expect(document.body.textContent).not.toMatch(PROSE_RETENTION);
  });

  it("quotes the same adoption timeline as the guides", () => {
    render(<FaqClient />);

    expect(screen.getByText(/6-10 weeks/i)).toBeInTheDocument();
    expect(screen.queryByText(/2-3 weeks/i)).not.toBeInTheDocument();
  });
});
