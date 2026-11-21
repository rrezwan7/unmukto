import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const vehicleId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
    return badRequest("Invalid vehicle ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const layoutId = body?.seatLayoutId;

  if (
    typeof layoutId !== "number" ||
    !Number.isSafeInteger(layoutId) ||
    layoutId <= 0
  ) {
    return badRequest("Provide a valid seat layout ID.");
  }

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      const vehicle = await tx.orm.public.Vehicle
        .where({ id: vehicleId })
        .first();

      if (!vehicle) {
        return Response.json(
          { success: false, error: "Vehicle not found." },
          { status: 404 }
        );
      }

      // Selecting the currently assigned layout changes nothing.
      if (vehicle.seatLayoutId === layoutId) {
        return Response.json({ success: true, vehicle });
      }

      const assignment = await tx.orm.public.SeatAssignment
        .where({ vehicleId })
        .first();

      const departureAllocation = await tx.orm.public.DepartureVehicle
        .where({ vehicleId })
        .first();

      if (assignment || departureAllocation) {
        return Response.json(
          {
            success: false,
            error:
              "This vehicle is already used by a departure or seat assignment. Its layout cannot be changed here.",
          },
          { status: 409 }
        );
      }

      const layout = await tx.orm.public.SeatLayout
        .where({ id: layoutId })
        .first();

      if (!layout) {
        return Response.json(
          { success: false, error: "Seat layout not found." },
          { status: 404 }
        );
      }

      const seat = await tx.orm.public.Seat
        .where({ seatLayoutId: layoutId })
        .first();

      if (!seat) {
        return badRequest("Add seats to the layout before assigning it.");
      }

      const updated = await tx.orm.public.Vehicle
        .where({ id: vehicleId })
        .update({ seatLayoutId: layoutId });

      return Response.json({ success: true, vehicle: updated });
    });
  } catch (error) {
    console.error("ASSIGN VEHICLE LAYOUT ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to assign seat layout." },
      { status: 500 }
    );
  }
}