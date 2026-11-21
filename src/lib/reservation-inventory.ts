import "server-only";
import { db } from "@/prisma/db";

export type BookingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockDeparture(tx: BookingTransaction, departureId: number) {
  const rows = await tx.query(db.raw.sql`
    SELECT id FROM "Departure" WHERE id = ${departureId}::int FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());
  return rows.length > 0;
}

export async function lockHotelStay(tx: BookingTransaction, departureId: number, stayId: number) {
  const [stay] = await tx.query(db.raw.sql`
    SELECT "hotelId" FROM "HotelStay"
    WHERE id = ${stayId}::int AND "departureId" = ${departureId}::int FOR UPDATE
  `.returnsRow({ hotelId: "pg/int4@1" }).build());
  return stay;
}

export async function transportSeatCapacity(departureId: number, tx?: BookingTransaction) {
  const plan = db.raw.sql`
    SELECT count(*)::int AS capacity
    FROM "DepartureVehicle" a
    JOIN "Vehicle" v ON v.id = a."vehicleId" AND v."isActive"
    JOIN "Seat" s ON s."seatLayoutId" = v."seatLayoutId" AND s."isAvailable"
    WHERE a."departureId" = ${departureId}::int AND a."visibleToCustomer"
  `.returnsRow({ capacity: "pg/int4@1" }).build();
  const [row] = tx ? await tx.query(plan) : await db.runtime().query(plan);
  return row.capacity;
}

export function holdIsActive(
  booking: { status: string; holdExpiresAt: { epochMilliseconds: number } | null },
  now: number,
) {
  return booking.status === "CONFIRMED" ||
    (booking.status === "PENDING" &&
      (booking.holdExpiresAt === null || booking.holdExpiresAt.epochMilliseconds > now));
}

export function canAssignPassenger(
  booking: { status: string; holdExpiresAt: unknown },
) {
  return booking.status === "CONFIRMED" ||
    (booking.status === "PENDING" && booking.holdExpiresAt === null);
}

export async function committedSeatCounts(departureId: number | null = null, tx?: BookingTransaction) {
  // A passenger already assigned a seat still consumes only one place.
  const filter = departureId ?? 0;
  const plan = db.raw.sql`
    WITH committed AS (
      SELECT a."departureId", a."passengerId"
      FROM "SeatAssignment" a
      WHERE (${filter}::int = 0 OR a."departureId" = ${filter}::int)
      UNION
      SELECT b."departureId", p.id
      FROM "Booking" b
      JOIN "Passenger" p ON p."bookingId" = b.id
      WHERE (${filter}::int = 0 OR b."departureId" = ${filter}::int)
        AND (b.status = 'CONFIRMED' OR
             (b.status = 'PENDING' AND
               (b."holdExpiresAt" IS NULL OR b."holdExpiresAt" > statement_timestamp())))
        AND (p."passengerType" = 'ADULT' OR
             (p."passengerType" = 'CHILD' AND b."childFeeEnabledAtBooking"))
    )
    SELECT "departureId", count(*)::int AS count
    FROM committed
    GROUP BY "departureId"
  `.returnsRow({ departureId: "pg/int4@1", count: "pg/int4@1" }).build();

  const rows = tx ? await tx.query(plan) : await db.runtime().query(plan);
  return new Map(rows.map(({ departureId, count }) => [departureId, count]));
}
