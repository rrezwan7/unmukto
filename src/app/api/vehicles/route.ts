import { checkAdminApi } from "@/lib/admin-auth";
import { lockTransportConfiguration } from "@/lib/transport-editor";
import { duplicateRegistration, parseVehicle } from "@/lib/vehicle-input";

export async function GET() {
  const denied = await checkAdminApi();
  if (denied) return denied;

  try {
    const { db } = await import("@/prisma/db");

    const vehicles = await db.orm.public.Vehicle.all();
    vehicles.sort((a, b) => b.id - a.id);

    return Response.json(
      { success: true, vehicles },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET VEHICLES ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load vehicles." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }
  const input = parseVehicle(body);
  if (!input.vehicle) {
    return Response.json({ success: false, error: input.error }, { status: 400 });
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      await lockTransportConfiguration(tx);
      const { registrationNumber } = input.vehicle;
      if (registrationNumber && await tx.orm.public.Vehicle.where({ registrationNumber }).first()) {
        return Response.json({ success: false, error: duplicateRegistration }, { status: 409 });
      }

      const vehicle = await tx.orm.public.Vehicle.create(input.vehicle);
      return Response.json({ success: true, vehicle }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE VEHICLE ERROR:", error);
    return Response.json({ success: false, error: "Unable to create vehicle." }, { status: 500 });
  }
}
