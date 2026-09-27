import { fireEvent, render, screen } from "@testing-library/react";
import InstallAppButton from "../InstallAppButton";
import { promptInstall, useInstallMethod } from "@/lib/installApp";
import { trackAppInstallClicked } from "@/lib/analytics";

jest.mock("@/lib/installApp", () => ({
  useInstallMethod: jest.fn(),
  promptInstall: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/lib/analytics", () => ({ trackAppInstallClicked: jest.fn() }));

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

  it("opens the browser's dialog and reports the click", async () => {
    mockMethod.mockReturnValue("prompt");
    const onDone = jest.fn();
    render(<InstallAppButton surface="menu" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(trackAppInstallClicked).toHaveBeenCalledWith("menu", "prompt");
    expect(promptInstall).toHaveBeenCalled();
    await screen.findByRole("button", { name: "Install app" });
    expect(onDone).toHaveBeenCalled();
  });

  it("shows the iPhone steps, and reports done when they are closed", async () => {
    mockMethod.mockReturnValue("ios");
    const onDone = jest.fn();
    render(<InstallAppButton surface="footer" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Home Screen" }));

    const dialog = await screen.findByRole("dialog", { name: /home screen/i });
    expect(dialog).toHaveTextContent("Share");
    expect(promptInstall).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows the Safari on Mac steps", async () => {
    mockMethod.mockReturnValue("mac-safari");
    render(<InstallAppButton surface="footer" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Dock" }));
    const dialog = await screen.findByRole("dialog", { name: /dock/i });
    expect(dialog).toHaveTextContent("File");
  });
});
