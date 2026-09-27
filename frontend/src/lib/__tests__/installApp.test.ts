import { act, renderHook } from "@testing-library/react";
import { manualInstallMethod, promptInstall, useInstallMethod } from "../installApp";

jest.mock("@/lib/analytics", () => ({ trackAppInstalled: jest.fn() }));

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0",
  // iPadOS asks for the desktop site and reports itself as a Mac
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  // Safari 17 and 18 also run on Monterey and Ventura, which have no Add to Dock
  macSafari18:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  // WKWebView in LinkedIn, Gmail, Slack...: no Safari/ token
  iphoneWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30",
  // Chrome on iOS before 16.4 has no Add to Home Screen
  iphoneChromeOld:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/110.0.0.0 Mobile/15E148 Safari/604.1",
  iphoneSafariOld:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  macFirefox:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
};

describe("manualInstallMethod", () => {
  it.each([
    ["iPhone Safari", "ios", UA.iphoneSafari, 5],
    ["iPhone Chrome", "ios", UA.iphoneChrome, 5],
    ["iPad", "ios", UA.ipad, 5],
    ["Safari on an old iPhone", "ios", UA.iphoneSafariOld, 5],
    ["Safari 26 on a Mac", "mac-safari", UA.macSafari, 0],
    ["Safari 18 on a Mac (maybe Ventura)", null, UA.macSafari18, 0],
    ["an in-app browser", null, UA.iphoneInstagram, 5],
    ["an app's web view", null, UA.iphoneWebView, 5],
    ["Chrome on iOS 16.3", null, UA.iphoneChromeOld, 5],
    // Chrome installs through its own prompt, not instructions
    ["Chrome on a Mac", null, UA.macChrome, 0],
    ["Chrome on Android", null, UA.androidChrome, 5],
    ["Firefox on a Mac", null, UA.macFirefox, 0],
  ])("%s → %s", (_name, expected, ua, touchPoints) => {
    expect(manualInstallMethod(ua, touchPoints)).toBe(expected);
  });
});

describe("the browser's install prompt", () => {
  function fakePrompt(result: Promise<{ outcome: "accepted" | "dismissed" }>) {
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: jest.Mock;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    event.prompt = jest.fn(() => Promise.resolve());
    event.userChoice = result;
    return event;
  }

  function announce(event: ReturnType<typeof fakePrompt>) {
    act(() => {
      window.__installPrompt = event as never;
      window.dispatchEvent(new Event("installpromptchange"));
    });
  }

  afterEach(() => {
    window.__installPrompt = undefined;
  });

  it("offers the prompt once the layout script announces it", () => {
    const { result } = renderHook(() => useInstallMethod());
    expect(result.current).toBeNull();
    announce(fakePrompt(Promise.resolve({ outcome: "dismissed" })));
    expect(result.current).toBe("prompt");
  });

  it("drops the spent prompt when it is dismissed", async () => {
    const { result } = renderHook(() => useInstallMethod());
    const event = fakePrompt(Promise.resolve({ outcome: "dismissed" }));
    announce(event);
    await act(() => promptInstall());
    expect(event.prompt).toHaveBeenCalled();
    expect(window.__installPrompt).toBeUndefined();
    expect(result.current).toBeNull();
  });

  it("recovers when the browser rejects a stale prompt", async () => {
    const { result } = renderHook(() => useInstallMethod());
    const event = fakePrompt(Promise.reject(new Error("InvalidStateError")));
    event.userChoice.catch(() => {});
    announce(event);
    await act(() => promptInstall());
    expect(result.current).toBeNull();
  });
});
