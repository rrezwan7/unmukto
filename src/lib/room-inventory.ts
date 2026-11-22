import "server-only";
import { db } from "@/prisma/db";
import { localDepartureDay } from "@/lib/departure-schedule";
import type { BookingTransaction } from "@/lib/reservation-inventory";
import type { RoomCommitment } from "@/lib/room-capacity";
import type { Temporal } from "temporal-polyfill";

export function stayNights(stay: { id: number; checkInDate: Temporal.Instant; checkOutDate: Temporal.Instant }) {
  const checkIn = localDepartureDay(stay.checkInDate);
  const checkOut = localDepartureDay(stay.checkOutDate);
  return {
    id: stay.id,
    checkIn: checkIn.toString(),
    checkOut: checkOut.toString() > checkIn.toString() ? checkOut.toString() : checkIn.add({ days: 1 }).toString(),
  };
}

export async function lodgingHoldSchemaAvailable(tx?: BookingTransaction) {
  const plan = db.raw.sql`
    SELECT to_regclass('public."BookingRoomHold"') IS NOT NULL AS ready
  `.returnsRow({ ready: "pg/bool@1" }).build();
  const [schema] = tx ? await tx.query(plan) : await db.runtime().query(plan);
  return schema.ready;
}

export async function roomCommitments(
  hotelId: number,
  roomId = 0,
  tx?: BookingTransaction,
  holdsAvailable?: boolean,
) {
  const holdColumns = { roomId: "pg/int4@1", hotelStayId: "pg/int4@1", places: "pg/int4@1" } as const;
  const activeHolds = (holdsAvailable ?? await lodgingHoldSchemaAvailable(tx))
    ? db.raw.sql`
        SELECT h."roomId", h."hotelStayId", h.places
        FROM "BookingRoomHold" h
        JOIN rooms r ON r.id = h."roomId"
        JOIN "Booking" b ON b.id = h."bookingId"
        WHERE b.status = 'PENDING' AND b."holdExpiresAt" > statement_timestamp()
      `.returnsRow(holdColumns)
    : db.raw.sql`
        SELECT 0 AS "roomId", 0 AS "hotelStayId", 0 AS places WHERE false
      `.returnsRow(holdColumns);

  const plan = db.raw.sql`
    WITH rooms AS (
      SELECT id FROM "Room"
      WHERE "hotelId" = ${hotelId}::int AND (${roomId}::int = 0 OR id = ${roomId}::int)
    ), commitments AS (
      SELECT a."roomId", a."hotelStayId", a.places AS allotted, 0 AS assigned, 0 AS held
      FROM "RoomAllotment" a JOIN rooms r ON r.id = a."roomId"
      UNION ALL
      SELECT a."roomId", a."hotelStayId", 0 AS allotted, count(*)::int AS assigned, 0 AS held
      FROM "RoomAssignment" a JOIN rooms r ON r.id = a."roomId"
      GROUP BY a."roomId", a."hotelStayId"
      UNION ALL
      SELECT h."roomId", h."hotelStayId", 0 AS allotted, 0 AS assigned, h.places AS held
      FROM (${activeHolds}) h
    )
    SELECT c."roomId", s.id AS "stayId", sum(c.allotted)::int AS allotted,
      sum(c.assigned)::int AS assigned, sum(c.held)::int AS held,
      to_char(n."checkInDay", 'YYYY-MM-DD') AS "checkIn",
      to_char(greatest(n."checkOutDay", n."checkInDay" + 1), 'YYYY-MM-DD') AS "checkOut"
    FROM commitments c JOIN "HotelStay" s ON s.id = c."hotelStayId"
    CROSS JOIN LATERAL (
      SELECT (s."checkInDate" AT TIME ZONE 'Asia/Dhaka')::date AS "checkInDay",
             (s."checkOutDate" AT TIME ZONE 'Asia/Dhaka')::date AS "checkOutDay"
    ) n
    GROUP BY c."roomId", s.id, n."checkInDay", n."checkOutDay"
  `.returnsRow({
    roomId: "pg/int4@1",
    stayId: "pg/int4@1",
    allotted: "pg/int4@1",
    assigned: "pg/int4@1",
    held: "pg/int4@1",
    checkIn: "pg/text@1",
    checkOut: "pg/text@1",
  }).build();

  const rows = tx ? await tx.query(plan) : await db.runtime().query(plan);
  const byRoom = new Map<number, RoomCommitment[]>();
  for (const { roomId, ...commitment } of rows) {
    const room = byRoom.get(roomId) ?? [];
    room.push(commitment);
    byRoom.set(roomId, room);
  }
  return byRoom;
}
