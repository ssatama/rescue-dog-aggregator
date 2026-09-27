import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InstallAppButton from "../InstallAppButton";
import { promptInstall, useInstallMethod } from "@/lib/installApp";
import { trackAppInstallClicked } from "@/lib/analytics";
import { dismissNudge } from "@/lib/installNudge";

jest.mock("@/lib/installApp", () => ({
  useInstallMethod: jest.fn(),
  promptInstall: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@/lib/analytics", () => ({ trackAppInstallClicked: jest.fn() }));
jest.mock("@/lib/installNudge", () => ({ dismissNudge: jest.fn() }));

const mockMethod = useInstallMethod as jest.Mock;

describe("InstallAppButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing where the site cannot be installed", () => {
    mockMethod.mockReturnValue(null);
    const { container } = render(<InstallAppButton surface="footer" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["prompt", "Install app"],
    ["ios", "Add to Home Screen"],
    ["mac-safari", "Add to Dock"],
  ])("labels the %s method %p", (method, label) => {
    mockMethod.mockReturnValue(method);
    render(<InstallAppButton surface="footer" />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("opens the browser's dialog, reports the click and retires the card", async () => {
    mockMethod.mockReturnValue("prompt");
    render(<InstallAppButton surface="menu" />);
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(trackAppInstallClicked).toHaveBeenCalledWith("menu", "prompt");
    expect(promptInstall).toHaveBeenCalled();
    await screen.findByRole("button", { name: "Install app" });
    expect(dismissNudge).toHaveBeenCalled();
  });

  it("keeps the card when the browser showed no dialog", async () => {
    mockMethod.mockReturnValue("prompt");
    (promptInstall as jest.Mock).mockResolvedValueOnce(false);
    render(<InstallAppButton surface="nudge" />);
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    await waitFor(() => expect(promptInstall).toHaveBeenCalled());
    await Promise.resolve();
    expect(dismissNudge).not.toHaveBeenCalled();
  });

  it("shows the iPhone steps, and retires the card once they are read, from any button", async () => {
    mockMethod.mockReturnValue("ios");
    render(<InstallAppButton surface="footer" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Home Screen" }));

    const dialog = await screen.findByRole("dialog", { name: /home screen/i });
    expect(dialog).toHaveTextContent("Share");
    expect(promptInstall).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(dismissNudge).toHaveBeenCalled();
  });

  it("marks Escape as handled, so the menu drawer behind the steps stays open", async () => {
    mockMethod.mockReturnValue("ios");
    const drawerEscape = jest.fn((event: KeyboardEvent) => event.defaultPrevented);
    document.addEventListener("keydown", drawerEscape);
    render(<InstallAppButton surface="menu" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Home Screen" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(drawerEscape).toHaveReturnedWith(true);
    document.removeEventListener("keydown", drawerEscape);
  });

  it("shows the Safari on Mac steps", async () => {
    mockMethod.mockReturnValue("mac-safari");
    render(<InstallAppButton surface="footer" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Dock" }));
    const dialog = await screen.findByRole("dialog", { name: /dock/i });
    expect(dialog).toHaveTextContent("File");
  });
});
