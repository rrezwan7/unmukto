import "server-only";
import { db } from "@/prisma/db";

export type BookingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
