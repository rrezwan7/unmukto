import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import VehicleForm from "./vehicle-form";
import SeatLayoutSelector from "./seat-layout-selector";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const vehicleTypeLabels = {
  BUS: "Bus",
  COACH: "Coach",
  MICROBUS: "Microbus",
  MINIBUS: "Minibus",
  OTHER: "Other",
};

export default async function VehiclesPage() {
  await requireAdminPage();

  const { db } = await import("@/prisma/db");

  const [vehicles, layouts] = await Promise.all([
    db.orm.public.Vehicle.all(),
    db.orm.public.SeatLayout.all(),
  ]);

  vehicles.sort((a, b) => b.id - a.id);
  layouts.sort((a, b) => a.name.localeCompare(b.name));

  const layoutChoices = layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <Link
          href="/admin/departures"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Departures
        </Link>

        <h1 className="mt-3 text-2xl font-bold">Vehicles</h1>
        <p className="mt-1 text-muted-foreground">
          Manage vehicles and assign their seat layouts.
        </p>
      </header>

      <VehicleForm />

      <Card>
        <CardHeader>
          <CardTitle>All Vehicles</CardTitle>
          <CardDescription>
            {vehicles.length} vehicles registered.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No vehicles yet. Add your first vehicle above.
            </p>
          ) : (
            <Table>
              <TableCaption>
                Vehicles already allocated to departures cannot switch layouts.
              </TableCaption>

              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col">Registration</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Seat Layout</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.name}
                    </TableCell>

                    <TableCell>
                      {vehicleTypeLabels[vehicle.type]}
                    </TableCell>

                    <TableCell>
                      {vehicle.registrationNumber ?? "Not provided"}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          vehicle.isActive
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {vehicle.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-normal">
                      <SeatLayoutSelector
                        key={`${vehicle.id}-${vehicle.seatLayoutId}`}
                        vehicleId={vehicle.id}
                        currentLayoutId={vehicle.seatLayoutId}
                        layouts={layoutChoices}
                      />
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