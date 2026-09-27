import { render, screen } from "@testing-library/react";
import InstallNudgeLoader from "../InstallNudgeLoader";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canEverInstall } from "@/lib/installApp";

jest.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: jest.fn() }));
jest.mock("@/lib/installApp", () => ({ canEverInstall: jest.fn(() => true) }));
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

  it("loads nothing in the installed app or a browser that can't install", async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    (canEverInstall as jest.Mock).mockReturnValueOnce(false);
    render(<InstallNudgeLoader />);
    await Promise.resolve();
    expect(screen.queryByText("install card")).toBeNull();
  });

  it("loads nothing without one", async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    render(<InstallNudgeLoader />);
    await Promise.resolve();
    expect(screen.queryByText("install card")).toBeNull();
  });
});
