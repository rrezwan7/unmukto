import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/prisma/db";
import { calculateBookingQuote, type PassengerCounts } from "@/lib/booking-quote";
import { committedSeatCounts, transportSeatCapacity, type BookingTransaction } from "@/lib/reservation-inventory";

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

  const [tour, pricing, room] = await Promise.all([
    orm.Tour.where({ id: departure.tourId, isActive: true }).first(),
    orm.DeparturePricing.where({ departureId }).first(),
    orm.DepartureRoomOption.where({ id: roomOptionId, departureId, isAvailable: true }).first(),
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

  const [capacity, committed] = await Promise.all([
    transportSeatCapacity(departureId, tx),
    committedSeatCounts(departureId, tx),
  ]);
  if (quote.seatsRequired > capacity - (committed.get(departureId) ?? 0)) {
    return { error: "এই যাত্রায় আপনার দলের জন্য যথেষ্ট আসন খালি নেই।", status: 409 } as const;
  }

  const quoteVersion = createHash("sha256").update(JSON.stringify([
    departureId, roomOptionId, counts.adults, counts.children, counts.infants,
    pricing.adultFare, pricing.childFare, pricing.childFeeEnabled, room.surcharge, quote.total,
  ])).digest("hex");

  return { quote, quoteVersion, pricing };
}
