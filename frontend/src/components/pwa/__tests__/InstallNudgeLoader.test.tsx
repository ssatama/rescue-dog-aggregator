import { render, screen } from "@testing-library/react";
import InstallNudgeLoader from "../InstallNudgeLoader";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canEverInstall } from "@/lib/installApp";

jest.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: jest.fn() }));
jest.mock("@/lib/installApp", () => ({ canEverInstall: jest.fn(() => true) }));
let mockChunkFails = false;
jest.mock("../InstallNudge", () => ({
  __esModule: true,
  get default() {
    // Reading the module's export is inside the import() chain, like a failed chunk
    if (mockChunkFails) throw new Error("ChunkLoadError");
    return () => <div>install card</div>;
  },
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

  // Jest swallows unhandled rejections, so the .catch itself (which keeps a
  // failed chunk away from lib/chunkLoadError.ts's page reload) isn't provable here
  it("shows nothing when the card's chunk fails to load", async () => {
    mockChunkFails = true;
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    try {
      render(<InstallNudgeLoader />);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByText("install card")).toBeNull();
    } finally {
      mockChunkFails = false;
    }
  });

  it("loads nothing without one", async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    render(<InstallNudgeLoader />);
    await Promise.resolve();
    expect(screen.queryByText("install card")).toBeNull();
  });
});
