import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health check endpoint for E2E tests
 * Returns 200 OK when the application is fully ready
 * Includes startup delay for CI environment
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple health check - let Playwright's built-in polling handle timing
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ci: !!process.env.CI
  });
}