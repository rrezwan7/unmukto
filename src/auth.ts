import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { isAllowedAdmin } from "@/lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ account }) {
      return account?.provider === "github" &&
        isAllowedAdmin(account.providerAccountId, process.env.ADMIN_GITHUB_IDS);
    },
    jwt({ token, account }) {
      // Never accept role or identity from a client session-update payload.
      if (account) {
        token.adminGithubId = account.provider === "github"
          ? account.providerAccountId
          : undefined;
      }
      return token;
    },
    session({ session, token }) {
      session.adminGithubId = typeof token.adminGithubId === "string"
        ? token.adminGithubId : undefined;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    adminGithubId?: string;
  }
}
