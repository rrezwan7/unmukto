import "server-only";
import NextAuth, { type Account, type Profile } from "next-auth";
import Google from "next-auth/providers/google";

const siteProtocol = (() => {
  try {
    return new URL(process.env.AUTH_URL ?? "").protocol;
  } catch {
    return null;
  }
})();

export function isCustomerAuthConfigured() {
  return (siteProtocol === "http:" || siteProtocol === "https:") &&
    Boolean(process.env.AUTH_CUSTOMER_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

const secure = siteProtocol === "https:";
const prefix = secure ? "__Secure-" : "";
const cookie = (name: string, hostOnly = false) => ({
  name: `${secure && hostOnly ? "__Host-" : prefix}unmukto.customer.${name}`,
});

function verifiedGoogleIdentity(account: Account | null | undefined, profile?: Profile) {
  const subject = profile?.sub;
  const email = profile?.email?.trim().toLowerCase();
  if (
    account?.provider !== "google" || !subject || subject !== account.providerAccountId ||
    profile?.email_verified !== true || !email || email.length > 254
  ) {
    return null;
  }
  return { subject, email, name: profile.name?.trim().slice(0, 100) || null };
}

export const customerAuth = NextAuth({
  basePath: "/api/customer-auth",
  secret: process.env.AUTH_CUSTOMER_SECRET ?? [],
  providers: [Google({ checks: ["pkce", "state"] })],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/account/sign-in", error: "/account/sign-in" },
  useSecureCookies: secure,
  cookies: {
    sessionToken: cookie("session"),
    csrfToken: cookie("csrf", true),
    callbackUrl: cookie("callback"),
    pkceCodeVerifier: cookie("pkce"),
    state: cookie("state"),
    nonce: cookie("nonce"),
  },
  callbacks: {
    signIn({ account, profile }) {
      return verifiedGoogleIdentity(account, profile) !== null;
    },
    async jwt({ token, account, profile }) {
      if (!account) return token;
      const identity = verifiedGoogleIdentity(account, profile);
      if (!identity) return null;
      const { subject, email, name } = identity;
      const { db } = await import("@/prisma/db");
      const customer = await db.orm.public.CustomerAccount.upsert({
        conflictOn: { googleSubject: subject },
        create: { googleSubject: subject, email, name },
        update: { email, name },
      });
      token.customerAccountId = customer.id;
      return token;
    },
    session({ session, token }) {
      session.customerAccountId = typeof token.customerAccountId === "number" ? token.customerAccountId : undefined;
      return session;
    },
  },
});

export async function getCustomerSession() {
  if (!isCustomerAuthConfigured()) return null;
  const session = await customerAuth.auth();
  const id = session?.customerAccountId;
  return session && typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 2_147_483_647
    ? { ...session, customerAccountId: id }
    : null;
}

declare module "next-auth" {
  interface Session {
    customerAccountId?: number;
  }
}
