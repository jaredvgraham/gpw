import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthSecret,
  isAuthEnabled,
  verifyAuthToken,
} from "@/lib/auth";

export async function requireApiAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!isAuthEnabled()) {
    return null;
  }

  const secret = getAuthSecret();
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated =
    secret && token ? await verifyAuthToken(token, secret) : false;

  if (authenticated) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
