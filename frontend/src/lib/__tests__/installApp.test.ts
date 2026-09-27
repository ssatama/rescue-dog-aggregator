import { manualInstallMethod } from "../installApp";

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
  macSafari16:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
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
    ["Safari 17+ on a Mac", "mac-safari", UA.macSafari, 0],
    ["Safari 16 on a Mac (no Add to Dock)", null, UA.macSafari16, 0],
    ["an in-app browser", null, UA.iphoneInstagram, 5],
    // Chrome installs through its own prompt, not instructions
    ["Chrome on a Mac", null, UA.macChrome, 0],
    ["Chrome on Android", null, UA.androidChrome, 5],
    ["Firefox on a Mac", null, UA.macFirefox, 0],
  ])("%s → %s", (_name, expected, ua, touchPoints) => {
    expect(manualInstallMethod(ua, touchPoints)).toBe(expected);
  });
});
