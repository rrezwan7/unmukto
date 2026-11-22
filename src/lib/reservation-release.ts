import "server-only";
import { db } from "@/prisma/db";
import { lockDeparture, type BookingTransaction } from "@/lib/reservation-inventory";

export type ReservationReleaseResult = { released: true } | { error: string };

export async function reservationReleaseAvailable(tx?: BookingTransaction) {
  // Existing deployments can still review and confirm bookings before this migration is applied.
  const plan = db.raw.sql`
    SELECT to_regclass('public."ReservationRelease"') IS NOT NULL AS ready
  `.returnsRow({ ready: "pg/bool@1" }).build();
  const [schema] = tx ? await tx.query(plan) : await db.runtime().query(plan);
  return schema.ready;
}

export async function releaseUnpaidReservation({
  departureId,
  bookingId,
  adminGithubId,
  reason,
}: {
  departureId: number;
  bookingId: number;
  adminGithubId: string;
  reason: unknown;
}): Promise<ReservationReleaseResult> {
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    return { error: "Enter a release reason of 1–500 characters." };
  }

  try {
    return await db.transaction(async (tx) => {
      if (!await reservationReleaseAvailable(tx)) return { error: "The reservation release migration is pending." };
      // Staff confirmation and seat reservations take the same departure lock.
      if (!await lockDeparture(tx, departureId)) return { error: "Departure not found." };

      const { Booking, ReservationRelease } = tx.orm.public;
      const booking = await Booking.where({ id: bookingId, departureId })
        .select("status", "reservationKey", "holdExpiresAt").first();
      if (!booking?.reservationKey || !booking.holdExpiresAt) {
        return { error: "Timed reservation not found on this departure." };
      }
      if (booking.status === "CANCELLED") {
        const recorded = await ReservationRelease.where({ bookingId }).select("bookingId").first();
        if (recorded) return { released: true };
      }
      if (booking.status !== "PENDING") return { error: "Only pending holds can be released." };
      if (booking.holdExpiresAt.epochMilliseconds <= Date.now()) {
        return { error: "This hold has already expired and its seats are available." };
      }

      const [released] = await tx.query(db.raw.sql`
        WITH release_time AS (SELECT clock_timestamp() AS "at")
        UPDATE "Booking" b
        SET status = 'CANCELLED', "dueAmount" = 0, "updatedAt" = release_time."at"
        FROM release_time
        WHERE b.id = ${bookingId}::int AND b."departureId" = ${departureId}::int
          AND b.status = 'PENDING' AND b."holdExpiresAt" > release_time."at" AND b."paidAmount" = 0
          AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."bookingId" = b.id)
          AND NOT EXISTS (
            SELECT 1 FROM "Passenger" p
            WHERE p."bookingId" = b.id AND (
              EXISTS (SELECT 1 FROM "SeatAssignment" a WHERE a."passengerId" = p.id)
              OR EXISTS (SELECT 1 FROM "RoomAssignment" a WHERE a."passengerId" = p.id)
            )
          )
        RETURNING b."updatedAt" AS "releasedAt"
      `.returnsRow({ releasedAt: "pg/timestamptz-date@1" }).build());
      if (!released) {
        return { error: "This hold is no longer active or has a payment or assignment record. Review it before proceeding." };
      }

      await ReservationRelease.create({
        bookingId,
        adminGithubId,
        reason: reason.trim(),
        releasedAt: released.releasedAt.toISOString(),
      });
      return { released: true };
    });
  } catch (error) {
    console.error("RESERVATION RELEASE ERROR:", error);
    return { error: "Could not release the hold. Check its status before trying again." };
  }
}
