import { act, fireEvent, render, screen } from "@testing-library/react";
import InstallNudge from "../InstallNudge";
import { useInstallMethod } from "@/lib/installApp";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { recordDogView } from "@/lib/installNudge";
import { usePathname } from "next/navigation";
import { trackInstallNudgeDismissed, trackInstallNudgeShown } from "@/lib/analytics";

jest.mock("@/lib/installApp", () => ({
  useInstallMethod: jest.fn(),
  promptInstall: jest.fn(),
}));
jest.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: jest.fn() }));
jest.mock("@/lib/analytics", () => ({
  trackAppInstallClicked: jest.fn(),
  trackInstallNudgeShown: jest.fn(),
  trackInstallNudgeDismissed: jest.fn(),
}));
jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

const mockMethod = useInstallMethod as jest.Mock;
const mockIsTouch = useMediaQuery as jest.Mock;
const mockPathname = usePathname as jest.Mock;

function browseFiveDogs() {
  for (let i = 0; i < 5; i++) recordDogView();
}

describe("InstallNudge", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockMethod.mockReturnValue("ios");
    mockIsTouch.mockReturnValue(true);
    mockPathname.mockReturnValue("/dogs");
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it("stays hidden on a first, light visit", () => {
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it("shows after heavy browsing, counted in analytics once ever", () => {
    browseFiveDogs();
    const { rerender, unmount } = render(<InstallNudge />);
    expect(screen.getByRole("region", { name: /home screen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show me how" })).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1000));
    rerender(<InstallNudge />);
    act(() => jest.advanceTimersByTime(1000));
    // A full page load in the same session remounts the card
    unmount();
    render(<InstallNudge />);
    act(() => jest.advanceTimersByTime(1000));
    expect(trackInstallNudgeShown).toHaveBeenCalledTimes(1);
    expect(trackInstallNudgeShown).toHaveBeenCalledWith("ios");
  });

  it("is not counted as shown while CSS hides it behind the adopt bar", () => {
    const original = HTMLElement.prototype.checkVisibility;
    HTMLElement.prototype.checkVisibility = () => false;
    browseFiveDogs();
    render(<InstallNudge />);
    act(() => jest.advanceTimersByTime(1000));
    expect(trackInstallNudgeShown).not.toHaveBeenCalled();
    HTMLElement.prototype.checkVisibility = original;
  });

  it("shows on the third session", () => {
    const now = Date.now();
    const gap = 31 * 60 * 1000;
    localStorage.setItem(
      "installNudge",
      JSON.stringify({ sessions: 2, dogViews: 0, lastSeen: now - gap, dismissed: false }),
    );
    render(<InstallNudge />);
    expect(screen.getByRole("region", { name: /home screen/i })).toBeInTheDocument();
  });

  it("offers the browser's own dialog where there is one", () => {
    mockMethod.mockReturnValue("prompt");
    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
  });

  it("never comes back once dismissed", () => {
    browseFiveDogs();
    const { unmount } = render(<InstallNudge />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
    expect(trackInstallNudgeDismissed).toHaveBeenCalledWith("ios");
    unmount();

    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it.each([
    ["without a touch screen", () => mockIsTouch.mockReturnValue(false)],
    ["when already installed or not installable", () => mockMethod.mockReturnValue(null)],
    ["on the swipe page", () => mockPathname.mockReturnValue("/swipe")],
    // Dogs first: the mobile home stays dogs-only (AGENTS.md)
    ["on the home page", () => mockPathname.mockReturnValue("/")],
  ])("stays hidden %s", (_name, setup) => {
    setup();
    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it("appears on returning to a tab left open, when that is the third session", () => {
    localStorage.setItem(
      "installNudge",
      JSON.stringify({ sessions: 1, dogViews: 0, lastSeen: Date.now() - 31 * 60 * 1000, dismissed: false }),
    );
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();

    const setVisibility = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    act(() => setVisibility("hidden"));
    act(() => jest.advanceTimersByTime(31 * 60 * 1000));
    act(() => setVisibility("visible"));
    expect(screen.getByRole("region", { name: /home screen/i })).toBeInTheDocument();
  });

  it("appears on the next page once browsing crosses the threshold", () => {
    const { rerender } = render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
    act(() => browseFiveDogs());
    mockPathname.mockReturnValue("/dogs?page=2");
    rerender(<InstallNudge />);
    expect(screen.getByRole("region", { name: /home screen/i })).toBeInTheDocument();
  });
});
