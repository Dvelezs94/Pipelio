/**
 * Simple in-memory rate limiter for server-side use.
 * For production at scale, use Redis or similar.
 */

const store = new Map<string, { count: number; resetAt: number }>();

/** Clean old entries periodically */
const CLEAN_INTERVAL_MS = 60_000;
let cleanTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanTimer() {
  if (cleanTimer) return;
  cleanTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, v] of Array.from(store.entries())) {
      if (v.resetAt < now) store.delete(key);
    }
  }, CLEAN_INTERVAL_MS);
}

/**
 * Check if identifier (e.g. IP) is over limit. Window = 1 minute.
 * Returns true if allowed, false if rate limited.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60_000
): boolean {
  ensureCleanTimer();
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.resetAt < now) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
