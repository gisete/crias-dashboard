import { createHmac } from 'crypto';

const TOKEN_VERSION = 'v1';
const EXPIRY_DAYS = 7;

function secret(): string {
  const s = process.env.DASHBOARD_PASSWORD;
  if (!s) throw new Error('DASHBOARD_PASSWORD is not set');
  return s;
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
  if (hmac !== expected) return false;
  if (Date.now() > parseInt(expiry, 10)) return false;
  return true;
}
