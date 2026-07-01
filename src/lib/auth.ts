import { createHash, createHmac, timingSafeEqual } from 'crypto';

const TOKEN_VERSION = 'v1';
const EXPIRY_DAYS = 7;

function secret(): string {
  const s = process.env.DASHBOARD_PASSWORD;
  if (!s) throw new Error('DASHBOARD_PASSWORD is not set');
  return s;
}

/**
 * Constant-time string comparison. Hashing both sides first means
 * timingSafeEqual always gets equal-length buffers, so neither content
 * nor length differences leak through timing.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPassword(password: string): boolean {
  return safeEqual(password, secret());
}

export function signToken(): string {
  const expiry = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${TOKEN_VERSION}:${expiry}`;
  const hmac = createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [version, expiry, hmac] = parts;
  const payload = `${version}:${expiry}`;
  const expected = createHmac('sha256', secret()).update(payload).digest('hex');
  if (!safeEqual(hmac, expected)) return false;
  if (Date.now() > parseInt(expiry, 10)) return false;
  return true;
}
