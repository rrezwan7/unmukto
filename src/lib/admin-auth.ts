import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedAdmin, isSameOrigin } from "./auth-policy";

export function isAuthConfigured() {
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      process.env.ADMIN_GITHUB_IDS?.trim()
  );
}

export async function requireAdminPage() {
  if (!isAuthConfigured()) redirect("/login");

  const session = await auth();

  // Recheck the allowlist so removing an ID revokes existing access.
  if (
    !isAllowedAdmin(
      session?.adminGithubId,
      process.env.ADMIN_GITHUB_IDS
    )
  ) {
    redirect("/login");
  }

  return session!;
}

export async function checkAdminApi(
  request?: Request
): Promise<Response | null> {
  const headers = { "Cache-Control": "no-store" };

  if (!isAuthConfigured()) {
    return Response.json(
      {
        success: false,
        error: "Admin sign-in is not configured.",
      },
      { status: 503, headers }
    );
  }

  const session = await auth();

  if (!session) {
    return Response.json(
      { success: false, error: "Sign in required." },
      { status: 401, headers }
    );
  }

  if (
    !isAllowedAdmin(
      session.adminGithubId,
      process.env.ADMIN_GITHUB_IDS
    )
  ) {
    return Response.json(
      { success: false, error: "Admin access required." },
      { status: 403, headers }
    );
  }

  // Handle the origin rewritten by the Codespaces development proxy.
  let codespacesSameOrigin = false;

  if (
    request &&
    process.env.CODESPACES === "true" &&
    process.env.NODE_ENV === "development" &&
    process.env.AUTH_URL
  ) {
    try {
      const expected = new URL(process.env.AUTH_URL);

      codespacesSameOrigin =
        expected.protocol === "https:" &&
        request.headers.get("origin") === "http://localhost:3000" &&
        request.headers.get("x-forwarded-host") === expected.host &&
        request.headers.get("sec-fetch-site") === "same-origin";
    } catch {
      codespacesSameOrigin = false;
    }
  }

  if (
    request &&
    !isSameOrigin(request, process.env.AUTH_URL) &&
    !codespacesSameOrigin
  ) {
    return Response.json(
      {
        success: false,
        error: "Request origin is not allowed.",
      },
      { status: 403, headers }
    );
  }

  return null;
}