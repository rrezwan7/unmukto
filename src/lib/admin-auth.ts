import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedAdmin, isSameOrigin } from "./auth-policy";

export function isAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID &&
    process.env.AUTH_GITHUB_SECRET && process.env.ADMIN_GITHUB_IDS?.trim());
}

export async function requireAdminPage() {
  if (!isAuthConfigured()) redirect("/login");
  const session = await auth();
  // Recheck the allowlist on every request: removing an ID revokes existing sessions.
  if (!isAllowedAdmin(session?.adminGithubId, process.env.ADMIN_GITHUB_IDS)) {
    redirect("/login");
  }
  return session!;
}

export async function checkAdminApi(request?: Request): Promise<Response | null> {
  const headers = { "Cache-Control": "no-store" };
  if (!isAuthConfigured()) {
    return Response.json({ success: false, error: "Admin sign-in is not configured." },
      { status: 503, headers });
  }
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Sign in required." },
      { status: 401, headers });
  }
  if (!isAllowedAdmin(session.adminGithubId, process.env.ADMIN_GITHUB_IDS)) {
    return Response.json({ success: false, error: "Admin access required." },
      { status: 403, headers });
  }
  if (request && !isSameOrigin(request, process.env.AUTH_URL)) {
    return Response.json({ success: false, error: "Request origin is not allowed." },
      { status: 403, headers });
  }
  return null;
}
