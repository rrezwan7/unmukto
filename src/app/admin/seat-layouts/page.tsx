import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SeatLayoutsPage() {
  await requireAdminPage();

  const { db } = await import("@/prisma/db");
  const layouts = await db.orm.public.SeatLayout.all();

  layouts.sort((a, b) => b.id - a.id);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Seat Layouts</h1>
        <p className="mt-1 text-muted-foreground">
          Browse reusable layouts and view their seat maps.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Layouts</CardTitle>
          <CardDescription>
            {layouts.length} seat layouts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No seat layouts have been created yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Description</TableHead>
                  <TableHead scope="col">Seat Map</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {layouts.map((layout) => (
                  <TableRow key={layout.id}>
                    <TableCell className="font-medium">
                      {layout.name}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      {layout.description ?? "Not provided"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/seat-layouts/${layout.id}`}
                        className="underline underline-offset-4"
                        aria-label={`View seat map for ${layout.name}`}
                      >
                        View seat map
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}