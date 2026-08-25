import {
  backoffDelayMs,
  fetchWithRetry,
  getRetryPolicy,
  type RetryPolicy,
} from "../serverFetch";

const nextConfig = require("../../../next.config.js");

// The real backoff always uses the production base delay; getRetryPolicy zeroes
// it under test so retry tests do not sleep.
const MAX_SEQUENTIAL_FETCHES_PER_PAGE = 4;

const totalWaitMs = (attempts: number): number =>
  Array.from({ length: attempts - 1 }, (_, i) =>
    backoffDelayMs({ attempts, baseDelayMs: 2000 }, i),
  ).reduce((sum, ms) => sum + ms, 0);

jest.mock("../logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
  reportError: jest.fn(),
}));

const okResponse = (): Response =>
  ({ ok: true, status: 200 }) as unknown as Response;

const errorResponse = (status: number): Response =>
  ({ ok: false, status }) as unknown as Response;

const policy = (attempts: number, baseDelayMs = 0): RetryPolicy => ({
  attempts,
  baseDelayMs,
});

describe("getRetryPolicy", () => {
  const originalPhase = process.env.NEXT_PHASE;

  afterEach(() => {
    if (originalPhase === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = originalPhase;
    }
  });

  it("gives prerendering a budget long enough to outlast a backend restart", () => {
    process.env.NEXT_PHASE = "phase-production-build";

    const { attempts } = getRetryPolicy();

    expect(attempts).toBeGreaterThanOrEqual(5);
    expect(totalWaitMs(attempts)).toBeGreaterThanOrEqual(30_000);
  });

  // Exceeding it means Next kills the page for running long, which is the very
  // failure the retry exists to prevent. The worst page is /breeds/mixed:
  // getBreedStats, then getAnimals x2 inside getBreedBySlug, then a fourth
  // getAnimals on the page itself — four sequential calls, all distinct URLs,
  // so nothing collapses them. Leave a quarter of the timeout for the network.
  it("keeps the prerender budget inside staticPageGenerationTimeout", () => {
    process.env.NEXT_PHASE = "phase-production-build";

    const { staticPageGenerationTimeout } = nextConfig;
    const { attempts } = getRetryPolicy();

    expect(staticPageGenerationTimeout).toBeDefined();
    expect(MAX_SEQUENTIAL_FETCHES_PER_PAGE * totalWaitMs(attempts)).toBeLessThanOrEqual(
      0.75 * staticPageGenerationTimeout * 1000,
    );
  });

  it("keeps the runtime budget short so a request never hangs on retries", () => {
    delete process.env.NEXT_PHASE;

    expect(getRetryPolicy().attempts).toBe(2);
  });

  it("stubs the wait under test so retry tests do not sleep", () => {
    expect(getRetryPolicy().baseDelayMs).toBe(0);
  });
});

describe("backoffDelayMs", () => {
  it("doubles the wait after each failed attempt", () => {
    const p = policy(6, 2000);

    expect([0, 1, 2, 3, 4].map((i) => backoffDelayMs(p, i))).toEqual([
      2000, 4000, 8000, 16000, 32000,
    ]);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("returns the first successful response without retrying", async () => {
    (fetch as jest.Mock).mockResolvedValue(okResponse());

    const response = await fetchWithRetry("https://api.test/x", {}, policy(6));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("recovers when the backend returns 502 before coming back up", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(errorResponse(502))
      .mockResolvedValueOnce(errorResponse(502))
      .mockResolvedValueOnce(okResponse());

    const response = await fetchWithRetry("https://api.test/x", {}, policy(6));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("returns the last 5xx response once attempts are exhausted", async () => {
    (fetch as jest.Mock).mockResolvedValue(errorResponse(503));

    const response = await fetchWithRetry("https://api.test/x", {}, policy(3));

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 4xx, which will fail again identically", async () => {
    (fetch as jest.Mock).mockResolvedValue(errorResponse(404));

    const response = await fetchWithRetry("https://api.test/x", {}, policy(6));

    expect(response.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a network-level failure and returns the eventual response", async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(okResponse());

    const response = await fetchWithRetry("https://api.test/x", {}, policy(6));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rethrows the network error once attempts are exhausted", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      fetchWithRetry("https://api.test/x", {}, policy(3)),
    ).rejects.toThrow("ECONNREFUSED");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("passes url and init through to fetch unchanged on the first attempt", async () => {
    (fetch as jest.Mock).mockResolvedValue(okResponse());
    const init = { next: { revalidate: 86400, tags: ["animals"] } };

    await fetchWithRetry("https://api.test/x", init, policy(6));

    expect(fetch).toHaveBeenCalledWith("https://api.test/x", init);
  });

  // Next memoizes fetch per URL for a render and memoizes failures too, so a
  // retry with a byte-identical init is served the cached 5xx and never
  // reaches the network. A signal is that layer's opt-out. Without this the
  // whole retry is a no-op that only burns the backoff.
  it("carries a signal on retries so they escape Next's render dedupe", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(errorResponse(502))
      .mockResolvedValueOnce(okResponse());
    const init = { next: { revalidate: 86400, tags: ["animals"] } };

    await fetchWithRetry("https://api.test/x", init, policy(6));

    const [, firstInit] = (fetch as jest.Mock).mock.calls[0];
    const [, retryInit] = (fetch as jest.Mock).mock.calls[1];

    expect(firstInit.signal).toBeUndefined();
    expect(retryInit.signal).toBeInstanceOf(AbortSignal);
    expect(retryInit.signal.aborted).toBe(false);
    expect(retryInit.next).toEqual(init.next);
  });
});
