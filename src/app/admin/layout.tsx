import Link from "next/link";
import { signOut } from "@/auth";
import { requireAdminPage } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/admin/tours", label: "Tours" },
  { href: "/admin/departures", label: "Departures" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/seat-layouts", label: "Seat Layouts" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <Link
            href="/admin/tours"
            className="font-semibold tracking-tight"
          >
            Unmukto admin
          </Link>

          <nav
            aria-label="Admin navigation"
            className="flex flex-wrap items-center gap-1"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            className="ml-auto"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {children}
    </>
  );
}