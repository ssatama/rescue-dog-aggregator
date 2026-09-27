import { safeStorage } from "@/utils/safeStorage";

// When to suggest installing the site as an app. The card waits until someone
// is clearly coming back or browsing a lot, and once dismissed it never
// returns. The counts stay in localStorage and are never sent anywhere.

export const SESSIONS_TO_NUDGE = 3;
export const DOG_VIEWS_TO_NUDGE = 5;
/** Away this long, and the next visit counts as a new session. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const KEY = "installNudge";

interface NudgeState {
  sessions: number;
  dogViews: number;
  lastSeen: number;
  dismissed: boolean;
}

const EMPTY: NudgeState = { sessions: 0, dogViews: 0, lastSeen: 0, dismissed: false };

function read(): NudgeState {
  return { ...EMPTY, ...safeStorage.parse<Partial<NudgeState> | null>(KEY, EMPTY) };
}

// Blocked storage: the counts never grow, so the card never shows
function write(state: NudgeState): void {
  safeStorage.stringify(KEY, state);
}

/** Call on load and whenever the tab becomes visible again. */
export function recordVisit(now = Date.now()): void {
  const state = read();
  const newSession = now - state.lastSeen > SESSION_GAP_MS;
  write({ ...state, sessions: state.sessions + (newSession ? 1 : 0), lastSeen: now });
}

/** Call when the tab is hidden, so time spent browsing is not a gap. */
export function recordSeen(now = Date.now()): void {
  write({ ...read(), lastSeen: now });
}

export function recordDogView(now = Date.now()): void {
  const state = read();
  write({ ...state, dogViews: state.dogViews + 1, lastSeen: now });
}

export function dismissNudge(): void {
  write({ ...read(), dismissed: true });
}

export function isNudgeDue(): boolean {
  const { sessions, dogViews, dismissed } = read();
  return !dismissed && (sessions >= SESSIONS_TO_NUDGE || dogViews >= DOG_VIEWS_TO_NUDGE);
}
