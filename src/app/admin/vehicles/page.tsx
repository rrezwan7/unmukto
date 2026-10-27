import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import VehicleForm from "./vehicle-form";
import SeatLayoutSelector from "./seat-layout-selector";

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

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">All Vehicles</h2>

        {vehicles.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No vehicles yet. Add your first vehicle above.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Type</th>
                  <th scope="col" className="p-3">Registration</th>
                  <th scope="col" className="p-3">Status</th>
                  <th scope="col" className="p-3">Seat Layout</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b align-top">
                    <td className="p-3 font-medium">{vehicle.name}</td>
                    <td className="p-3">{vehicle.type}</td>
                    <td className="p-3">
                      {vehicle.registrationNumber ?? "Not provided"}
                    </td>
                    <td className="p-3">
                      {vehicle.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="p-3">
                      <SeatLayoutSelector
                        key={`${vehicle.id}-${vehicle.seatLayoutId}`}
                        vehicleId={vehicle.id}
                        currentLayoutId={vehicle.seatLayoutId}
                        layouts={layoutChoices}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}