import { act, fireEvent, render, screen } from "@testing-library/react";
import InstallNudge from "../InstallNudge";
import { canEverInstall, useInstallMethod } from "@/lib/installApp";
import { recordDogView } from "@/lib/installNudge";
import { usePathname } from "next/navigation";
import { trackInstallNudgeDismissed, trackInstallNudgeShown } from "@/lib/analytics";

jest.mock("@/lib/installApp", () => ({
  useInstallMethod: jest.fn(),
  canEverInstall: jest.fn(),
  promptInstall: jest.fn(),
}));
jest.mock("@/lib/analytics", () => ({
  trackAppInstallClicked: jest.fn(),
  trackInstallNudgeShown: jest.fn(),
  trackInstallNudgeDismissed: jest.fn(),
}));
jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

const mockMethod = useInstallMethod as jest.Mock;
const mockPathname = usePathname as jest.Mock;

function setTouch(touch: boolean) {
  window.matchMedia = jest.fn((query: string) => ({
    matches: query === "(pointer: coarse)" && touch,
  })) as unknown as typeof window.matchMedia;
}

function browseFiveDogs() {
  for (let i = 0; i < 5; i++) recordDogView(i);
}

describe("InstallNudge", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockMethod.mockReturnValue("ios");
    // installNudge only counts on a touch screen that can install
    (canEverInstall as jest.Mock).mockImplementation(() => mockMethod() !== null);
    setTouch(true);
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

  it("shows on the third session", () => {
    const now = Date.now();
    const gap = 31 * 60 * 1000;
    localStorage.setItem(
      "installNudge",
      JSON.stringify({ sessions: 2, lastSeen: now - gap, dismissed: false }),
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

  it("counts as seen before a quick dismissal, so the funnel adds up", () => {
    browseFiveDogs();
    render(<InstallNudge />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(trackInstallNudgeShown).toHaveBeenCalledWith("ios");
    expect(trackInstallNudgeDismissed).toHaveBeenCalledWith("ios");
  });

  it("never comes back once dismissed", () => {
    browseFiveDogs();
    const { unmount } = render(<InstallNudge />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
    expect(trackInstallNudgeDismissed).toHaveBeenCalledWith("ios");
    unmount();

    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it.each([
    ["without a touch screen", () => setTouch(false)],
    ["when already installed or not installable", () => mockMethod.mockReturnValue(null)],
    ["on the swipe page", () => mockPathname.mockReturnValue("/swipe")],
    // Dogs first: the mobile home stays dogs-only (AGENTS.md)
    ["on the home page", () => mockPathname.mockReturnValue("/")],
    // The adopt bar owns the bottom edge, even while the dog loads
    ["on a dog page", () => mockPathname.mockReturnValue("/dogs/milo-mixed-breed-11788")],
  ])("stays hidden %s", (_name, setup) => {
    setup();
    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it("appears on returning to a tab left open, when that is the third session", () => {
    localStorage.setItem(
      "installNudge",
      JSON.stringify({ sessions: 1, lastSeen: Date.now() - 31 * 60 * 1000, dismissed: false }),
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

  it("still shows on listings under /dogs", () => {
    mockPathname.mockReturnValue("/dogs/puppies");
    browseFiveDogs();
    render(<InstallNudge />);
    expect(screen.getByRole("region", { name: /home screen/i })).toBeInTheDocument();
  });

  it("retires when the site is installed from the browser's own menu", () => {
    browseFiveDogs();
    render(<InstallNudge />);
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("region", { name: /home screen/i })).toBeNull();
  });

  it("keeps a long visit spent scrolling one page as one session", () => {
    render(<InstallNudge />);
    for (let minute = 0; minute < 45; minute += 5) {
      act(() => jest.advanceTimersByTime(5 * 60 * 1000));
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
    }
    mockPathname.mockReturnValue("/dogs?page=2");
    render(<InstallNudge />);
    expect(JSON.parse(localStorage.getItem("installNudge")!).sessions).toBe(1);
  });

  it("keeps a long visit spent moving between pages as one session", () => {
    const { rerender } = render(<InstallNudge />);
    for (const page of ["/guides", "/organizations", "/dogs?page=2"]) {
      act(() => jest.advanceTimersByTime(20 * 60 * 1000));
      mockPathname.mockReturnValue(page);
      rerender(<InstallNudge />);
    }
    expect(JSON.parse(localStorage.getItem("installNudge")!).sessions).toBe(1);
  });

  it("appears as soon as the fifth dog is viewed, without a page change", () => {
    render(<InstallNudge />);
    act(() => browseFiveDogs());
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
