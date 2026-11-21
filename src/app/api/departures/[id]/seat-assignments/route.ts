import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  const fail = (error: string, status = 400) =>
    Response.json({ success: false, error }, { status });

  const validId = (value: unknown): value is number =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0;

  if (!validId(departureId)) {
    return fail("Invalid departure ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON.");
  }

  if (
    !body ||
    !validId(body.passengerId) ||
    !validId(body.vehicleId) ||
    !validId(body.seatId)
  ) {
    return fail("Provide valid passenger, vehicle, and seat IDs.");
  }

  const { passengerId, vehicleId, seatId } = body;

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      const passenger = await tx.orm.public.Passenger
        .where({ id: passengerId })
        .first();

      if (!passenger) {
        return fail("Passenger not found.", 404);
      }

      const booking = await tx.orm.public.Booking
        .where({ id: passenger.bookingId })
        .first();

      if (!booking || booking.departureId !== departureId) {
        return fail("Passenger does not belong to this departure.", 409);
      }

      if (
        booking.status !== "PENDING" &&
        booking.status !== "CONFIRMED"
      ) {
        return fail("This booking cannot receive a seat assignment.", 409);
      }

      const eligible =
        passenger.passengerType === "ADULT" ||
        (
          passenger.passengerType === "CHILD" &&
          booking.childFeeEnabledAtBooking
        );

      if (!eligible) {
        return fail("This passenger is not eligible for a transport seat.");
      }

      const allocation = await tx.orm.public.DepartureVehicle
        .where({ departureId, vehicleId })
        .first();

      if (!allocation) {
        return fail("Vehicle is not assigned to this departure.", 409);
      }

      const vehicle = await tx.orm.public.Vehicle
        .where({ id: vehicleId })
        .first();

      if (!vehicle || !vehicle.isActive || vehicle.seatLayoutId === null) {
        return fail("Vehicle is inactive or has no seat layout.", 409);
      }

      const seat = await tx.orm.public.Seat
        .where({ id: seatId })
        .first();

      if (
        !seat ||
        seat.seatLayoutId !== vehicle.seatLayoutId ||
        !seat.isAvailable
      ) {
        return fail("Choose an enabled seat from this vehicle's layout.", 409);
      }

      const existing = await tx.orm.public.SeatAssignment
        .where({ passengerId })
        .first();

      if (existing) {
        if (
          existing.departureId === departureId &&
          existing.vehicleId === vehicleId &&
          existing.seatId === seatId
        ) {
          return Response.json({
            success: true,
            assignment: existing,
          });
        }

        return fail("Passenger already has a different seat assigned.", 409);
      }

      const occupied = await tx.orm.public.SeatAssignment
        .where({ departureId, vehicleId, seatId })
        .first();

      if (occupied) {
        return fail("This seat is already assigned.", 409);
      }

      // Database unique constraints also prevent competing requests
      // from assigning this seat twice or giving a passenger two seats.
      const assignment = await tx.orm.public.SeatAssignment.create({
        passengerId,
        departureId,
        vehicleId,
        seatId,
      });

      return Response.json(
        { success: true, assignment },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error("ASSIGN DEPARTURE SEAT ERROR:", error);

    if (
      error instanceof Error &&
      /duplicate key|unique constraint/i.test(error.message)
    ) {
      return fail(
        "The seat or passenger was assigned by another request. Refresh and try again.",
        409
      );
    }

    return fail("Unable to assign seat.", 500);
  }
}