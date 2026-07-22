type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function consumeAuthAttempt(key: string, limit = 5, windowMs = 15 * 60_000) {
  return consumeRateLimit(key, limit, windowMs).allowed;
}

export function clearAuthAttempts(key: string) {
  attempts.delete(key);
}
