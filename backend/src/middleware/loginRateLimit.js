const attempts = new Map();

const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 8);

function getClientKey(req) {
  const forwardedFor = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  const email = String(req.body?.email || '').trim().toLowerCase();

  return `${ip}:${email || 'no-email'}`;
}

function pruneExpired(now) {
  for (const [key, value] of attempts.entries()) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}

function loginRateLimit(req, res, next) {
  const now = Date.now();
  pruneExpired(now);

  const key = getClientKey(req);
  const current = attempts.get(key);

  if (current && current.count >= MAX_ATTEMPTS && current.resetAt > now) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'Demasiados intentos fallidos. Intenta nuevamente en unos minutos.'
    });
  }

  req.loginRateLimit = {
    fail() {
      const nextValue = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
      nextValue.count += 1;
      nextValue.resetAt = nextValue.resetAt > now ? nextValue.resetAt : now + WINDOW_MS;
      attempts.set(key, nextValue);
    },
    reset() {
      attempts.delete(key);
    }
  };

  next();
}

module.exports = loginRateLimit;
