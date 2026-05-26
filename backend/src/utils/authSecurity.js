const crypto = require('crypto');

const DEFAULT_DEV_SECRET = 'dev-secret-change-me';
const DEFAULT_EXPIRES_IN = '8h';
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET debe estar configurado en produccion');
  }

  return DEFAULT_DEV_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

function getCookieMaxAgeSeconds() {
  const configured = Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_COOKIE_MAX_AGE_SECONDS;
}

function buildAuthCookie(token) {
  const parts = [
    `auth_token=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${getCookieMaxAgeSeconds()}`
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildClearAuthCookie() {
  const parts = [
    'auth_token=',
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0'
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return cookies;

      const key = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getRequestToken(req) {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (bearerToken) return bearerToken;

  const cookies = parseCookies(req.headers.cookie);
  return cookies.auth_token || null;
}

function createTokenId() {
  return crypto.randomUUID();
}

module.exports = {
  buildAuthCookie,
  buildClearAuthCookie,
  createTokenId,
  getJwtExpiresIn,
  getJwtSecret,
  getRequestToken
};
