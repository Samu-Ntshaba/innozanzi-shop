type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

export function consumeAuthAttempt(key: string, limit = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clearAuthAttempts(key: string) {
  attempts.delete(key);
}
