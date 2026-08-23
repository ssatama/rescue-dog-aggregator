import { NextApiRequest, NextApiResponse } from "next";

/**
 * Health check endpoint polled by an external uptime service.
 * Returns 200 OK when the application is fully ready.
 *
 * This is live production infrastructure with no in-repo caller, so it
 * looks unreferenced to dead-code analysis. Do not delete it.
 * Sentry filters it out in src/instrumentation-client.ts.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    ci: !!process.env.CI,
  });
}
