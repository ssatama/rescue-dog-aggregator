// One-time PostHog opt-out for personal devices.
//
// Visit `?posthog_optout=1` once on a browser to permanently exclude it from
// PostHog (until site data is cleared); `?posthog_optout=0` re-enables capture.
// State persists in a single localStorage key — the only persistent storage
// the analytics layer touches, kept minimal to preserve the cookie-banner-free
// posture for real users (see `instrumentation-client.ts`, `persistence: "memory"`).

const STORAGE_KEY = "ph_optout";
const QUERY_PARAM = "posthog_optout";

interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function resolvePosthogOptOut(
  search: string,
  storage: MinimalStorage | null
): boolean {
  if (!storage) return false;

  // URL parsing is outside the try — `URLSearchParams` is permissive and
  // doesn't throw on any string input, so the catch only needs to protect
  // the storage write it actually claims to protect.
  const flag = new URLSearchParams(search).get(QUERY_PARAM);

  // Write the URL flag separately from the read so a write failure (Safari
  // private mode, quota exceeded, locked storage) still lets a prior opt-out
  // win on the read below.
  try {
    if (flag === "1") {
      storage.setItem(STORAGE_KEY, "1");
    } else if (flag === "0") {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    // Visible to the developer triggering the URL flag — without this they'd
    // have no signal that their personal opt-out failed to persist.
    console.warn("[posthogOptOut] failed to persist opt-out flag:", err);
  }

  try {
    return storage.getItem(STORAGE_KEY) === "1";
  } catch (err) {
    // Fail open (return false = capture). This is a developer-only personal
    // opt-out, not a GDPR consent mechanism — real-user privacy is handled
    // by `persistence: "memory"` in instrumentation-client.ts. Failing closed
    // would silently drop events the developer expects to see.
    console.warn(
      "[posthogOptOut] failed to read opt-out flag — defaulting to capture:",
      err
    );
    return false;
  }
}
