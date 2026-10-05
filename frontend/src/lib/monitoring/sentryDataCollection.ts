import type * as Sentry from "@sentry/nextjs";

type DataCollection = NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"];

/**
 * What every Sentry init (client, server, edge) may collect about a visitor.
 *
 * Sentry v11 replaced `sendDefaultPii` with `dataCollection`, and left unset it
 * collects user info (including the IP address), cookies, request and response
 * bodies and stack-frame variables. This keeps v10's `sendDefaultPii: false`.
 * Request headers are an allow-list, so the IP and Vercel geo headers never
 * leave: the visitor's country is read per request and never stored.
 * `search` is what the visitor typed into the catalog search.
 */
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { allow: ["user-agent", "referer", "accept-language", "content-type"] },
    response: true,
  },
  httpBodies: [],
  urlQueryParams: { deny: ["search"] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
