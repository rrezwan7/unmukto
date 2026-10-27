import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string; vehicleId: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id, vehicleId: vehicleParam } = await params;
  const departureId = Number(id);
  const vehicleId = Number(vehicleParam);

  if (
    !Number.isSafeInteger(departureId) ||
    departureId <= 0 ||
    !Number.isSafeInteger(vehicleId) ||
    vehicleId <= 0
  ) {
    return Response.json(
      { success: false, error: "Invalid departure or vehicle ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const allocation = await db.orm.public.DepartureVehicle
      .where({ departureId, vehicleId })
      .first();

    if (!allocation) {
      return Response.json(
        {
          success: false,
          error: "This vehicle is not assigned to this departure.",
        },
        { status: 404 }
      );
    }

    const vehicle = await db.orm.public.Vehicle
      .where({ id: vehicleId })
      .first();

    if (!vehicle || vehicle.seatLayoutId === null) {
      return Response.json(
        { success: false, error: "Vehicle seat layout is unavailable." },
        { status: 409 }
      );
    }

    const [layoutSeats, assignments] = await Promise.all([
      db.orm.public.Seat
        .where({ seatLayoutId: vehicle.seatLayoutId })
        .all(),
      db.orm.public.SeatAssignment
        .where({ departureId, vehicleId })
        .all(),
    ]);

    const assignedIds = new Set(
      assignments.map((assignment) => assignment.seatId)
    );

    const seats = layoutSeats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      rowNumber: seat.rowNumber,
      columnNumber: seat.columnNumber,
      status: assignedIds.has(seat.id)
        ? "ASSIGNED"
        : !seat.isAvailable || !vehicle.isActive
          ? "DISABLED"
          : "AVAILABLE",
    }));

    seats.sort(
      (a, b) =>
        (a.rowNumber ?? 0) - (b.rowNumber ?? 0) ||
        (a.columnNumber ?? 0) - (b.columnNumber ?? 0) ||
        a.id - b.id
    );

    return Response.json(
      {
        success: true,
        departureId,
        vehicle: {
          id: vehicle.id,
          name: allocation.displayName || vehicle.name,
          isActive: vehicle.isActive,
        },
        summary: {
          total: seats.length,
          available: seats.filter((seat) => seat.status === "AVAILABLE").length,
          assigned: seats.filter((seat) => seat.status === "ASSIGNED").length,
          disabled: seats.filter((seat) => seat.status === "DISABLED").length,
        },
        seats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET DEPARTURE SEATS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load seat availability." },
      { status: 500 }
    );
  }
}