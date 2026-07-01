import { NextRequest } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthToken,
  getAuthSecret,
  isAuthEnabled,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return apiSuccess({ ok: true });
  }

  const secret = getAuthSecret();
  const appPassword = process.env.APP_PASSWORD?.trim();

  if (!secret || !appPassword) {
    return apiError("App auth is not configured", 500);
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password.trim() : "";
  } catch {
    return apiError("Invalid request");
  }

  if (password !== appPassword) {
    return apiError("Incorrect password", 401);
  }

  const token = await createAuthToken(secret);
  const response = apiSuccess({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
