import { NextRequest, NextResponse } from 'next/server';
import { signToken, verifyPassword } from '@/lib/auth';

// In-memory limiter: 5 failed attempts per IP per 15-minute window.
// State is per server instance, so it resets on cold starts and isn't shared
// across instances — acceptable brute-force friction for a two-user tool,
// not a hard guarantee.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  // Opportunistic pruning so the map can't grow unbounded.
  if (failures.size > 1000) {
    for (const [key, entry] of failures) {
      if (Date.now() > entry.resetAt) failures.delete(key);
    }
  }

  const entry = failures.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas tentativas. Tente novamente mais tarde.' },
      { status: 429 },
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  if (typeof password !== 'string' || !verifyPassword(password)) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Palavra-passe incorreta' }, { status: 401 });
  }

  failures.delete(ip);

  const token = signToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set('dashboard-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
