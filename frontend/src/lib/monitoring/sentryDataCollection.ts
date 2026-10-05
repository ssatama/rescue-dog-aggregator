import type * as Sentry from "@sentry/nextjs";

type DataCollection = NonNullable<
  NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"]
>;

/**
 * What every Sentry init (client, server, edge) may collect about a visitor.
 *
 * Sentry v11 replaced `sendDefaultPii` with `dataCollection`, and left unset it
 * collects user info (including the IP address), cookies, request and response
 * bodies and stack-frame variables. This keeps v10's `sendDefaultPii: false`
 * (Sentry's own recipe for it), and is stricter in three places:
 * - request headers are an allow-list, so the IP and Vercel geo headers never
 *   leave (the visitor's country is read per request and never stored);
 *   `sec-ch-ua` keeps Chromium's client hints, which Sentry reads for the OS;
 * - no cookies or stack-frame variables;
 * - `search`, what the visitor typed into the catalog search, is dropped from
 *   the query params Sentry parses. It still appears in the page URL and in
 *   breadcrumbs, which this option does not cover.
 */
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: {
      allow: ["user-agent", "sec-ch-ua", "referer", "accept-language", "content-type"],
    },
    response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
  httpBodies: [],
  urlQueryParams: { deny: ["search"] },
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
