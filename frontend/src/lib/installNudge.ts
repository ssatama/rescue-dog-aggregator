import { useSyncExternalStore } from "react";
import { safeStorage } from "@/utils/safeStorage";

// When to suggest installing the site as an app. The card waits until someone
// is clearly coming back or browsing a lot, then gets one session: dismissed
// or ignored, it never returns. The counts stay on the device and are never
// sent anywhere.

export const SESSIONS_TO_NUDGE = 3;
export const DOG_VIEWS_TO_NUDGE = 5;
/** Away this long, and the next visit counts as a new session. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const KEY = "installNudge";
const CHANGE = "installnudgechange";

interface NudgeState {
  sessions: number;
  dogViews: number;
  lastSeen: number;
  dismissed: boolean;
  /** The session the card was first seen in; null until then. */
  shownInSession: number | null;
}

const EMPTY: NudgeState = {
  sessions: 0,
  dogViews: 0,
  lastSeen: 0,
  dismissed: false,
  shownInSession: null,
};

function read(): NudgeState {
  return { ...EMPTY, ...safeStorage.parse<Partial<NudgeState> | null>(KEY, EMPTY) };
}

// Falls back to sessionStorage, so with localStorage blocked the counts and a
// dismissal last only as long as the tab
function write(state: NudgeState): void {
  safeStorage.stringify(KEY, state);
  window.dispatchEvent(new Event(CHANGE));
}

/** Activity now: a new session if the last activity was a while ago. */
function touch(state: NudgeState, now: number): NudgeState {
  const newSession = now - state.lastSeen > SESSION_GAP_MS;
  return { ...state, sessions: state.sessions + (newSession ? 1 : 0), lastSeen: now };
}

/** Call on load and whenever the tab becomes visible again. */
export function recordVisit(now = Date.now()): void {
  write(touch(read(), now));
}

/** Call when the tab is hidden, so time spent browsing is not a gap. */
export function recordSeen(now = Date.now()): void {
  write({ ...read(), lastSeen: now });
}

// A dog page records its view before the card records the visit, so a first
// page that is a dog page must start the session itself
export function recordDogView(now = Date.now()): void {
  const state = touch(read(), now);
  write({ ...state, dogViews: state.dogViews + 1 });
}

export function dismissNudge(): void {
  write({ ...read(), dismissed: true });
}

/** Records that the card was seen. True only the first time, ever. */
export function markNudgeShown(): boolean {
  const state = read();
  if (state.shownInSession !== null) return false;
  write({ ...state, shownInSession: state.sessions });
  return true;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}

/** Re-renders as soon as a visit or a dog view makes the card due. */
export function useNudgeDue(): boolean {
  return useSyncExternalStore(subscribe, isNudgeDue, () => false);
}

export function isNudgeDue(): boolean {
  const { sessions, dogViews, dismissed, shownInSession } = read();
  if (dismissed || (shownInSession !== null && shownInSession !== sessions)) return false;
  return sessions >= SESSIONS_TO_NUDGE || dogViews >= DOG_VIEWS_TO_NUDGE;
}
