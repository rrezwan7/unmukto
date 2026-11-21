import { checkAdminApi } from "@/lib/admin-auth";
import { stayOutsideSchedule } from "@/lib/departure-editor";
import { lockDeparture } from "@/lib/reservation-inventory";
import { isDatabaseId } from "@/lib/tour-editor";
import { Temporal } from "temporal-polyfill";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  if (!isDatabaseId(departureId)) {
    return Response.json(
      { success: false, error: "Invalid departure ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const departure = await db.orm.public.Departure
      .where({ id: departureId })
      .first();

    if (!departure) {
      return Response.json(
        { success: false, error: "Departure not found." },
        { status: 404 }
      );
    }

    const [stays, hotels, rooms, assignments] = await Promise.all([
      db.orm.public.HotelStay.where({ departureId }).all(),
      db.orm.public.Hotel.all(),
      db.orm.public.Room.all(),
      db.orm.public.RoomAssignment.all(),
    ]);

    const hotelMap = new Map(hotels.map((h) => [h.id, h]));

    // Count rooms per hotel
    const roomCountByHotel = new Map<number, number>();
    for (const r of rooms) {
      roomCountByHotel.set(
        r.hotelId,
        (roomCountByHotel.get(r.hotelId) ?? 0) + 1
      );
    }

    // Count assignments per stay
    const assignmentCountByStay = new Map<number, number>();
    for (const a of assignments) {
      assignmentCountByStay.set(
        a.hotelStayId,
        (assignmentCountByStay.get(a.hotelStayId) ?? 0) + 1
      );
    }

    stays.sort((a, b) => {
      const aTime = a.checkInDate.epochNanoseconds;
      const bTime = b.checkInDate.epochNanoseconds;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return a.id - b.id;
    });

    const enrichedStays = stays.map((stay) => {
      const hotel = hotelMap.get(stay.hotelId);
      return {
        id: stay.id,
        departureId: stay.departureId,
        hotelId: stay.hotelId,
        destinationId: stay.destinationId,
        checkInDate: stay.checkInDate.toString(),
        checkOutDate: stay.checkOutDate.toString(),
        hotelName: hotel?.name ?? "Unknown Hotel",
        hotelLocation: hotel?.location ?? "Unknown Location",
        hotelPhone: hotel?.phone ?? null,
        roomCount: roomCountByHotel.get(stay.hotelId) ?? 0,
        assignmentCount: assignmentCountByStay.get(stay.id) ?? 0,
      };
    });

    return Response.json(
      { success: true, stays: enrichedStays },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET DEPARTURE HOTEL STAYS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load hotel stays." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!isDatabaseId(departureId)) {
    return badRequest("Invalid departure ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Hotel stay details are required.");
  }

  const hotelId = Number(body.hotelId);
  if (!isDatabaseId(hotelId)) {
    return badRequest("Select a valid hotel.");
  }

  const checkInStr = String(body.checkInDate ?? "").trim();
  const checkOutStr = String(body.checkOutDate ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInStr)) {
    return badRequest("Provide a valid check-in date (YYYY-MM-DD).");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutStr)) {
    return badRequest("Provide a valid check-out date (YYYY-MM-DD).");
  }

  let checkInInstant: Temporal.Instant;
  let checkOutInstant: Temporal.Instant;

  try {
    checkInInstant = Temporal.Instant.from(`${checkInStr}T12:00:00+06:00`);
    checkOutInstant = Temporal.Instant.from(`${checkOutStr}T12:00:00+06:00`);
  } catch {
    return badRequest("Invalid date values.");
  }

  if (checkOutInstant.epochNanoseconds <= checkInInstant.epochNanoseconds) {
    return badRequest("Check-out date must be after check-in date.");
  }

  const destinationId =
    body.destinationId != null && Number.isSafeInteger(Number(body.destinationId))
      ? Number(body.destinationId)
      : null;

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      if (!(await lockDeparture(tx, departureId))) {
        return Response.json({ success: false, error: "Departure not found." }, { status: 404 });
      }
      const [departure, hotel] = await Promise.all([
        tx.orm.public.Departure.where({ id: departureId }).first(),
        tx.orm.public.Hotel.where({ id: hotelId }).first(),
      ]);

      if (!departure) return Response.json({ success: false, error: "Departure not found." }, { status: 404 });
      if (!hotel || !hotel.isActive) return badRequest("Selected hotel is inactive or does not exist.");

      const dates = { checkInDate: checkInInstant, checkOutDate: checkOutInstant };
      if (stayOutsideSchedule(departure, dates)) {
        return Response.json({ success: false, error: "The hotel stay must fall within the departure's travel dates." }, { status: 409 });
      }
      const conflict = await tx.orm.public.HotelStay.where({ departureId, hotelId })
        .where((stay) => stay.checkInDate.lt(checkOutInstant))
        .where((stay) => stay.checkOutDate.gt(checkInInstant))
        .select("id")
        .first();
      if (conflict) {
        return Response.json({ success: false, error: "This hotel already has a stay on this departure during the selected dates." }, { status: 409 });
      }

      const stay = await tx.orm.public.HotelStay.create({ departureId, hotelId, destinationId, ...dates });
      return Response.json({ success: true, stay }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE HOTEL STAY ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to schedule hotel stay." },
      { status: 500 }
    );
  }
}
