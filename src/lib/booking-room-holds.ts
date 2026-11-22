import "server-only";
import { db } from "@/prisma/db";
import { roomAvailability } from "@/lib/room-capacity";
import { lodgingHoldSchemaAvailable, roomCommitments, stayNights } from "@/lib/room-inventory";
import type { BookingTransaction } from "@/lib/reservation-inventory";

export async function checkoutLodgingSetting(departureId: number, tx?: BookingTransaction) {
  if (!await lodgingHoldSchemaAvailable(tx)) return { available: false, enabled: false };
  const setting = await (tx ?? db).orm.public.DepartureLodgingSettings.where({ departureId }).first();
  return { available: true, enabled: setting?.holdsEnabled ?? false };
}

async function lockDepartureStays(tx: BookingTransaction, departureId: number) {
  await tx.query(db.raw.sql`
    SELECT id FROM "HotelStay" WHERE "departureId" = ${departureId}::int ORDER BY id FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());
}

type HeldRoom = { hotelStayId: number; roomId: number; places: number };
type RoomType = "SHARED" | "COUPLE" | "PRIVATE";

// The caller holds the departure lock. Take stays first and physical rooms in ID order.
export async function planCheckoutRoomHolds(
  tx: BookingTransaction, departureId: number, roomType: RoomType, partySize: number,
): Promise<HeldRoom[] | null> {
  await lockDepartureStays(tx, departureId);
  await tx.query(db.raw.sql`
    SELECT r.id FROM "Room" r
    WHERE EXISTS (
      SELECT 1 FROM "RoomAllotment" a JOIN "HotelStay" s ON s.id = a."hotelStayId"
      WHERE a."roomId" = r.id AND s."departureId" = ${departureId}::int
    )
    ORDER BY r.id FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());

  const stays = await tx.orm.public.HotelStay.where({ departureId })
    .include("roomAllotments", (allotments) => allotments.include("room").orderBy((a) => a.roomId.asc()))
    .all();
  if (stays.length === 0) return null;

  const inventoryByHotel = new Map<number, Awaited<ReturnType<typeof roomCommitments>>>();
  const planned: HeldRoom[] = [];
  for (const stay of stays) {
    let hotel = inventoryByHotel.get(stay.hotelId);
    if (!hotel) {
      hotel = await roomCommitments(stay.hotelId, 0, tx, true);
      inventoryByHotel.set(stay.hotelId, hotel);
    }
    let left = partySize;
    const nights = stayNights(stay);
    for (const { room } of stay.roomAllotments) {
      if (!room || room.hotelId !== stay.hotelId || room.roomType !== roomType) continue;
      const capacity = roomAvailability(room, nights, hotel.get(room.id) ?? []);
      const available = capacity.exclusive
        ? capacity.assigned === 0 && capacity.held === 0 && capacity.availableSlots >= left ? left : 0
        : Math.min(capacity.availableSlots, capacity.allotted - capacity.assigned - capacity.held);
      const places = Math.min(left, available);
      if (places <= 0) continue;
      planned.push({ hotelStayId: stay.id, roomId: room.id, places });
      left -= places;
      if (left === 0) break;
    }
    if (left > 0) return null;
  }
  return planned;
}

export async function bookingRoomHolds(bookingId: number, tx?: BookingTransaction): Promise<HeldRoom[]> {
  if (!await lodgingHoldSchemaAvailable(tx)) return [];
  return (tx ?? db).orm.public.BookingRoomHold.where({ bookingId })
    .select("hotelStayId", "roomId", "places")
    .orderBy([(hold) => hold.hotelStayId.asc(), (hold) => hold.roomId.asc()]).all();
}

export async function lockHeldRooms(tx: BookingTransaction, departureId: number, bookingId: number) {
  await lockDepartureStays(tx, departureId);
  await tx.query(db.raw.sql`
    SELECT id FROM "Room"
    WHERE id IN (SELECT "roomId" FROM "BookingRoomHold" WHERE "bookingId" = ${bookingId}::int)
    ORDER BY id FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());
}

export async function activeLodgingExists(
  tx: BookingTransaction, departureId: number, stayId?: number,
) {
  if (!await lodgingHoldSchemaAvailable(tx)) return false;
  const target = stayId ?? 0;
  const [row] = await tx.query(db.raw.sql`
    SELECT EXISTS (
      SELECT 1 FROM "BookingRoomHold" h JOIN "Booking" b ON b.id = h."bookingId"
      WHERE b."departureId" = ${departureId}::int
        AND (${target}::int = 0 OR h."hotelStayId" = ${target}::int)
        AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b."holdExpiresAt" > statement_timestamp()))
    ) AS active
  `.returnsRow({ active: "pg/bool@1" }).build());
  return row.active;
}

export async function checkoutLodgingSetupError(tx: BookingTransaction, departureId: number) {
  await lockDepartureStays(tx, departureId);
  const { HotelStay, DepartureRoomOption } = tx.orm.public;
  const stays = await HotelStay.where({ departureId })
    .include("roomAllotments", (allotments) => allotments.include("room", (room) => room.select("roomType")))
    .all();
  const options = await DepartureRoomOption.where({ departureId, isAvailable: true }).select("roomType").all();
  if (!stays.length || !options.length) return "Schedule a hotel stay and publish a room option first.";
  const [manual] = await tx.query(db.raw.sql`
    SELECT EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b."departureId" = ${departureId}::int AND b."roomOptionId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "BookingRoomHold" h WHERE h."bookingId" = b.id)
        AND (
          (b.status = 'PENDING' AND (b."holdExpiresAt" IS NULL OR b."holdExpiresAt" > statement_timestamp()))
          OR (b.status = 'CONFIRMED' AND EXISTS (
            SELECT 1 FROM "HotelStay" s JOIN "Passenger" p ON p."bookingId" = b.id
            WHERE s."departureId" = b."departureId" AND NOT EXISTS (
              SELECT 1 FROM "RoomAssignment" a WHERE a."hotelStayId" = s.id AND a."passengerId" = p.id
            )
          ))
        )
    ) AS unresolved
  `.returnsRow({ unresolved: "pg/bool@1" }).build());
  if (manual.unresolved) return "Resolve pending manual lodging requests and assign rooms for confirmed bookings before enabling checkout holds.";

  for (const stay of stays) {
    for (const { roomType } of options) {
      if (!stay.roomAllotments.some((allotment) => allotment.room?.roomType === roomType)) {
        return `Stay #${stay.id} needs an allotment for the ${roomType.toLowerCase()} room option.`;
      }
    }
  }
}
