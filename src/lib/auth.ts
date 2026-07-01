export const AUTH_COOKIE_NAME = "gpw-auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}

export function getAuthSecret(): string | null {
  const secret = process.env.APP_AUTH_SECRET?.trim() || process.env.APP_PASSWORD?.trim();
  return secret || null;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAuthToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE;
  const payload = String(exp);
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthToken(token: string, secret: string): Promise<boolean> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  try {
    const key = await importHmacKey(secret);
    const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expectedSignature = toBase64Url(new Uint8Array(expected));
    return timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

export async function isRequestAuthenticated(token: string | undefined): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const secret = getAuthSecret();
  if (!secret || !token) return false;
  return verifyAuthToken(token, secret);
}
