// installApp and installNudge together, unmocked: the other tests mock one of
// them, which hid a retirement that was never saved after an install.

type Modules = {
  app: typeof import("../installApp");
  nudge: typeof import("../installNudge");
};

function freshModules(): Modules {
  let modules!: Modules;
  jest.isolateModules(() => {
    modules = { app: require("../installApp"), nudge: require("../installNudge") };
  });
  return modules;
}

// An Android phone in Chrome, in a tab (not the installed app)
function androidChrome() {
  window.matchMedia = jest.fn((query: string) => ({
    matches: query === "(pointer: coarse)",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
  (window as { onbeforeinstallprompt?: unknown }).onbeforeinstallprompt = null;
}

function announcePrompt(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = () => Promise.resolve();
  event.userChoice = Promise.resolve({ outcome });
  window.__installPrompt = event as never;
}

const stored = () => JSON.parse(localStorage.getItem("installNudge") ?? "null");

describe("install flow", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    androidChrome();
  });

  afterEach(() => {
    window.__installPrompt = undefined;
    delete (window as { onbeforeinstallprompt?: unknown }).onbeforeinstallprompt;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("saves the retirement after an accepted install", async () => {
    const { app, nudge } = freshModules();
    nudge.recordVisit();
    announcePrompt("accepted");

    expect(await app.promptInstall()).toBe(true);
    nudge.dismissNudge();

    expect(stored().dismissed).toBe(true);
  });

  it("saves the retirement after an install from the browser's own menu", () => {
    const { nudge } = freshModules();
    nudge.recordVisit();
    window.dispatchEvent(new Event("appinstalled"));
    nudge.dismissNudge();

    expect(stored().dismissed).toBe(true);
  });

  it("stores nothing on a desktop, even when its footer install is used", async () => {
    window.matchMedia = jest.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const { app, nudge } = freshModules();
    announcePrompt("accepted");

    await app.promptInstall();
    nudge.dismissNudge();

    expect(stored()).toBeNull();
  });
});
