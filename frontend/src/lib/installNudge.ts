import { useSyncExternalStore } from "react";
import { safeStorage } from "@/utils/safeStorage";
import { canEverInstall } from "@/lib/installApp";

// When to suggest installing the site as an app. The card waits until someone
// is clearly coming back or browsing a lot, then gets one session: dismissed
// or ignored, it never returns. The counts stay on the device and are never
// sent anywhere, and are kept only where the card could ever show: a touch
// screen, in a browser that can install the site, not already installed.

export const SESSIONS_TO_NUDGE = 3;
/** Different dogs: a reload or a return to the same dog doesn't count. */
export const DOGS_TO_NUDGE = 5;
/** Away this long, and the next visit counts as a new session. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const KEY = "installNudge";
const CHANGE = "installnudgechange";

interface NudgeState {
  sessions: number;
  /** The first few distinct dogs viewed, up to DOGS_TO_NUDGE. */
  dogIds: string[];
  lastSeen: number;
  dismissed: boolean;
  /** The session the card was first seen in; null until then. */
  shownInSession: number | null;
}

const EMPTY: NudgeState = {
  sessions: 0,
  dogIds: [],
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

/** Where the card could ever show: a touch screen, in a browser that can
 * install the site, not running as the installed app. Nothing is counted
 * anywhere else. (A Chrome tab can't tell it was installed before.) */
export function canNudge(): boolean {
  return onTouchScreen() && canEverInstall();
}

function onTouchScreen(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Dismissed, or shown in an earlier session: the card is done for good. */
function retired({ dismissed, shownInSession, sessions }: NudgeState): boolean {
  return dismissed || (shownInSession !== null && shownInSession !== sessions);
}

/** Counting stops where the card can't show, and once it is retired. */
function update(change: (state: NudgeState) => NudgeState): void {
  if (!canNudge()) return;
  const state = read();
  if (!retired(state)) write(change(state));
}

/** Activity now: a new session if the last activity was a while ago. */
function touch(state: NudgeState, now: number): NudgeState {
  const newSession = now - state.lastSeen > SESSION_GAP_MS;
  return { ...state, sessions: state.sessions + (newSession ? 1 : 0), lastSeen: now };
}

/** Call on load, on each page change and whenever the tab becomes visible. */
export function recordVisit(now = Date.now()): void {
  update((state) => touch(state, now));
}

/** Call when the tab is hidden, so time spent browsing is not a gap. */
export function recordSeen(now = Date.now()): void {
  update((state) => ({ ...state, lastSeen: now }));
}

// A dog page records its view before the card records the visit, so a first
// page that is a dog page must start the session itself
export function recordDogView(dogId: number | string, now = Date.now()): void {
  update((previous) => {
    const state = touch(previous, now);
    const id = String(dogId);
    const full = state.dogIds.includes(id) || state.dogIds.length >= DOGS_TO_NUDGE;
    return full ? state : { ...state, dogIds: [...state.dogIds, id] };
  });
}

/** Retires the card: its close button, or any install flow from any surface.
 * Not gated on canNudge(): right after an install the site counts as
 * installed, and the retirement must still be saved. Desktop stores nothing. */
export function dismissNudge(): void {
  if (onTouchScreen()) write({ ...read(), dismissed: true });
}

/** Records that the card was seen. True only the first time, ever. */
export function markNudgeShown(): boolean {
  const state = read();
  if (state.shownInSession !== null) return false;
  write({ ...state, shownInSession: state.sessions });
  return true;
}

// `storage` brings a dismissal in another tab to this one
function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Re-renders as soon as a visit or a dog view makes the card due. */
export function useNudgeDue(): boolean {
  return useSyncExternalStore(subscribe, isNudgeDue, () => false);
}

export function isNudgeDue(): boolean {
  const state = read();
  if (retired(state)) return false;
  return state.sessions >= SESSIONS_TO_NUDGE || state.dogIds.length >= DOGS_TO_NUDGE;
}
