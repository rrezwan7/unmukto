import "server-only";
import { db } from "@/prisma/db";
import { stayOutsideSchedule } from "@/lib/departure-editor";
import { localDepartureDay, type DepartureSchedule } from "@/lib/departure-schedule";
import type { BookingTransaction } from "@/lib/reservation-inventory";
import { lockTour } from "@/lib/tour-editor";

export async function lockHotel(tx: BookingTransaction, hotelId: number) {
  const [hotel] = await tx.query(db.raw.sql`
    SELECT "isActive" FROM "Hotel" WHERE id = ${hotelId}::int FOR UPDATE
  `.returnsRow({ isActive: "pg/bool@1" }).build());
  return hotel;
}

export async function lockRoom(tx: BookingTransaction, hotelId: number, roomId: number) {
  const [room] = await tx.query(db.raw.sql`
    SELECT id FROM "Room" WHERE id = ${roomId}::int AND "hotelId" = ${hotelId}::int FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());
  return room;
}

export async function roomNumberExists(tx: BookingTransaction, hotelId: number, roomNumber: string, roomId = 0) {
  const rooms = await tx.orm.public.Room.where({ hotelId }).select("id", "roomNumber").all();
  return rooms.some((room) => room.id !== roomId && room.roomNumber.trim().toUpperCase() === roomNumber);
}

export async function roomOverCapacity(tx: BookingTransaction, roomId: number, proposedCapacity: number) {
  const [stay] = await tx.query(db.raw.sql`
    SELECT "hotelStayId" FROM "RoomAssignment"
    WHERE "roomId" = ${roomId}::int
    GROUP BY "hotelStayId"
    HAVING count(*) > ${proposedCapacity}::int
    ORDER BY count(*) DESC, "hotelStayId"
    LIMIT 1
  `.returnsRow({ hotelStayId: "pg/int4@1" }).build());
  return stay;
}

type StayDates = Parameters<typeof stayOutsideSchedule>[1];

export async function stayDateConflict(
  tx: BookingTransaction,
  departure: DepartureSchedule & { id: number },
  hotelId: number,
  dates: StayDates,
  stayId?: number,
) {
  if (stayOutsideSchedule(departure, dates)) {
    return "The hotel stay must fall within the departure's travel dates.";
  }

  const stays = await tx.orm.public.HotelStay
    .where({ departureId: departure.id, hotelId })
    .select("id", "checkInDate", "checkOutDate").all();
  const checkIn = localDepartureDay(dates.checkInDate).toString();
  const checkOut = localDepartureDay(dates.checkOutDate).toString();
  if (stays.some((stay) => stay.id !== stayId &&
      localDepartureDay(stay.checkInDate).toString() < checkOut &&
      localDepartureDay(stay.checkOutDate).toString() > checkIn)) {
    return "This hotel already has a stay on this departure during the selected dates.";
  }
}

export async function stopBelongsToTour(tx: BookingTransaction, tourId: number, stopId: number) {
  // The itinerary editor uses the same lock before removing a linked stop.
  if (!await lockTour(tx, tourId)) return false;
  const stop = await tx.orm.public.Destination.where({ id: stopId }).select("itineraryId").first();
  return Boolean(stop && await tx.orm.public.Itinerary.where({ id: stop.itineraryId, tourId }).select("id").first());
}
