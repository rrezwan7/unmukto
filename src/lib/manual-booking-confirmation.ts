import "server-only";
import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";
import { bookingRoomHolds, lockHeldRooms } from "@/lib/booking-room-holds";
import { committedSeatCounts, lockDeparture, transportSeatCapacity } from "@/lib/reservation-inventory";

const paymentMethods = ["BKASH", "NAGAD", "ROCKET", "DBBL", "CASH", "BANK_TRANSFER", "OTHER"] as const;

function normalizeTaka(value: string) {
  const parts = /^(\d{1,80})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!parts) return null;
  const [, whole, fraction = ""] = parts;
  return `${BigInt(whole)}.${fraction.padEnd(2, "0")}`;
}

export type ManualConfirmation = { confirmed: true } | { error: string };

export async function confirmGuestBookingManually({
  departureId,
  bookingId,
  adminGithubId,
  form,
}: {
  departureId: number;
  bookingId: number;
  adminGithubId: string;
  form: FormData;
}): Promise<ManualConfirmation> {
  try {
    return await db.transaction(async (tx) => {
      if (!(await lockDeparture(tx, departureId))) return { error: "Departure not found." };
      const [lockedBooking] = await tx.query(db.raw.sql`
        SELECT id, coalesce("holdExpiresAt" > clock_timestamp(), false) AS active
        FROM "Booking"
        WHERE id = ${bookingId}::int AND "departureId" = ${departureId}::int FOR UPDATE
      `.returnsRow({ id: "pg/int4@1", active: "pg/bool@1" }).build());
      const booking = await tx.orm.public.Booking.where({ id: bookingId, departureId }).first();
      if (!booking?.reservationKey || booking.customerId !== null) {
        return { error: "Reservation not found on this departure." };
      }
      if (booking.status === "CONFIRMED") return { confirmed: true };
      if (booking.status !== "PENDING" || !booking.holdExpiresAt) {
        return { error: "Only a pending reservation can be confirmed." };
      }
      if (!lockedBooking?.active) {
        return { error: "The hold has expired. Review availability before arranging another reservation." };
      }
      if (booking.roomOptionId !== null && form.get("lodgingVerified") !== "on") {
        return { error: "Verify lodging availability for every stay before confirming." };
      }

      const total = normalizeTaka(booking.totalAmount);
      if (!total || normalizeTaka(booking.paidAmount) !== "0.00") {
        return { error: "Review the existing booking balance before confirming payment." };
      }

      const paymentRequired = total !== "0.00";
      const method = paymentMethods.find((value) => value === form.get("paymentMethod"));
      const referenceValue = form.get("paymentReference");
      const reference = typeof referenceValue === "string" ? referenceValue.trim() : "";
      const amount = form.get("paymentAmount");
      const paymentKey = method && reference ? `${method}:${reference.toUpperCase()}` : null;
      if (paymentRequired) {
        if (typeof amount !== "string" || normalizeTaka(amount) !== total) {
          return { error: "Enter the full quoted total you verified as received." };
        }
        if (!method || !paymentKey || reference.length > 120) {
          return { error: "Select the payment method and enter the verified receipt or transaction reference." };
        }
        const duplicate = await tx.orm.public.Payment
          .where({ manualVerificationKey: paymentKey })
          .select("id")
          .first();
        if (duplicate) return { error: "This payment reference has already been recorded for that method." };
      }

      const [capacity, committed] = await Promise.all([
        transportSeatCapacity(departureId, tx),
        committedSeatCounts(departureId, tx),
      ]);
      if (capacity === 0 || (committed.get(departureId) ?? 0) > capacity) {
        return { error: "The departure no longer has enough configured seats. Review its capacity before confirming." };
      }

      const roomHolds = await bookingRoomHolds(bookingId, tx);
      const roomAssignments: { passengerId: number; hotelStayId: number; roomId: number }[] = [];
      if (roomHolds.length > 0) {
        await lockHeldRooms(tx, departureId, bookingId);
        const passengers = await tx.orm.public.Passenger.where({ bookingId }).select("id")
          .orderBy((passenger) => passenger.id.asc()).all();
        const stays = await tx.orm.public.HotelStay.where({ departureId }).select("id").all();
        const coveredStayIds = new Set(roomHolds.map((hold) => hold.hotelStayId));
        if (!passengers.length || !stays.length || coveredStayIds.size !== stays.length) {
          return { error: "The lodging hold is incomplete. Review the scheduled stays before confirming." };
        }
        for (const stay of stays) {
          const held = roomHolds.filter((hold) => hold.hotelStayId === stay.id);
          if (held.reduce((total, room) => total + room.places, 0) !== passengers.length) {
            return { error: "The lodging hold does not cover all passengers at every stay." };
          }
          let start = 0;
          for (const { roomId, places } of held) {
            for (const passenger of passengers.slice(start, start + places)) {
              roomAssignments.push({ passengerId: passenger.id, hotelStayId: stay.id, roomId });
            }
            start += places;
          }
        }
      }

      const [confirmation] = await tx.query(db.raw.sql`
        WITH confirmation_time AS (SELECT clock_timestamp() AS "at")
        UPDATE "Booking" b
        SET status = 'CONFIRMED',
            "paidAmount" = b."totalAmount", "dueAmount" = 0,
            "confirmedAt" = confirmation_time."at",
            "confirmedByGithubId" = ${adminGithubId}::text,
            "updatedAt" = confirmation_time."at"
        FROM "Departure" d, confirmation_time
        WHERE b.id = ${bookingId}::int AND b."departureId" = ${departureId}::int
          AND d.id = b."departureId" AND d."departureDate" > confirmation_time."at"
          AND b.status = 'PENDING' AND b."holdExpiresAt" > confirmation_time."at"
        RETURNING b."confirmedAt"
      `.returnsRow({ confirmedAt: "pg/timestamptz-date@1" }).build());
      if (!confirmation) return { error: "The hold has expired or the departure has passed. Review availability before arranging another reservation." };

      if (roomAssignments.length > 0) {
        await tx.orm.public.RoomAssignment.createAll(roomAssignments);
      }

      if (paymentRequired && method && paymentKey) {
        const verifiedAt = Temporal.Instant.fromEpochMilliseconds(confirmation.confirmedAt.getTime()).toString();
        await tx.orm.public.Payment.create({
          bookingId,
          amount: total,
          method,
          status: "APPROVED",
          referenceNumber: reference,
          manualVerificationKey: paymentKey,
          createdAt: verifiedAt,
        });
      }

      return { confirmed: true };
    });
  } catch (error) {
    if (error instanceof Error && /Payment_manualVerificationKey_key/.test(error.message)) {
      return { error: "This payment reference has already been recorded for that method." };
    }
    console.error("MANUAL BOOKING CONFIRMATION ERROR:", error);
    return { error: "Could not confirm the booking. Check the booking status before trying again." };
  }
}
