import { checkAdminApi } from "@/lib/admin-auth";
import { canAssignPassenger, holdIsActive, passengerNeedsSeat } from "@/lib/reservation-inventory";

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

    const [bookings, assignments] = await Promise.all([
      db.orm.public.Booking.where({ departureId }).all(),
      db.orm.public.SeatAssignment.where({ departureId }).all(),
    ]);

    const now = Date.now();
    const activeBookings = bookings.filter((booking) => holdIsActive(booking, now));

    const assignmentByPassenger = new Map(
      assignments.map((assignment) => [
        assignment.passengerId,
        assignment,
      ])
    );

    const groups = await Promise.all(
      activeBookings.map(async (booking) => {
        const passengers = await db.orm.public.Passenger
          .where({ bookingId: booking.id })
          .all();

        return passengers.map((passenger) => {
          const assignment = assignmentByPassenger.get(passenger.id);

          const eligibleForSeat = canAssignPassenger(booking) &&
            passengerNeedsSeat(passenger.passengerType, booking.childFeeEnabledAtBooking);

          return {
            id: passenger.id,
            name: passenger.name,
            passengerType: passenger.passengerType,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            bookingStatus: booking.status,
            eligibleForSeat,
            seatAssignment: assignment
              ? {
                  id: assignment.id,
                  vehicleId: assignment.vehicleId,
                  seatId: assignment.seatId,
                }
              : null,
          };
        });
      })
    );

    const passengers = groups.flat();
    passengers.sort(
      (a, b) => a.bookingId - b.bookingId || a.id - b.id
    );

    return Response.json(
      { success: true, passengers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET DEPARTURE PASSENGERS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load passengers." },
      { status: 500 }
    );
  }
}
