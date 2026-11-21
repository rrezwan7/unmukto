import { calculateBookingQuote } from "@/lib/booking-quote";

function integerInRange(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= minimum && value <= 2_147_483_647;
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const input: unknown = await request.json().catch(() => null);
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return errorResponse("ভাড়া হিসাবের জন্য যাত্রী ও রুমের তথ্য দিন।", 400);
  }

  const { departureId, roomOptionId, adults, children, infants } = input as Record<string, unknown>;
  if (
    !integerInRange(departureId, 1) || !integerInRange(roomOptionId, 1) ||
    !integerInRange(adults, 1) || !integerInRange(children, 0) || !integerInRange(infants, 0)
  ) {
    return errorResponse("সঠিক রুম বেছে নিন এবং কমপক্ষে একজন প্রাপ্তবয়স্ক যাত্রী যোগ করুন।", 400);
  }

  try {
    const { db } = await import("@/prisma/db");
    const departure = await db.orm.public.Departure
      .where({ id: departureId, bookingOpen: true, customerVisible: true })
      .first();
    if (!departure || departure.departureDate.epochMilliseconds <= Date.now()) {
      return errorResponse("এই যাত্রার জন্য ভাড়া হিসাব করা যাচ্ছে না।", 404);
    }

    const activeTour = await db.orm.public.Tour
      .where({ id: departure.tourId, isActive: true })
      .first();
    if (!activeTour) {
      return errorResponse("এই যাত্রার জন্য ভাড়া হিসাব করা যাচ্ছে না।", 404);
    }

    const [pricing, room, allocations, assignments] = await Promise.all([
      db.orm.public.DeparturePricing.where({ departureId }).first(),
      db.orm.public.DepartureRoomOption.where({ id: roomOptionId, departureId, isAvailable: true }).first(),
      db.orm.public.DepartureVehicle.where({ departureId, visibleToCustomer: true }).select("vehicleId").all(),
      db.orm.public.SeatAssignment.where({ departureId }).select("id").all(),
    ]);

    if (!pricing || !room) {
      return errorResponse("এই যাত্রায় নির্বাচিত রুম বা ভাড়া এখন পাওয়া যাচ্ছে না।", 409);
    }

    const quote = calculateBookingQuote({ adults, children, infants }, pricing, room);
    if (!quote) {
      return errorResponse("যাত্রীর সংখ্যা নির্বাচিত রুমের সীমা ছাড়িয়েছে। অন্য রুম বেছে নিন বা যাত্রীর সংখ্যা বদলান।", 409);
    }

    const vehicleIds = allocations.map(({ vehicleId }) => vehicleId);
    const vehicles = vehicleIds.length === 0 ? [] : await db.orm.public.Vehicle
      .where((vehicle) => vehicle.id.in(vehicleIds))
      .where({ isActive: true })
      .select("seatLayoutId")
      .all();
    const layoutIds = vehicles.flatMap(({ seatLayoutId }) => seatLayoutId === null ? [] : [seatLayoutId]);
    const seats = layoutIds.length === 0 ? [] : await db.orm.public.Seat
      .where((seat) => seat.seatLayoutId.in(layoutIds))
      .where({ isAvailable: true })
      .select("seatLayoutId")
      .all();
    const seatsByLayout = new Map<number, number>();
    for (const { seatLayoutId } of seats) {
      seatsByLayout.set(seatLayoutId, (seatsByLayout.get(seatLayoutId) ?? 0) + 1);
    }
    const capacity = layoutIds.reduce((total, id) => total + (seatsByLayout.get(id) ?? 0), 0);
    if (quote.seatsRequired > capacity - assignments.length) {
      return errorResponse("এই যাত্রায় আপনার দলের জন্য যথেষ্ট আসন খালি নেই।", 409);
    }

    return Response.json({ quote });
  } catch (error) {
    console.error("BOOKING QUOTE ERROR:", error);
    return errorResponse("এখন ভাড়া হিসাব করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।", 500);
  }
}
