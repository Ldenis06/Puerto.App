// This file runs in the Supabase Deno runtime. The small declaration lets the
// React project's TypeScript check it without adding Deno types to the app.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const ALLOWED_PROFILES = new Set(['maxi', 'drizza', 'castro', 'alan', 'alca']);
const ALLOWED_ORIGINS = new Set([
  'https://ldenis06.github.io',
  'http://localhost:3000',
]);

type Attempt = { count: number; resetAt: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ldenis06.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function reject(origin: string | null, status: number, message: string) {
  return new Response(JSON.stringify({ authenticated: false, error: message }), {
    status,
    headers: corsHeaders(origin),
  });
}

function parseCredentials(): Record<string, string> | null {
  const raw = Deno.env.get('PROFILE_PASSWORDS_JSON');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter(([profile, password]) => ALLOWED_PROFILES.has(profile) && typeof password === 'string' && password.length >= 8),
    );
  } catch {
    return null;
  }
}

function recordFailure(key: string): boolean {
  const now = Date.now();
  const previous = attempts.get(key);
  const attempt = !previous || previous.resetAt <= now
    ? { count: 1, resetAt: now + 5 * 60_000, blockedUntil: 0 }
    : { ...previous, count: previous.count + 1 };
  if (attempt.count >= 5) attempt.blockedUntil = now + 5 * 60_000;
  attempts.set(key, attempt);
  return attempt.blockedUntil > now;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
  if (request.method !== 'POST') return reject(origin, 405, 'Método no permitido.');

  const remoteKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const currentAttempt = attempts.get(remoteKey);
  if (currentAttempt && currentAttempt.blockedUntil > Date.now()) {
    return reject(origin, 429, 'Demasiados intentos. Esperá unos minutos.');
  }

  let input: { userId?: unknown; password?: unknown };
  try {
    input = await request.json();
  } catch {
    return reject(origin, 400, 'Solicitud inválida.');
  }

  const userId = typeof input.userId === 'string' ? input.userId.toLowerCase().trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!ALLOWED_PROFILES.has(userId) || password.length === 0 || password.length > 128) {
    return reject(origin, 401, 'Credenciales inválidas.');
  }

  const credentials = parseCredentials();
  const expected = credentials?.[userId];
  if (!expected || password !== expected) {
    const isBlocked = recordFailure(remoteKey);
    return reject(origin, isBlocked ? 429 : 401, isBlocked ? 'Demasiados intentos. Esperá unos minutos.' : 'Credenciales inválidas.');
  }

  attempts.delete(remoteKey);
  return new Response(JSON.stringify({ authenticated: true }), { status: 200, headers: corsHeaders(origin) });
});
