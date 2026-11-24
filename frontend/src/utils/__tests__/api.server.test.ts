/**
 * @jest-environment node
 */
import { get } from "../api";

// Organization pages prerender through get(). One connection reset aborted
// a production build because fetchApi called fetch with no retry, unlike
// the dog and breed pages' fetchWithRetry.
describe("get() on the server", () => {
  const realFetch = global.fetch;
  const realPhase = process.env.NEXT_PHASE;

  afterEach(() => {
    global.fetch = realFetch;
    process.env.NEXT_PHASE = realPhase;
  });

  it("retries a network error while prerendering", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    const reset = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(reset)
      .mockResolvedValueOnce(new Response(JSON.stringify({ slug: "tsv" }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(get("/api/organizations/tsv")).resolves.toEqual({ slug: "tsv" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
