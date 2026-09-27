import {
  dismissNudge,
  isNudgeDue,
  markNudgeShown,
  recordDogView,
  recordVisit,
  SESSION_GAP_MS,
} from "../installNudge";

const T0 = 1_800_000_000_000;

describe("installNudge", () => {
  beforeEach(() => localStorage.clear());

  it("is not due on a first visit", () => {
    recordVisit(T0);
    expect(isNudgeDue()).toBe(false);
  });

  it("is due on the third session", () => {
    recordVisit(T0);
    recordVisit(T0 + SESSION_GAP_MS + 1);
    expect(isNudgeDue()).toBe(false);
    recordVisit(T0 + 2 * (SESSION_GAP_MS + 1));
    expect(isNudgeDue()).toBe(true);
  });

  it("does not count a return within 30 minutes as a new session", () => {
    recordVisit(T0);
    recordVisit(T0 + 60_000);
    recordVisit(T0 + 120_000);
    expect(isNudgeDue()).toBe(false);
  });

  it("measures the session gap from the last dog viewed, not the first visit", () => {
    recordVisit(T0);
    recordDogView(1, T0 + SESSION_GAP_MS);
    recordVisit(T0 + SESSION_GAP_MS + 60_000);
    recordVisit(T0 + SESSION_GAP_MS + 120_000);
    expect(isNudgeDue()).toBe(false);
  });

  it("counts different dogs, not reloads of the same one", () => {
    recordVisit(T0);
    for (let i = 1; i <= 10; i++) recordDogView(42, T0 + i);
    recordDogView(7, T0 + 11);
    expect(isNudgeDue()).toBe(false);
  });

  it("is due after five dog pages in one session", () => {
    recordVisit(T0);
    for (let i = 1; i <= 4; i++) recordDogView(i, T0 + i);
    expect(isNudgeDue()).toBe(false);
    recordDogView(5, T0 + 5);
    expect(isNudgeDue()).toBe(true);
  });

  it("is never due again once dismissed", () => {
    for (let i = 1; i <= 5; i++) recordDogView(i, T0 + i);
    dismissNudge();
    for (let i = 6; i <= 10; i++) recordDogView(i, T0 + i);
    expect(isNudgeDue()).toBe(false);
  });

  it("counts a session that starts on a dog page", () => {
    recordDogView(1, T0);
    recordVisit(T0 + 1);
    recordVisit(T0 + SESSION_GAP_MS + 2);
    recordVisit(T0 + 2 * SESSION_GAP_MS + 3);
    expect(isNudgeDue()).toBe(true);
  });

  it("gives the card one session: ignored, it retires at the next", () => {
    recordVisit(T0);
    for (let i = 1; i <= 5; i++) recordDogView(i, T0 + i);
    expect(markNudgeShown()).toBe(true);
    expect(markNudgeShown()).toBe(false);
    // Still there on the next page of the same session
    recordVisit(T0 + 60_000);
    expect(isNudgeDue()).toBe(true);
    // Back after a break: gone
    recordVisit(T0 + 60_000 + SESSION_GAP_MS + 1);
    expect(isNudgeDue()).toBe(false);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("installNudge", "{not json");
    expect(isNudgeDue()).toBe(false);
    expect(() => recordVisit(T0)).not.toThrow();
  });

  it("works when storage throws", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(isNudgeDue()).toBe(false);
    expect(() => recordDogView(1, T0)).not.toThrow();
    spy.mockRestore();
  });
});
