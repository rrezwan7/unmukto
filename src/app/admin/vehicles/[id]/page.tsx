import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { isDatabaseId } from "@/lib/tour-editor";
import VehicleForm from "../vehicle-form";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!isDatabaseId(id)) notFound();

  const { db } = await import("@/prisma/db");
  const vehicle = await db.orm.public.Vehicle.where({ id })
    .select("id", "name", "type", "registrationNumber", "description", "isActive", "updatedAt")
    .first();
  if (!vehicle) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <Link href="/admin/vehicles" className="text-sm text-muted-foreground hover:underline">
          ← Back to Vehicles
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{vehicle.name}</h1>
      </header>
      <VehicleForm key={vehicle.id} vehicle={vehicle} />
    </main>
  );
}
