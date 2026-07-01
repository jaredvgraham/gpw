import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  AUTH_COOKIE_NAME,
  getAuthSecret,
  isAuthEnabled,
  verifyAuthToken,
} from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (isAuthEnabled()) {
    const secret = getAuthSecret();
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    const authenticated =
      secret && token ? await verifyAuthToken(token, secret) : false;

    if (!authenticated) {
      redirect("/login");
    }
  }

  return <AppShell>{children}</AppShell>;
}
