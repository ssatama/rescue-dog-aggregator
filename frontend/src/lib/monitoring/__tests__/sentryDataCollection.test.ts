/**
 * Every Sentry init must pass the restrictive dataCollection.
 *
 * Sentry v11 dropped `sendDefaultPii`, and an init without `dataCollection`
 * collects user info, IP, cookies and bodies by default. Nothing would fail if
 * an init lost the option, so this loads each one in production and checks.
 */
import { SENTRY_DATA_COLLECTION } from "../sentryDataCollection";

const init = jest.fn();

jest.mock("@sentry/nextjs", () =>
  new Proxy(
    { init: (...args: unknown[]) => init(...args) },
    {
      // Integrations, setTag, captureRouterTransitionStart, ...: no-ops here
      get: (target, prop) =>
        prop in target ? target[prop as keyof typeof target] : jest.fn(),
    },
  ),
);
jest.mock("posthog-js", () => ({ __esModule: true, default: {} }));
jest.mock("@/lib/analytics", () => ({
  registerDisplayMode: jest.fn(),
  trackAppInstalls: jest.fn(),
}));
jest.mock("@/lib/chunkLoadError", () => ({
  isChunkLoadError: jest.fn(),
  setupChunkErrorHandler: jest.fn(),
}));

const ENV_KEYS = ["VERCEL_ENV", "NEXT_PUBLIC_VERCEL_ENV"] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  init.mockClear();
  delete window.__sentryInitialized;
  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("Sentry data collection", () => {
  it.each([
    ["server", "../../../../sentry.server.config"],
    ["edge", "../../../../sentry.edge.config"],
    ["client", "../../../instrumentation-client"],
  ])("the %s init passes the restrictive dataCollection", (_runtime, path) => {
    jest.isolateModules(() => {
      require(path);
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][0].dataCollection).toEqual(SENTRY_DATA_COLLECTION);
  });

  it("keeps v10's sendDefaultPii: false", () => {
    expect(SENTRY_DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      stackFrameVariables: false,
    });
  });

  it("never sends the IP or geo headers, or the search query", () => {
    const allowed = (
      SENTRY_DATA_COLLECTION?.httpHeaders as { request: { allow: string[] } }
    ).request.allow;
    for (const header of ["x-forwarded-for", "x-real-ip", "x-vercel-ip-country", "cookie"]) {
      expect(allowed).not.toContain(header);
    }
    expect(SENTRY_DATA_COLLECTION?.urlQueryParams).toEqual({ deny: ["search"] });
  });
});
