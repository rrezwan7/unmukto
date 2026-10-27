import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return Response.json(
      { success: false, error: "Invalid departure ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const departure = await db.orm.public.Departure
      .where({ id: departureId })
      .first();

    if (!departure) {
      return Response.json(
        { success: false, error: "Departure not found." },
        { status: 404 }
      );
    }

    const allocations = await db.orm.public.DepartureVehicle
      .where({ departureId })
      .all();

    allocations.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
    );

    const vehicles = await Promise.all(
      allocations.map(async (allocation) => {
        const vehicle = await db.orm.public.Vehicle
          .where({ id: allocation.vehicleId })
          .first();

        return { ...allocation, vehicle };
      })
    );

    return Response.json(
      { success: true, vehicles },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET DEPARTURE VEHICLES ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load departure vehicles." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return badRequest("Invalid departure ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Vehicle assignment information is required.");
  }

  const vehicleId = body.vehicleId;

  if (
    typeof vehicleId !== "number" ||
    !Number.isSafeInteger(vehicleId) ||
    vehicleId <= 0
  ) {
    return badRequest("Choose a valid vehicle.");
  }

  if (typeof body.visibleToCustomer !== "boolean") {
    return badRequest("Specify whether customers can see this vehicle.");
  }

  if (
    !Number.isInteger(body.displayOrder) ||
    body.displayOrder < 0 ||
    body.displayOrder > 2147483647
  ) {
    return badRequest("Display order must be a non-negative whole number.");
  }

  if (
    body.displayName != null &&
    (typeof body.displayName !== "string" ||
      body.displayName.trim().length > 120)
  ) {
    return badRequest("Display name must contain at most 120 characters.");
  }

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      const departure = await tx.orm.public.Departure
        .where({ id: departureId })
        .first();

      if (!departure) {
        return Response.json(
          { success: false, error: "Departure not found." },
          { status: 404 }
        );
      }

      const vehicle = await tx.orm.public.Vehicle
        .where({ id: vehicleId })
        .first();

      if (!vehicle) {
        return Response.json(
          { success: false, error: "Vehicle not found." },
          { status: 404 }
        );
      }

      if (!vehicle.isActive) {
        return badRequest("Choose an active vehicle.");
      }

      if (vehicle.seatLayoutId === null) {
        return badRequest("Assign a seat layout to this vehicle first.");
      }

      const enabledSeat = await tx.orm.public.Seat
        .where({
          seatLayoutId: vehicle.seatLayoutId,
          isAvailable: true,
        })
        .first();

      if (!enabledSeat) {
        return badRequest("The vehicle layout needs at least one enabled seat.");
      }

      const values = {
        visibleToCustomer: body.visibleToCustomer,
        displayName: body.displayName?.trim() || null,
        displayOrder: body.displayOrder,
      };

      const allocation = await tx.orm.public.DepartureVehicle.upsert({
        create: {
          departureId,
          vehicleId,
          ...values,
        },
        update: values,
        conflictOn: { departureId, vehicleId },
      });

      return Response.json({
        success: true,
        allocation,
      });
    });
  } catch (error) {
    console.error("SAVE DEPARTURE VEHICLE ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to assign vehicle." },
      { status: 500 }
    );
  }
}