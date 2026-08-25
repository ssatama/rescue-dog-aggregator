// logger.warn only emits in development, and this fires during production
// builds — the one place the retry needs to be visible in the log.
const warn = (message: string, ...rest: unknown[]): void => {
  console.warn(message, ...rest);
};

export interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
}

const BASE_DELAY_MS = 2000;

// Prerendering fans out over every dog, breed and organization page in one
// pass. A backend redeploy mid-build takes the API away, and a single 5xx
// anywhere in that pass aborts the whole build, so the prerender budget has to
// outlast a container swap rather than a blip.
//
// The ceiling is `staticPageGenerationTimeout` in next.config.js: a page can
// make several of these calls in sequence, and if their combined waiting
// exceeds that timeout Next kills the page instead, which is the failure this
// retry exists to prevent. Five attempts wait 2+4+8+16 = 30s, so two sequential
// calls still fit inside the configured 120s.
const PRERENDER_ATTEMPTS = 5;

// At request time somebody is waiting on the response, so one quick retry is
// the most that is worth spending before failing and letting ISR try again.
const RUNTIME_ATTEMPTS = 2;

const isPrerendering = (): boolean =>
  process.env.NEXT_PHASE === "phase-production-build";

export function getRetryPolicy(): RetryPolicy {
  return {
    attempts: isPrerendering() ? PRERENDER_ATTEMPTS : RUNTIME_ATTEMPTS,
    baseDelayMs: process.env.NODE_ENV === "test" ? 0 : BASE_DELAY_MS,
  };
}

export function backoffDelayMs(policy: RetryPolicy, attempt: number): number {
  return policy.baseDelayMs * 2 ** attempt;
}

const isRetryableStatus = (status: number): boolean => status >= 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Next memoizes fetch per URL for the duration of a render, and it memoizes
// failures too: dedupe-fetch.js stores the response whatever its status and
// replays a clone for every identical GET. A plain retry is therefore handed
// back the same 5xx without touching the network, which makes the retry a
// no-op that only burns the backoff. Passing a signal is that layer's own
// opt-out ("someone else controls the lifetime of this object"), so retries
// carry one and reach the origin. Only retries do — attempt 0 keeps the plain
// init so the normal dedupe and data-cache behaviour is untouched.
const bypassRenderDedupe = (init?: RequestInit): RequestInit => ({
  ...init,
  signal: new AbortController().signal,
});

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  policy: RetryPolicy = getRetryPolicy(),
): Promise<Response> {
  for (let attempt = 0; attempt < policy.attempts; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelayMs(policy, attempt - 1));
    }

    const isLastAttempt = attempt === policy.attempts - 1;

    try {
      const response = await fetch(
        url,
        attempt === 0 ? init : bypassRenderDedupe(init),
      );

      if (!isRetryableStatus(response.status) || isLastAttempt) {
        return response;
      }

      warn(
        `Retrying ${url} after HTTP ${response.status} (attempt ${attempt + 1}/${policy.attempts})`,
      );
    } catch (error) {
      if (isLastAttempt) {
        throw error;
      }

      warn(
        `Retrying ${url} after network error (attempt ${attempt + 1}/${policy.attempts}):`,
        error,
      );
    }
  }

  throw new Error(`fetchWithRetry needs at least one attempt, got ${policy.attempts}`);
}
