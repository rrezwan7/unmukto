import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/prisma/db";
import { calculateBookingQuote, type PassengerCounts } from "@/lib/booking-quote";
import { committedSeatCounts, type BookingTransaction } from "@/lib/reservation-inventory";

export function bookingIdIsValid(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

export async function getDepartureBookingQuote(
  departureId: number,
  roomOptionId: number,
  counts: PassengerCounts,
  tx?: BookingTransaction,
) {
  const orm = (tx ?? db).orm.public;
  const departure = await orm.Departure
    .where({ id: departureId, bookingOpen: true, customerVisible: true })
    .first();
  if (!departure || departure.departureDate.epochMilliseconds <= Date.now()) {
    return { error: "এই যাত্রার জন্য ভাড়া হিসাব করা যাচ্ছে না।", status: 404 } as const;
  }

  const [tour, pricing, room, allocations] = await Promise.all([
    orm.Tour.where({ id: departure.tourId, isActive: true }).first(),
    orm.DeparturePricing.where({ departureId }).first(),
    orm.DepartureRoomOption.where({ id: roomOptionId, departureId, isAvailable: true }).first(),
    orm.DepartureVehicle.where({ departureId, visibleToCustomer: true }).select("vehicleId").all(),
  ]);
  if (!tour) {
    return { error: "এই যাত্রার জন্য ভাড়া হিসাব করা যাচ্ছে না।", status: 404 } as const;
  }
  if (!pricing || !room) {
    return { error: "এই যাত্রায় নির্বাচিত রুম বা ভাড়া এখন পাওয়া যাচ্ছে না।", status: 409 } as const;
  }

  const quote = calculateBookingQuote(counts, pricing, room);
  if (!quote) {
    return { error: "যাত্রীর সংখ্যা নির্বাচিত রুমের সীমা ছাড়িয়েছে। অন্য রুম বেছে নিন বা যাত্রীর সংখ্যা বদলান।", status: 409 } as const;
  }

  const vehicleIds = allocations.map(({ vehicleId }) => vehicleId);
  const vehicles = vehicleIds.length === 0 ? [] : await orm.Vehicle
    .where((vehicle) => vehicle.id.in(vehicleIds))
    .where({ isActive: true })
    .select("seatLayoutId")
    .all();
  const layoutIds = vehicles.flatMap(({ seatLayoutId }) => seatLayoutId === null ? [] : [seatLayoutId]);
  const [seats, committed] = await Promise.all([
    layoutIds.length === 0 ? [] : orm.Seat
      .where((seat) => seat.seatLayoutId.in(layoutIds))
      .where({ isAvailable: true })
      .select("seatLayoutId")
      .all(),
    committedSeatCounts(departureId, tx),
  ]);
  const seatsByLayout = new Map<number, number>();
  for (const { seatLayoutId } of seats) {
    seatsByLayout.set(seatLayoutId, (seatsByLayout.get(seatLayoutId) ?? 0) + 1);
  }
  const capacity = layoutIds.reduce((total, id) => total + (seatsByLayout.get(id) ?? 0), 0);
  if (quote.seatsRequired > capacity - (committed.get(departureId) ?? 0)) {
    return { error: "এই যাত্রায় আপনার দলের জন্য যথেষ্ট আসন খালি নেই।", status: 409 } as const;
  }

  const quoteVersion = createHash("sha256").update(JSON.stringify([
    departureId, roomOptionId, counts.adults, counts.children, counts.infants,
    pricing.adultFare, pricing.childFare, pricing.childFeeEnabled, room.surcharge, quote.total,
  ])).digest("hex");

  return { quote, quoteVersion, pricing };
}
