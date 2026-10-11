import Link from "next/link";
import { signOut } from "@/auth";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <>
    <header className="border-b">
      <nav aria-label="Admin navigation" className="mx-auto flex max-w-5xl flex-wrap items-center gap-5 p-4">
        <span className="font-semibold">Unmukto admin</span>
        <Link href="/admin/tours">Tours</Link>
        <Link href="/admin/departures">Departures</Link>
        <form className="ml-auto" action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button type="submit" className="underline">Sign out</button>
        </form>
      </nav>
    </header>
    {children}
  </>;
}
