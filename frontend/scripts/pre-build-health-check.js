#!/usr/bin/env node

/**
 * Pre-build health check
 * Ensures API is reachable before building
 * Prevents deploying broken builds when API is down/blocked
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.rescuedogs.me';
const TIMEOUT_MS = 10000;

async function checkApiHealth() {
  console.log('🔍 Pre-build health check starting...');
  console.log(`📡 Checking API: ${API_URL}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Vercel-Build-Health-Check/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ API health check failed: ${response.status} ${response.statusText}`);
      console.error(`   URL: ${API_URL}/health`);
      console.error(`   This usually means:`);
      console.error(`   - API is down or unreachable`);
      console.error(`   - Cloudflare is blocking requests (Bot Fight Mode)`);
      console.error(`   - CORS or firewall blocking build servers`);
      console.error(`\n💡 Fix before deploying to prevent broken production build!`);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ API health check passed');
    console.log(`   Status: ${data.status}`);
    console.log(`   Database: ${data.database?.status || 'unknown'}`);
    console.log('🚀 Proceeding with build...\n');
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error(`❌ API health check timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`❌ API health check failed: ${error.message}`);
    }

    console.error(`   URL: ${API_URL}/health`);
    console.error(`   Error: ${error.name}`);
    console.error(`\n💡 Possible causes:`);
    console.error(`   - API_URL environment variable incorrect`);
    console.error(`   - API server is down`);
    console.error(`   - Network connectivity issues`);
    console.error(`   - Cloudflare blocking Vercel build servers`);
    console.error(`\n⚠️  Build aborted to prevent deploying broken site`);
    process.exit(1);
  }
}

checkApiHealth();
