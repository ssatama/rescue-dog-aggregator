import { render, screen } from "@testing-library/react";
import InstallNudgeLoader from "../InstallNudgeLoader";
import { useMediaQuery } from "@/hooks/useMediaQuery";

jest.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: jest.fn() }));
jest.mock("../InstallNudge", () => ({
  __esModule: true,
  default: () => <div>install card</div>,
}));

describe("InstallNudgeLoader", () => {
  it("loads the card on a touch screen", async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    render(<InstallNudgeLoader />);
    expect(await screen.findByText("install card")).toBeInTheDocument();
  });

  it("loads nothing without one", async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    render(<InstallNudgeLoader />);
    await Promise.resolve();
    expect(screen.queryByText("install card")).toBeNull();
  });
});
